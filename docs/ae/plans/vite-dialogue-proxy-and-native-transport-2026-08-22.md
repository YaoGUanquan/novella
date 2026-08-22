---
type: plan
status: implemented
date: 2026-08-22
title: vite-dialogue-proxy-and-native-transport
origin: docs/ae/prds/vite-dialogue-proxy-and-native-transport-2026-08-22.md
originFingerprint: 2026-08-22-vite-dialogue-proxy-native-transport
depth: standard
format: human-readable-plan
sharded: false
---

# 实施计划：Vite 对话代理与桌面原生传输

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## 决策

开发代理使用 Vite 内建 `server.proxy`，只接受启动进程的 `NOVELLA_DIALOGUE_PROXY_TARGET`，客户端只传递已配置 endpoint 的路径与查询参数。生产版原生 transport 作为后续独立工作单元，不在本次混入。

## 预演失败

- 代理错误配置到 HTTP 或空地址：配置不注册该路由，客户端保持直连。
- 客户端可指定任意 host：解析仅保留 endpoint 的 pathname/search，目标 host 固定在 Vite 进程环境变量。
- 将开发代理误当成发布方案：记忆库和交付说明明确 Vite 不会打包，生产必须采用 Rust transport。

## 实施单元

### U1: 添加受限的开发代理配置

- Requirements: R1, R2, R4, AC1, AC4
- Depends on: none
- Owned files: `vite.config.ts`, `src/env.d.ts`
- Forbidden files: `src-tauri/**`, `.env*`
- Work: 读取环境变量，验证为 HTTPS origin，注册固定代理前缀并保留请求路径；将代理开关作为构建期常量暴露给前端。
- Validation: `pnpm exec vite --host 127.0.0.1 --port 1420 --strictPort` 启动检查。
- Rollback: 删除 proxy 配置与构建期常量，直连行为恢复。

### U2: 将对话 endpoint 统一映射到可选代理

- Requirements: R1, R3, AC2, AC3
- Depends on: U1
- Owned files: `src/core/config/ai-connection-settings.ts`, `src/core/ai/providers/openai-strategy.ts`, `src/core/ai/providers/openai-compatible-strategy.ts`, `src/core/ai/providers/anthropic-strategy.ts`, `src/__tests__/services/configured-dialogue-stream.test.ts`
- Forbidden files: 设置页、持久化结构、密钥存储
- Work: 增加纯 endpoint 映射函数；三处 Provider 保持原请求体与认证头，仅替换请求 URL；测试开关和关闭行为。
- Validation: 聚焦 Jest、`pnpm check`、`pnpm build`。
- Rollback: Provider 恢复调用原解析函数。

### U3: 记录事实与发布边界

- Requirements: R5
- Depends on: U1, U2
- Owned files: `docs/08-ai-memory/04-known-pitfalls.md`, `docs/08-ai-memory/05-decision-log.md`
- Forbidden files: 密钥、完整请求头、真实请求体
- Work: 记录 CORS 证据、开发命令、Vite 适用范围与 Tauri 原生 transport 的后续决策。
- Validation: `git diff --check` 与文档人工复核。
- Rollback: 删除本次新增条目。

## 生产后续方案（不执行）

Rust `reqwest` 客户端提交已验证的 HTTPS 对话请求；Tauri command 生成 request id，并通过事件流发送文本分片、完成和脱敏错误。前端 transport 根据 Tauri runtime 选择 IPC 事件流，Web 开发模式才允许 Vite 代理。须另建 PRD，覆盖取消、超时、重试、SSRF 边界、上传图片、事件清理和真实服务契约测试。
