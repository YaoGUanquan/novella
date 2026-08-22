//! Native configured-dialogue transport.
//!
//! The WebView never receives the API key back from this module. It only gets
//! stream text, completion, and sanitized error events identified by stream id.

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex};
use std::time::Duration;

use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

const CHUNK_EVENT: &str = "novella://dialogue/chunk";
const COMPLETE_EVENT: &str = "novella://dialogue/complete";
const ERROR_EVENT: &str = "novella://dialogue/error";

lazy_static! {
    static ref ACTIVE_STREAMS: Mutex<HashMap<String, Arc<AtomicBool>>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Deserialize)]
pub struct StartConfiguredDialogueRequest {
    pub stream_id: String,
    pub protocol: String,
    pub endpoint: String,
    pub api_key: String,
    pub model: String,
    pub messages: Value,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
struct DialogueChunkEvent {
    stream_id: String,
    content: String,
    kind: String,
}

#[derive(Debug, Serialize, Clone)]
struct DialogueCompleteEvent {
    stream_id: String,
    cancelled: bool,
}

#[derive(Debug, Serialize, Clone)]
struct DialogueErrorEvent {
    stream_id: String,
    kind: String,
    status: Option<u16>,
    message: String,
}

fn validate_request(request: &StartConfiguredDialogueRequest) -> Result<(), String> {
    if request.stream_id.is_empty()
        || request.stream_id.len() > 128
        || !request.stream_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("无效的对话流 ID".to_string());
    }
    if request.protocol != "openai" && request.protocol != "anthropic" {
        return Err("不支持的对话协议".to_string());
    }
    if request.api_key.trim().is_empty() || request.model.trim().is_empty() {
        return Err("对话服务缺少密钥或模型".to_string());
    }
    let url = reqwest::Url::parse(&request.endpoint).map_err(|_| "对话服务地址无效".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("桌面端对话服务只允许 HTTPS 地址".to_string());
    }
    if !request.messages.is_array() {
        return Err("对话消息格式无效".to_string());
    }
    Ok(())
}

fn emit_error(app: &AppHandle, stream_id: &str, kind: &str, status: Option<u16>, message: &str) {
    let _ = app.emit(ERROR_EVENT, DialogueErrorEvent {
        stream_id: stream_id.to_string(),
        kind: kind.to_string(),
        status,
        message: message.to_string(),
    });
}

fn emit_complete(app: &AppHandle, stream_id: &str, cancelled: bool) {
    let _ = app.emit(COMPLETE_EVENT, DialogueCompleteEvent {
        stream_id: stream_id.to_string(),
        cancelled,
    });
}

fn emit_chunk(app: &AppHandle, stream_id: &str, content: String, kind: &str) {
    if content.is_empty() {
        return;
    }
    let _ = app.emit(CHUNK_EVENT, DialogueChunkEvent {
        stream_id: stream_id.to_string(),
        content,
        kind: kind.to_string(),
    });
}

fn anthropic_content(value: &Value) -> Value {
    let Some(parts) = value.as_array() else {
        return value.clone();
    };
    Value::Array(parts.iter().map(|part| {
        if part.get("type").and_then(Value::as_str) == Some("text") {
            return part.clone();
        }
        let Some(url) = part.pointer("/image_url/url").and_then(Value::as_str) else {
            return json!({"type": "text", "text": "[图片附件无法识别]"});
        };
        let Some((header, data)) = url.split_once(",") else {
            return json!({"type": "text", "text": "[图片附件无法识别]"});
        };
        let Some(media_type) = header.strip_prefix("data:").and_then(|value| value.strip_suffix(";base64")) else {
            return json!({"type": "text", "text": "[图片附件无法识别]"});
        };
        json!({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": data}
        })
    }).collect())
}

fn build_request_body(request: &StartConfiguredDialogueRequest) -> Value {
    if request.protocol == "openai" {
        return json!({
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature.unwrap_or(0.7),
            "max_tokens": request.max_tokens.unwrap_or(2000),
            "stream": true
        });
    }

    let mut system = Vec::new();
    let mut messages = Vec::new();
    for message in request.messages.as_array().into_iter().flatten() {
        if message.get("role").and_then(Value::as_str) == Some("system") {
            if let Some(content) = message.get("content").and_then(Value::as_str) {
                system.push(content.to_string());
            }
        } else {
            messages.push(json!({
                "role": message.get("role").and_then(Value::as_str).unwrap_or("user"),
                "content": anthropic_content(message.get("content").unwrap_or(&Value::Null))
            }));
        }
    }
    let mut body = json!({
        "model": request.model,
        "messages": messages,
        "max_tokens": request.max_tokens.unwrap_or(2000),
        "temperature": request.temperature.unwrap_or(0.7),
        "stream": true
    });
    if !system.is_empty() {
        body["system"] = Value::String(system.join("\n\n"));
    }
    body
}

