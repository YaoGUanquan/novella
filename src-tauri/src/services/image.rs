//! Generated-image HTTP and file persistence services.

use std::fs;
use std::io::Read;
use std::net::{IpAddr, SocketAddr, ToSocketAddrs};
use std::path::Path;
use std::time::Duration;

use serde_json::{json, Value};

pub const MAX_IMAGE_BYTES: usize = 20 * 1024 * 1024;
const MAX_IMAGE_REDIRECTS: usize = 5;
const IMAGE_DOWNLOAD_USER_AGENT: &str = "Novella/0.0.1";

fn detected_image_mime(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some("image/png")
    } else if bytes.starts_with(b"\xff\xd8\xff") {
        Some("image/jpeg")
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some("image/gif")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    }
}

pub fn validate_image_payload(
    bytes: Vec<u8>,
    declared_mime: &str,
) -> Result<(Vec<u8>, String), String> {
    if bytes.is_empty() || bytes.len() > MAX_IMAGE_BYTES {
        return Err("图片为空或超过 20 MB 限制".to_string());
    }
    let normalized = declared_mime
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    let detected = detected_image_mime(&bytes)
        .ok_or_else(|| "图片服务返回的文件内容不是受支持的图片".to_string())?;
    if normalized.starts_with("image/") && normalized != detected {
        return Err("图片响应类型与文件内容不一致".to_string());
    }
    Ok((bytes, detected.to_string()))
}

fn is_blocked_address(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(value) => {
            value.is_private()
                || value.is_loopback()
                || value.is_link_local()
                || value.is_broadcast()
                || value.is_unspecified()
        }
        IpAddr::V6(value) => {
            value.is_loopback()
                || value.is_unspecified()
                || (value.segments()[0] & 0xfe00) == 0xfc00
                || (value.segments()[0] & 0xffc0) == 0xfe80
        }
    }
}

fn validate_download_url(value: &str) -> Result<(reqwest::Url, String, Vec<SocketAddr>), String> {
    let url = reqwest::Url::parse(value).map_err(|_| "图片下载地址无效".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("图片下载只允许 HTTPS 地址".to_string());
    }
    let host = url.host_str().unwrap_or_default().to_string();
    if host.eq_ignore_ascii_case("localhost") {
        return Err("图片下载地址不能指向本机".to_string());
    }
    let port = url.port_or_known_default().unwrap_or(443);
    let addresses = (host.as_str(), port)
        .to_socket_addrs()
        .map_err(|_| "无法解析图片下载地址".to_string())?
        .collect::<Vec<_>>();
    if addresses.is_empty()
        || addresses
            .iter()
            .any(|address| is_blocked_address(address.ip()))
    {
        return Err("图片下载地址不能指向本地网络".to_string());
    }
    Ok((url, host, addresses))
}

pub fn post_configured_image(
    url: reqwest::Url,
    api_key: &str,
    body: &Value,
) -> Result<Value, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|_| "无法初始化图片网络连接".to_string())?;
    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json, text/event-stream")
        .header("Content-Type", "application/json")
        .json(body)
        .send()
        .map_err(|_| {
            "连不上图片生成服务。请确认设置里的地址是 HTTPS，并且本机网络可访问。".to_string()
        })?;
    let status = response.status();
    let text = response
        .text()
        .map_err(|_| "读取图片服务响应失败".to_string())?;
    if !status.is_success() {
        return Err(format!("图片生成请求失败 (HTTP {})", status.as_u16()));
    }
    parse_configured_image_response(&text)
}

fn parse_configured_image_response(text: &str) -> Result<Value, String> {
    if let Ok(value) = serde_json::from_str(text) {
        return Ok(value);
    }
    let images = text
        .lines()
        .filter_map(|line| line.find('{').map(|start| &line[start..]))
        .filter_map(|candidate| serde_json::from_str::<Value>(candidate).ok())
        .filter_map(|event| {
            if event.get("type").and_then(Value::as_str) != Some("image") {
                return None;
            }
            let url = event.get("image_url").and_then(Value::as_str)?;
            Some(json!({
                "url": url,
                "mime_type": event.get("mime_type").and_then(Value::as_str),
            }))
        })
        .collect::<Vec<_>>();
    if images.is_empty() {
        return Err("图片服务返回了无法解析的响应".to_string());
    }
    Ok(json!({ "data": images }))
}

