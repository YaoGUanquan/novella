//! Native configured-image transport.
//!
//! The WebView never sees the API key in the response. It only receives the
//! upstream JSON payload or a sanitized error string.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use serde::Serialize;
use serde_json::{json, Value};

use crate::services::image::{
    download_https_image, post_configured_image, validate_image_payload, write_image,
    MAX_IMAGE_BYTES,
};

#[derive(Debug, Deserialize)]
pub struct GenerateConfiguredImageRequest {
    pub endpoint: String,
    pub api_key: String,
    pub model: String,
    pub prompt: String,
    pub size: Option<String>,
    pub resolution: Option<String>,
    pub n: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct DownloadImageAssetRequest {
    pub source_url: Option<String>,
    pub bytes: Option<Vec<u8>>,
    pub mime_type: Option<String>,
    pub working_dir: String,
    pub project_id: String,
    pub filename: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DownloadImageAssetResult {
    pub absolute_path: String,
    pub relative_path: String,
    pub mime_type: String,
    pub size: usize,
}

#[derive(Debug, Deserialize)]
pub struct ReadImageAssetRequest {
    pub working_dir: String,
    pub project_id: String,
    pub relative_path: String,
}

#[derive(Debug, Serialize)]
pub struct ReadImageAssetResult {
    pub bytes: Vec<u8>,
    pub mime_type: String,
    pub size: usize,
}

fn valid_project_id(value: &str) -> bool {
    !value.is_empty()
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

fn safe_filename(value: Option<&str>, mime_type: &str) -> String {
    let candidate = value.unwrap_or_default().trim().replace(['\\', '/'], "_");
    let stem = candidate
        .rsplit_once('.')
        .map(|(stem, _)| stem)
        .unwrap_or(candidate.as_str());
    let stem: String = stem
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        .take(80)
        .collect();
    let extension = match mime_type {
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "png",
    };
    let fallback = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "generated".to_string());
    format!(
        "{}.{}",
        if stem.is_empty() { fallback } else { stem },
        extension
    )
}

fn workspace_root_path(value: &str) -> Result<PathBuf, String> {
    if value.trim().is_empty() || value.contains('\0') {
        return Err("图片工作目录无效".to_string());
    }
    let root = PathBuf::from(value);
    if !root.is_absolute() {
        return Err("图片工作目录必须是绝对路径".to_string());
    }
    Ok(root)
}

fn validate_workspace_root(value: &str) -> Result<PathBuf, String> {
    let root = workspace_root_path(value)?;
    fs::create_dir_all(&root).map_err(|_| "无法创建图片工作目录".to_string())?;
    root.canonicalize()
        .map_err(|_| "无法解析图片工作目录".to_string())
}

fn validate_existing_workspace_root(value: &str) -> Result<PathBuf, String> {
    workspace_root_path(value)?
        .canonicalize()
        .map_err(|_| "图片工作目录不存在".to_string())
}

fn validate_asset_target(root: &Path, project_id: &str, filename: &str) -> Result<PathBuf, String> {
    if !valid_project_id(project_id) {
        return Err("无效的项目 ID".to_string());
    }
    if filename.is_empty() || filename.contains(['/', '\\', '\0']) {
        return Err("无效的图片文件名".to_string());
    }
    let asset_dir = root.join(project_id).join("assets").join("images");
    fs::create_dir_all(&asset_dir).map_err(|_| "无法创建项目图片目录".to_string())?;
    let canonical_asset_dir = asset_dir
        .canonicalize()
        .map_err(|_| "无法解析项目图片目录".to_string())?;
    if !canonical_asset_dir.starts_with(root) {
        return Err("项目图片目录超出工作目录".to_string());
    }
    let target = canonical_asset_dir.join(filename);
    if !target.starts_with(&canonical_asset_dir) {
        return Err("图片输出路径超出项目目录".to_string());
    }
    Ok(target)
}

fn asset_filename(relative_path: &str) -> Result<&str, String> {
    let filename = relative_path
        .strip_prefix("assets/images/")
        .ok_or_else(|| "图片引用不在项目素材目录".to_string())?;
    if filename.is_empty() || filename.contains(['/', '\\', '\0']) || matches!(filename, "." | "..")
    {
        return Err("图片引用路径无效".to_string());
    }
    Ok(filename)
}

fn validate_existing_asset(
    root: &Path,
    project_id: &str,
    relative_path: &str,
) -> Result<PathBuf, String> {
    if !valid_project_id(project_id) {
        return Err("无效的项目 ID".to_string());
    }
    let filename = asset_filename(relative_path)?;
    let asset_dir = root.join(project_id).join("assets").join("images");
    let canonical_asset_dir = asset_dir
        .canonicalize()
        .map_err(|_| "项目图片目录不存在".to_string())?;
    if !canonical_asset_dir.starts_with(root) {
        return Err("项目图片目录超出工作目录".to_string());
    }
    let target = canonical_asset_dir.join(filename);
    let canonical_target = target
        .canonicalize()
        .map_err(|_| "项目图片不存在".to_string())?;
    if !canonical_target.starts_with(&canonical_asset_dir) || !canonical_target.is_file() {
        return Err("图片引用超出项目素材目录".to_string());
    }
    Ok(canonical_target)
}

fn validate_request(request: &GenerateConfiguredImageRequest) -> Result<reqwest::Url, String> {
    if request.api_key.trim().is_empty() || request.model.trim().is_empty() {
        return Err("图片服务缺少密钥或模型".to_string());
    }
    if request.prompt.trim().is_empty() {
        return Err("图片生成提示词不能为空".to_string());
    }
    let url = reqwest::Url::parse(&request.endpoint).map_err(|_| "图片服务地址无效".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("桌面端图片服务只允许 HTTPS 地址".to_string());
    }
    Ok(url)
}

#[tauri::command]
pub fn generate_configured_image(request: GenerateConfiguredImageRequest) -> Result<Value, String> {
    let url = validate_request(&request)?;
    let body = if request.model.to_ascii_lowercase().contains("grok-imagine") {
        json!({
            "model": request.model,
            "prompt": request.prompt,
            "n": request.n.unwrap_or(1),
            "response_format": "b64_json",
            "resolution": request.resolution.unwrap_or_else(|| "2k".to_string()),
        })
    } else {
        json!({
            "model": request.model,
            "prompt": request.prompt,
            "size": request.size.unwrap_or_else(|| "1024x1024".to_string()),
            "n": request.n.unwrap_or(1),
            "response_format": "url",
        })
    };
    post_configured_image(url, &request.api_key, &body)
}

/// Download a generated image into the selected project workspace.
/// The frontend only receives sanitized file metadata; provider URLs are not persisted.
#[tauri::command]
pub fn download_image_asset(
    request: DownloadImageAssetRequest,
) -> Result<DownloadImageAssetResult, String> {
    let root = validate_workspace_root(&request.working_dir)?;
    let (bytes, mime_type) = if let Some(bytes) = request.bytes {
        validate_image_payload(bytes, request.mime_type.as_deref().unwrap_or("image/png"))?
    } else {
        let source = request
            .source_url
            .as_deref()
            .ok_or_else(|| "缺少图片下载源".to_string())?;
        download_https_image(source)?
    };
    let filename = safe_filename(request.filename.as_deref(), &mime_type);
    let target = validate_asset_target(&root, &request.project_id, &filename)?;
    write_image(&target, &bytes)?;
    Ok(DownloadImageAssetResult {
        absolute_path: target.to_string_lossy().to_string(),
        relative_path: format!("assets/images/{}", filename),
        mime_type,
        size: bytes.len(),
    })
}

/// Read a persisted project image through the same validated workspace boundary.
/// Returning bytes over IPC avoids granting the WebView a broad asset-protocol scope.
#[tauri::command]
pub fn read_image_asset(request: ReadImageAssetRequest) -> Result<ReadImageAssetResult, String> {
    let root = validate_existing_workspace_root(&request.working_dir)?;
    let target = validate_existing_asset(&root, &request.project_id, &request.relative_path)?;
    let metadata = target
        .metadata()
        .map_err(|_| "无法读取项目图片信息".to_string())?;
    if metadata.len() > MAX_IMAGE_BYTES as u64 {
        return Err("图片超过 20 MB 限制".to_string());
    }
    let bytes = fs::read(&target).map_err(|_| "读取项目图片失败".to_string())?;
    let (bytes, mime_type) = validate_image_payload(bytes, "application/octet-stream")?;
    let size = bytes.len();
    Ok(ReadImageAssetResult {
        bytes,
        mime_type,
        size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::image::MAX_IMAGE_BYTES;

    #[test]
    fn rejects_unsafe_project_ids_and_filenames() {
        assert!(!valid_project_id("../project"));
        assert!(validate_asset_target(Path::new("C:/workspace"), "ok", "../x.png").is_err());
        assert!(asset_filename("../images/x.png").is_err());
        assert!(asset_filename("assets/images/../x.png").is_err());
        assert_eq!(asset_filename("assets/images/x.png").unwrap(), "x.png");
    }

    #[test]
    fn rejects_non_image_or_oversized_payloads() {
        assert!(validate_image_payload(vec![1, 2], "text/plain").is_err());
        assert!(validate_image_payload(vec![0; MAX_IMAGE_BYTES + 1], "image/png").is_err());
    }

    #[test]
    fn normalizes_extension_from_mime() {
        assert_eq!(safe_filename(Some("hero.jpg"), "image/png"), "hero.png");
    }
}
