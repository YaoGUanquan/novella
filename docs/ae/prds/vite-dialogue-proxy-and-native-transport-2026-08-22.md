---
type: prd
status: implemented
date: 2026-08-22
title: vite-dialogue-proxy-and-native-transport
format: human-readable-prd
---

# PRD: Vite 对话代理与桌面原生传输

## 问题

已观察到浏览器开发模式从 `http://127.0.0.1:1420` 直连已配置的对话服务时，CORS 预检被远端拒绝，实际 SSE `POST` 未发出。当前仓库没有 Vite 代理，也没有 Tauri AI HTTP 命令。

## 目标

- R1: 开发模式可通过显式环境变量开启本地 Vite 反向代理，并让 OpenAI 与 Anthropic 对话请求复用该代理。
- R2: 代理只监听既有 `127.0.0.1` 开发服务器，且只转发至启动时指定的 HTTPS 上游；不得成为可由页面参数控制的开放代理。
- R3: 未开启代理时，保持当前直连地址和请求行为不变。
- R4: 为用户提供可复制的 PowerShell 启动命令，不把 API Key 写入命令、环境变量或文档。
- R5: 记录生产版根治方向：打包的 Tauri 应用应由 Rust 原生 HTTP/SSE 传输层请求远端服务，前端通过 IPC 接收流事件，不依赖浏览器 CORS 或 Vite。

## 验收标准

- AC1: 设置 `NOVELLA_DIALOGUE_PROXY_TARGET` 和 `VITE_NOVELLA_DIALOGUE_PROXY=true` 后，开发模式中的对话请求 URL 为同源代理路径，代理去除固定前缀后转发到指定 HTTPS 上游。
- AC2: 未设置两个变量之一时，请求仍使用用户设置中的原始 endpoint。
- AC3: OpenAI 与 Anthropic 两种协议均通过同一 endpoint 解析函数生效。
- AC4: 代理目标不是合法 HTTPS URL 时，Vite 不启动该代理路由。
- AC5: 聚焦单测覆盖开关、路径保留和关闭时的回归；Vite build 与配置加载通过。

## 非目标

- 本任务不实现 Rust 原生 SSE transport、密钥迁移或发布版 IPC 事件协议。
- 本任务不修改远端服务的 CORS 配置，也不使用 `no-cors`。
- 本任务不代理图像或视频服务。

## 取舍

- 直连要求远端正确配置 CORS，不能解决当前开发调试阻断。
- 任意 URL 代理会把本地开发服务器变成开放代理，不采用。
- Vite 代理可立即解决开发模式，但不参与打包，因此生产根治必须另行实现 Tauri 原生 transport。

## 验证边界

- 可证明：本地配置、同源 URL 解析和 Vite 代理配置。
- 未验证：使用真实用户密钥的远端 SSE 成功响应；由用户在本地手动确认。