pub fn download_https_image(source: &str) -> Result<(Vec<u8>, String), String> {
    let mut current = source.to_string();
    let mut redirects = 0;
    let response = loop {
        let (url, host, addresses) = validate_download_url(&current)?;
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(120))
            .redirect(reqwest::redirect::Policy::none())
            .user_agent(IMAGE_DOWNLOAD_USER_AGENT)
            .resolve_to_addrs(&host, &addresses)
            .build()
            .map_err(|_| "无法初始化图片下载连接".to_string())?;
        let response = client
            .get(url.clone())
            .send()
            .map_err(|_| "无法下载生成的图片".to_string())?;
        if !response.status().is_redirection() {
            break response;
        }
        if redirects >= MAX_IMAGE_REDIRECTS {
            return Err("图片下载重定向次数过多".to_string());
        }
        let location = response
            .headers()
            .get(reqwest::header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| "图片下载重定向缺少目标地址".to_string())?;
        current = url
            .join(location)
            .map_err(|_| "图片下载重定向地址无效".to_string())?
            .to_string();
        redirects += 1;
    };
    if !response.status().is_success() {
        return Err(format!(
            "图片下载失败 (HTTP {})",
            response.status().as_u16()
        ));
    }
    if response
        .content_length()
        .is_some_and(|size| size > MAX_IMAGE_BYTES as u64)
    {
        return Err("图片超过 20 MB 限制".to_string());
    }
    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();
    let mut bytes = Vec::new();
    response
        .take(MAX_IMAGE_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "读取生成图片失败".to_string())?;
    validate_image_payload(bytes, &mime)
}

pub fn write_image(target: &Path, bytes: &[u8]) -> Result<(), String> {
    if target
        .symlink_metadata()
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
    {
        return Err("生成图片目标不能是符号链接".to_string());
    }
    fs::write(target, bytes).map_err(|_| "保存生成图片失败".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_supported_image_signatures() {
        assert_eq!(
            detected_image_mime(b"\x89PNG\r\n\x1a\nrest"),
            Some("image/png")
        );
        assert_eq!(detected_image_mime(b"\xff\xd8\xffrest"), Some("image/jpeg"));
    }

    #[test]
    fn rejects_mime_spoofing_and_local_urls() {
        assert!(validate_image_payload(b"not-an-image".to_vec(), "image/png").is_err());
        assert!(validate_download_url("https://127.0.0.1/image.png").is_err());
        assert!(validate_download_url("http://cdn.example/image.png").is_err());
    }

    #[test]
    fn classifies_private_and_public_addresses() {
        assert!(is_blocked_address("127.0.0.1".parse().unwrap()));
        assert!(is_blocked_address("10.0.0.1".parse().unwrap()));
        assert!(!is_blocked_address("8.8.8.8".parse().unwrap()));
    }

    #[test]
    fn parses_json_and_sse_image_responses() {
        let json_response = r#"{"data":[{"b64_json":"abc"}]}"#;
        assert_eq!(
            parse_configured_image_response(json_response).unwrap()["data"][0]["b64_json"],
            "abc"
        );

        let sse_response = concat!(
            "event: message\n",
            "data: {\"type\":\"status\",\"text\":\"working\"}\n\n",
            "event: message\n",
            "data: {\"type\":\"image\",\"image_url\":\"data:image/jpeg;base64,/9j/\",\"mime_type\":\"image/jpeg\"}\n\n"
        );
        assert_eq!(
            parse_configured_image_response(sse_response).unwrap()["data"][0]["url"],
            "data:image/jpeg;base64,/9j/"
        );
    }
}
