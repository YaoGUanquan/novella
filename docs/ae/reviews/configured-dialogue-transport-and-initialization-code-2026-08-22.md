---
type: code-review
status: approve
date: 2026-08-22
scope: configured-dialogue-transport-and-initialization
---

# 代码评审：可配置对话服务连通性与助手初始化

## Verdict

`APPROVE`。本次范围内没有阻断交付的正确性、密钥泄露或回归问题。

## Reviewer Lane

- `ConfiguredDialogueError` 仅保留 HTTP 状态和 URL 主机名；不保留 API Key、路径或请求体。
- OpenAI 与 Anthropic 策略产生的标准 `API 错误: <status>` 会被统一转换；`Failed to fetch` 等无响应错误会归类为 transport。
- 自动初始化调用沿用 `buildRequestMessages`，因此包含项目上下文和已确认项目记忆，不包含连接设置；空会话和新建会话通过会话版本去重。
- 失败时将空助手消息改为“本次请求未完成”，避免 UI 长期显示“AI 正在输入”。
- `connect-src https:` 与设置页的自定义 HTTPS endpoint 一致；它不声称绕过普通浏览器的服务端 CORS。

## Validation Evidence

- `pnpm exec jest --runInBand src/__tests__/services/configured-dialogue-stream.test.ts src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`：通过，2 suites / 8 tests。
- `pnpm run build:check`：通过。
- `node -e "JSON.parse(require('node:fs').readFileSync('src-tauri/tauri.conf.json', 'utf8'))"`：通过。
- `git diff --check`：通过。

## Residual Risks

- 普通浏览器模式仍要求目标服务对 `http://127.0.0.1:1420` 允许 CORS；这是服务提供方的 HTTP 响应策略，不能由前端 CSP 修复。
- 未使用用户保存的密钥发起真实请求，因此实际 endpoint、模型和账户权限仍需用户在本地 UI 中验证。
- `AICreativeAssistantSheet` 存在一条既有的 `react-hooks/set-state-in-effect` lint warning，位于项目记忆加载 effect；不由本任务引入，未在本次扩大处理。
