---
type: plan
status: completed
date: 2026-08-22
title: configured-dialogue-transport-and-initialization
origin: docs/ae/prds/configured-dialogue-transport-and-initialization-2026-08-22.md
originFingerprint: 2026-08-22-configured-dialogue-transport-and-initialization
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 可配置对话服务连通性与助手初始化

## Source

`docs/ae/prds/configured-dialogue-transport-and-initialization-2026-08-22.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

- 失败分类和用户提示：`src/core/ai/providers/*`、`src/features/creative-assistant/*`。
- 桌面端 HTTPS 自定义服务访问：`src-tauri/tauri.conf.json`。
- 会话初始化与回归测试：`src/features/creative-assistant/*`、`src/__tests__/features/creative-assistant/*`。

## Readiness

- Goal: 让已保存的自定义对话连接可被诊断，并在首次和新会话时自动带着项目上下文开始对话。
- Acceptance criteria: R1-R5 / AC1-AC5。
- Non-goals: 不读取密钥、不自动消耗用户模型额度探测连接、不提供浏览器 CORS 绕过。
- Affected areas: 设置持久化后的对话请求、OpenAI/Anthropic SSE 策略、助手侧边栏、Tauri CSP。
- Validation surface: Jest、`pnpm run build:check`、用户本地的已认证浏览器验证。
- Open questions: 自定义服务是否允许浏览器来源跨域，由服务供应商决定，本任务不能从前端绕过。

## Validation Evidence

| Acceptance criterion | Applicable tier                                  | Expected signal and bounded claim      | Preconditions / owner | Status     | Recovery or rollback signal     |
| -------------------- | ------------------------------------------------ | -------------------------------------- | --------------------- | ---------- | ------------------------------- |
| AC1, AC2             | Focused automated test                           | 错误分类不泄露密钥且展示可操作信息     | Jest                  | passed     | 回退本任务改动                  |
| AC3-AC5              | Focused automated test                           | 首次及新会话各请求一次，携带项目上下文 | Jest                  | passed     | 回退助手生命周期改动            |
| AC1-AC5              | Integration or build                             | TypeScript 与 Vite 打包成功            | Node/pnpm             | passed     | 修正编译错误                    |
| AC1-AC5              | Authenticated service smoke / Browser acceptance | 用户实际服务返回首轮回复               | 用户本地的已有密钥    | unverified | 检查服务 URL、协议和供应商 CORS |

## Contract Value Classification

- Canonical persisted value: `secure_ai_service_dialogue` 中保存的地址、模型、密钥及启用状态。
- Derived representation: 请求 endpoint、SSE 流与 UI 错误文本。
- Caller-controlled input: 设置页面的地址、模型、密钥以及助手消息与附件。
- Trust boundary: 远程模型服务；日志和错误文本不得输出 API Key 或完整请求体。

## Alternatives Considered

- Recommended: 保留浏览器 `fetch`，扩展 CSP、分类原生 `fetch` 错误、自动初始化会话。
- Alternative: 在前端加入任意 URL 的 Vite 代理。拒绝，因为仅开发环境有效且会引入不受控 SSRF 代理。
- Alternative: 增加 Tauri native HTTP/SSE 转发。暂不采用，因为需要新增 Rust/前端依赖与桌面、浏览器双运输层；在服务 CORS 不允许时再作为独立需求评估。

## Decisions

### ADR-1 - 不把连接配置发送给模型

- Decision: 初始化只复用已有 `projectContext` 与目标指令。
- Drivers: 用户需要模型理解项目，但连接密钥属于本地私密配置。
- Alternatives: 将所有设置序列化到 system prompt。
- Why chosen: 满足理解上下文，同时避免密钥泄露与无关上下文污染。
- Consequences: 自动首轮回复会产生一次用户模型调用。

### ADR-2 - 浏览器 CORS 保持显式边界

- Decision: 清楚提示浏览器 CORS 限制，但不在本次通过开发代理绕过。
- Drivers: 运行时安全与发布一致性。
- Alternatives: 任意 URL 本地代理。
- Why chosen: 代理会扩大本地网络访问面且不能修复桌面发布包。
- Consequences: 不支持 CORS 的供应商需要配置自身跨域，或后续采用专门的原生运输层。

## Risks

- 首次打开会消耗一次模型请求额度。
- 普通浏览器模式中供应商没有 CORS 头时仍不能请求；这是服务端约束而非密钥错误。
- CSP 使用 `https:` 扩展了可连接范围，必须保持请求地址仅可由本机用户设置且不输出密钥。

## Pre-Mortem

- 服务 URL 实际是非 SSE 端点：错误分类会显示 HTTP 状态或无响应，而不是错误地声称密钥无效。
- 自动初始化与用户点击发送竞争：生成期间禁用已有操作，且关闭时中止请求。
- 已存在历史消息导致重复初始化：只对空会话初始化，新建对话清空后触发一次。

## Global Constraints

- 不读取、打印、测试或提交用户 API Key。
- 保留脏工作区的无关修改。
- 只放行 HTTPS 自定义 endpoint；HTTP 仅维持现有开发用途。

## Implementation Units

### U1 - 对话传输失败分类与 CSP

- Goal: 将 HTTP 响应与无响应传输失败区分，并允许桌面 HTTPS 自定义 endpoint。
- Requirements covered: R1, R2。
- Acceptance criteria covered: AC1, AC2。
- Depends on: none。
- Files: `src/core/services/ai/text/ai-service.ts`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src-tauri/tauri.conf.json`。
- Forbidden files: 用户设置存储值、任何密钥文件。
- Tests: 助手错误呈现测试。
- Validation: focused Jest; static JSON validation; build.
- Rollback signals: CSP 或 provider 调用无法构建时，回退这些文件的本任务 hunk。

### U2 - 自动项目上下文初始化

- Goal: 打开空对话和新建对话后，流式创建首轮助手回复。
- Requirements covered: R3, R4, R5。
- Acceptance criteria covered: AC3, AC4, AC5。
- Depends on: U1。
- Files: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`。
- Forbidden files: 项目表单的解析和回填回调。
- Tests: 首次打开、新建对话、上下文与并发保护。
- Validation: focused Jest; build.
- Rollback signals: 恢复显式用户操作才发起请求的旧生命周期。

## Consistency Check

- implementationUnitCount: 2
- sourceRequirementsCovered: R1, R2, R3, R4, R5
- sourceRequirementsDeferred: none
- openQuestionsCount: 1

## Validation Plan

- Unit: `AICreativeAssistantSheet` 交互及错误分类测试。
- Integration: `pnpm run build:check`。
- User flow: 用户在当前设置中打开助手，观察自动首轮回复；后续只记录状态，不暴露密钥。
- Operations: 不访问或记录认证配置。

## Plan Self-Review

- Placeholder scan: passed。
- Consistency check: passed。
- Scope check: 只覆盖当前失败与初始化行为。
- Acceptance coverage: R1-R5 已映射至 U1-U2。
- Validation gaps: 真实服务请求需要用户本地验证。
- Alternatives and ADR check: passed。
- High-risk pre-mortem check: passed。