fn parse_sse_data(app: &AppHandle, request: &StartConfiguredDialogueRequest, data: &str) -> bool {
    if data == "[DONE]" {
        return true;
    }
    let Ok(value) = serde_json::from_str::<Value>(data) else {
        return false;
    };
    if request.protocol == "openai" {
        if let Some(thinking) = value.pointer("/choices/0/delta/reasoning_content")
            .and_then(Value::as_str)
            .or_else(|| value.pointer("/choices/0/delta/reasoning").and_then(Value::as_str))
        {
            emit_chunk(app, &request.stream_id, thinking.to_string(), "thinking");
        }
        if let Some(content) = value.pointer("/choices/0/delta/content").and_then(Value::as_str) {
            emit_chunk(app, &request.stream_id, content.to_string(), "text");
        }
    } else {
        if value.get("type").and_then(Value::as_str) == Some("message_stop") {
            return true;
        }
        if value.get("type").and_then(Value::as_str) == Some("content_block_delta") {
            let delta_type = value.pointer("/delta/type").and_then(Value::as_str);
            if delta_type == Some("thinking_delta") {
                if let Some(thinking) = value.pointer("/delta/thinking")
                    .and_then(Value::as_str)
                    .or_else(|| value.pointer("/delta/text").and_then(Value::as_str))
                {
                    emit_chunk(app, &request.stream_id, thinking.to_string(), "thinking");
                }
            } else if let Some(content) = value.pointer("/delta/text").and_then(Value::as_str) {
                emit_chunk(app, &request.stream_id, content.to_string(), "text");
            }
        }
    }
    false
}

fn run_stream(app: AppHandle, request: StartConfiguredDialogueRequest, cancelled: Arc<AtomicBool>) {
    let result = (|| -> Result<(), (String, Option<u16>, String)> {
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|_| ("transport".to_string(), None, "无法初始化对话网络连接".to_string()))?;
        let mut builder = client.post(&request.endpoint)
            .header("Content-Type", "application/json")
            .json(&build_request_body(&request));
        builder = if request.protocol == "openai" {
            builder.header("Authorization", format!("Bearer {}", request.api_key))
        } else {
            builder.header("x-api-key", &request.api_key)
                .header("anthropic-version", "2023-06-01")
        };
        let response = builder.send().map_err(|_| ("transport".to_string(), None, "无法连接到对话服务".to_string()))?;
        let status = response.status().as_u16();
        if !response.status().is_success() {
            return Err(("http".to_string(), Some(status), "对话服务请求失败".to_string()));
        }
        let mut reader = BufReader::new(response);
        let mut line = String::new();
        loop {
            if cancelled.load(Ordering::Relaxed) {
                return Ok(());
            }
            line.clear();
            if reader.read_line(&mut line).map_err(|_| ("transport".to_string(), None, "读取对话响应失败".to_string()))? == 0 {
                break;
            }
            if let Some(data) = line.trim().strip_prefix("data:") {
                if parse_sse_data(&app, &request, data.trim()) {
                    break;
                }
            }
        }
        Ok(())
    })();

    match result {
        Ok(()) => emit_complete(&app, &request.stream_id, cancelled.load(Ordering::Relaxed)),
        Err((kind, status, message)) => emit_error(&app, &request.stream_id, &kind, status, &message),
    }
    if let Ok(mut streams) = ACTIVE_STREAMS.lock() {
        streams.remove(&request.stream_id);
    }
}

#[tauri::command]
pub fn start_configured_dialogue(app: AppHandle, request: StartConfiguredDialogueRequest) -> Result<(), String> {
    validate_request(&request)?;
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut streams = ACTIVE_STREAMS.lock().map_err(|_| "对话流状态不可用".to_string())?;
        if streams.contains_key(&request.stream_id) {
            return Err("对话流 ID 已存在".to_string());
        }
        streams.insert(request.stream_id.clone(), cancelled.clone());
    }
    let stream_id = request.stream_id.clone();
    let spawn_result = std::thread::Builder::new()
        .name("novella-dialogue-stream".to_string())
        .spawn(move || run_stream(app, request, cancelled))
        .map_err(|_| "无法启动对话流".to_string());
    if let Err(error) = spawn_result {
        if let Ok(mut streams) = ACTIVE_STREAMS.lock() {
            streams.remove(&stream_id);
        }
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
pub fn cancel_configured_dialogue(stream_id: String) -> Result<(), String> {
    let streams = ACTIVE_STREAMS.lock().map_err(|_| "对话流状态不可用".to_string())?;
    if let Some(cancelled) = streams.get(&stream_id) {
        cancelled.store(true, Ordering::Relaxed);
    }
    Ok(())
}
