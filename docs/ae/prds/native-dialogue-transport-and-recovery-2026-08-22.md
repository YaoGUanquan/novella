---
type: prd
status: implemented
date: 2026-08-22
title: native-dialogue-transport-and-recovery
format: human-readable-prd
---

# PRD: Tauri 原生对话传输与会话恢复

## 问题

WebView 直连远端对话服务会受 CORS 预检限制；Vite 代理只存在于开发服务器，不能随应用打包。网络失败后，助手当前只能显示失败提示，缺少当前请求重试和消息/会话清理操作。

## 目标与验收

- R1/AC1: Tauri 桌面运行时通过 Rust 受控 HTTPS SSE 传输请求对话服务，前端通过 Tauri IPC 接收分片；不依赖浏览器 CORS。
- R2/AC2: 原生传输支持启动、取消、完成、HTTP 错误和传输错误；API key 仅进入请求内存，不进入日志、事件 payload 或错误文案。
- R3/AC3: Web/Vite 模式继续使用受限本地代理；生产构建不包含代理服务能力。
- R4/AC4: 失败的助手消息提供“重试”，复用原请求上下文且不重复插入用户消息。
- R5/AC5: 助手支持删除单条消息和清空当前对话；删除/清空后项目记忆不受影响。
- R6/AC6: `cargo check --workspace`、TypeScript、聚焦 Jest 和前端构建通过；真实密钥桌面端 SSE 由用户手动验收。

## 非目标

- 不把 API key 写入 URL、事件、日志或项目会话持久化。
- 不把 Rust 命令做成任意 URL 代理；仅允许 HTTPS endpoint，并由用户配置提供目标。
- 不在本次实现图像/视频原生传输或联网搜索工具。

## 决策

桌面端优先选择 Rust `reqwest` blocking stream + Tauri 事件，避免 WebView CORS；Web 端保留既有 Vite 代理。恢复操作属于助手 UI 会话层，不修改项目表单和项目记忆。
