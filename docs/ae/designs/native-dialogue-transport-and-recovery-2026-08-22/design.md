---
type: design
status: drafted
date: 2026-08-22
title: native-dialogue-transport-and-recovery
origin: docs/ae/prds/native-dialogue-transport-and-recovery-2026-08-22.md
originFingerprint: 2026-08-22-native-dialogue-transport-recovery
format: human-readable-design
sharded: false
---

# Design: Tauri 原生对话传输与会话恢复

## AI Parse Contract

- canonicalKind: design
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Overview

- Goal: 桌面端绕过 CORS 使用受控原生 SSE，并提供可恢复的助手会话操作。
- Required dimensions: overview, architecture, api, ui-ux, test-cases, security, observability, non-functional。
- Explicitly omitted: database（不新增数据库字段；会话仍由现有项目 localStorage 持久化）、deployment（打包沿用 Tauri build，原生命令随包编译）。

## Existing Project Evidence

- mode: inspected
- stack: `src-tauri/Cargo.toml`、`src-tauri/src/lib.rs`、`src/infrastructure/tauri-bridge/commands.ts`；Tauri v2 命令和事件桥接已存在，当前没有 AI HTTP 命令。
- UI: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`；已有 AbortController、项目记忆、会话持久化和 SSE Provider。
- confidence: verified for inspected paths; real vendor SSE schema remains user-service dependent.

## Decisions

### ADR-001 - 桌面端使用 Rust SSE

- Decision: Rust command 校验 HTTPS endpoint 后发起流式请求，按 stream id 通过 Tauri events 发出分片。
- Drivers: 绕过 CORS、复用桌面安全边界、保留取消能力。
- Alternatives: 远端放开 CORS（不能控制）、Vite 代理（不随包）、一次性响应（失去 SSE 体验）。
- Consequences: 增加 Rust 依赖和 IPC 契约，需覆盖取消和事件清理。

### ADR-002 - 恢复操作不改变项目记忆

- Decision: 重试复用失败请求；删除/清空只改变当前会话消息，项目记忆仍由显式确认保存。
- Drivers: 防止恢复操作意外改变表单或长期记忆。

## API

### EP-001 - `start_configured_dialogue`

- Input: stream id, protocol, HTTPS endpoint, model, messages, temperature, max tokens, API key.
- Output: immediate command acknowledgement; stream data arrives via events.

### EP-002 - `cancel_configured_dialogue`

- Input: stream id.
- Output: cancellation acknowledgement; active stream emits completion state and releases resources.

### EP-003 - dialogue events

- `novella://dialogue/chunk`: stream id + text chunk.
- `novella://dialogue/complete`: stream id + cancelled flag.
- `novella://dialogue/error`: stream id + kind + status + sanitized message.

## Architecture

- `src-tauri/src/commands/dialogue.rs`: validation, request body conversion, SSE parsing, cancellation registry, event emission.
- `src/infrastructure/tauri-bridge/commands.ts`: event-to-AsyncGenerator adapter and invoke wrappers.
- `src/core/services/ai/text/ai-service.ts`: choose native transport only when Tauri runtime is present; Web uses Provider/Vite path.
- `AICreativeAssistantSheet`: retry map keyed by assistant message id; delete single message and clear conversation controls.

## UI/UX

### ST-001 - Native streaming

显示分片，完成后结束输入状态；HTTP/transport 错误显示脱敏中文说明。

### ST-002 - Failed assistant message

失败消息保留在时间线，显示“重试”图标按钮；重试期间禁用其他发送操作。

### ST-003 - Conversation cleanup

标题栏提供清空对话，消息提供删除；操作不删除项目记忆。

## Security

- 只接受 `https://` endpoint 和非空 host；stream id 使用受限字符集。
- API key 不写日志、不放事件 payload、不进入错误文本；传输错误只返回 HTTP status/host 级别信息。
- cancellation registry 在完成、错误、取消三条路径清理。

## Test Cases

### TC-001 - Rust endpoint validation

- Method: equivalence-class + error-guessing
- Expected: HTTP 或无 host 被拒绝，命令不启动线程。

### TC-002 - Event stream parsing

- Method: state-transition
- Expected: OpenAI/Anthropic data event 转为 chunk，`[DONE]` 或 message_stop 产生 complete。

### TC-003 - UI retry/delete

- Method: state-transition
- Expected: retry 不追加重复 user message；delete/clear 更新会话并保留项目 memory。

## Mapping

| Contract       | UI         | Verification |
| -------------- | ---------- | ------------ |
| EP-001/002/003 | ST-001/002 | TC-002       |
| ADR-002        | ST-002/003 | TC-003       |
| Security rules | ST-001     | TC-001       |

## Non-Functional

- Native stream timeout: 300 seconds per request; cancellation is best-effort and must release the reader/thread.
- Build: native path must compile in Tauri release; browser bundle keeps proxy disabled in build command.
