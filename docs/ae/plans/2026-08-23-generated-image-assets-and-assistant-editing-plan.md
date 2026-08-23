---
type: plan
status: implemented
date: 2026-08-23
title: generated-image-assets-and-assistant-editing
origin: docs/ae/prds/2026-08-23-generated-image-assets-and-assistant-editing.md
originFingerprint: 2026-08-23-generated-image-assets-and-assistant-editing
depth: deep
format: human-readable-plan
sharded: false
---

# Plan: 生成图片资产与 AI 助手调整

## Source

`docs/ae/prds/2026-08-23-generated-image-assets-and-assistant-editing.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

补齐角色参考图的下载、相对路径持久化、缩略图展示和助手自然语言图片生成回传。只复用现有图片服务、Tauri bridge 和项目保存入口。

## Readiness

- Goal: 生成图片可见、可落盘、可被项目相对路径引用，并能从助手对话触发与回传。
- Acceptance criteria: R1-R6 全部覆盖；真实供应商调用保持未验证。
- Non-goals: 新 Provider、云存储、候选稿确认语义改造。
- Affected areas: Tauri image command, bridge, creative-assistant message contract/UI, StepCharacter persistence/display.
- Validation surface: focused Jest, TypeScript, Cargo check, browser smoke.
- Open questions: none.

## Validation Evidence (Conditional)

| Acceptance criterion                | Applicable tier                             | Expected signal and bounded claim                        | Preconditions / owner      | Status         | Recovery or rollback signal |
| ----------------------------------- | ------------------------------------------- | -------------------------------------------------------- | -------------------------- | -------------- | --------------------------- |
| R1/R3/R4 图片在角色卡和助手消息可见 | Focused automated test + desktop acceptance | DOM 契约通过；Tauri WebView 显示同一张 1280×720 图片     | Jest/jsdom + Tauri / Codex | verified       | 回退到仅文本回复和原有计数  |
| R2/R5 桌面下载与路径边界            | Integration + Rust tests                    | Rust 编译通过，3 个图片命令测试通过，非法路径/格式被拒绝 | Rust toolchain / Codex     | verified       | 禁用落盘命令，保留远程预览  |
| R6 浏览器降级                       | Automated contract                          | 无 Tauri/工作目录时保留临时预览且不伪造相对路径          | Jest / Codex               | verified       | 只显示服务返回 URL          |
| 真实图片服务                        | Authenticated service smoke                 | 仅 mock 覆盖，本轮不携带真实凭据                         | 用户授权凭据               | not-applicable | 不触发真实付费调用          |

## Contract Value Classification (Conditional)

- canonical persisted value: `Character.consistency.referenceImages` 中的 `assets/images/<file>` 相对路径。
- derived/ephemeral: provider 临时 URL、`convertFileSrc` 预览 URL、助手消息中的运行时预览地址。
- caller-controlled input: 工作目录、项目 ID、文件名、供应商返回 URL。
- compatibility fallback: 浏览器模式保留 HTTP(S) URL；旧项目中的 HTTP(S) 引用继续可直接展示。
- trust boundary: Rust 下载/读取命令校验 HTTPS 或 Data URL、响应状态、MIME/魔数、大小、项目 ID 和目标路径前缀。

## Alternatives Considered

- Recommended: Tauri 原生下载 + 相对路径持久化 + UI 预览解析。
- Alternative: WebView `fetch` + Blob 下载。
- Rejected because: 桌面跨域、临时 URL 和文件系统权限不稳定，且 API Key/下载链路应留在 native boundary。

## Decision Drivers

- 用户必须在生成完成时看到真实图片。
- 项目 JSON 不能依赖供应商临时 URL。
- 现有 Tauri/React 架构和兼容字段应保持不变。

## Decisions

### ADR-1 - 原生下载与相对路径

- Decision: 新增受校验的 Tauri 图片资产下载命令，返回绝对路径、相对路径和 MIME/大小。
- Drivers: 安全、离线重载、跨域兼容。
- Alternatives: 纯前端保存、base64 写入 JSON。
- Why chosen: 文件不膨胀项目 JSON，且桌面能力集中在 Rust。
- Consequences: 浏览器模式只能降级；工作目录需配置。
- Follow-ups: 若未来支持云端同步，再增加独立上传适配器。

### ADR-2 - 助手触发方式

- Decision: 对用户消息做明确的中文生成/调整意图检测，调用页面传入的图片回调并把结果挂到助手消息。
- Drivers: 不改变现有 SSE 对话协议，行为可测。
- Alternatives: 新增模型 function-calling 协议。
- Why chosen: 当前 Provider 仅保证文本流，避免协议升级和供应商差异。
- Consequences: 触发词范围需保持保守并提供失败提示。
- Follow-ups: 将来若统一 tool-call schema，可替换检测层而不改变消息资产契约。

## Risks

- 供应商返回的 URL 过期或不是图片；通过 native 状态/MIME/大小校验拦截。
- 工作目录被移动；相对路径保留，预览显示不可用状态而不覆盖项目数据。
- 旧消息没有图片元数据；session parser 保持兼容。

## Pre-Mortem

- 下载命令允许路径穿越：以项目 ID/文件名白名单和 canonical 前缀检查阻止。
- 生成成功但消息不展示：消息契约测试和 DOM 断言覆盖。
- 助手普通“图片”讨论误触发付费生成：只在明确生成/调整意图且回调存在时触发，并记录失败状态。

## Global Constraints

- 保留当前工作区用户改动，不执行 reset/checkout/clean/commit。
- API Key 不写入日志、项目 JSON、消息或测试快照。
- 复用现有 `generateImage`、`tauriService`、`onSaveProject` 和 `Character` 类型。

## Implementation Units

### U1 - Native image asset download contract

- Goal: 下载远程/临时图片到项目工作目录，并返回相对路径元数据。
- Requirements covered: R2, R5, R6 support.
- Acceptance criteria covered: R2/R5 path and response validation.
- Depends on: none.
- Files: `src-tauri/src/commands/image.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`, `src/infrastructure/tauri-bridge/commands.ts`.
- Forbidden files: existing unrelated Rust commands, package manifests except already-added reqwest.
- Approach: add typed request/result, HTTPS and path/file validation, bounded download, bridge wrapper.
- Tests: Rust pure validation tests; TS bridge contract test if existing harness supports invoke mocks.
- Validation: `cargo check --manifest-path src-tauri/Cargo.toml`; focused Rust tests.
- Rollback signals: any rejected valid configured URL or write outside project asset root.
- Deferred to implementation: exact filename extension mapping based on MIME.

### U2 - Generated image asset normalization and character preview

- Goal: persist generated result and display it in the role card using relative-path resolution.
- Requirements covered: R1, R2, R6.
- Acceptance criteria covered: immediate thumbnail, refresh-compatible relative path.
- Depends on: U1.
- Files: `src/pages/project-edit/components/StepCharacter.tsx`, `src/core/audio/types/composition.ts` only if type extension is required, focused tests.
- Forbidden files: unrelated project loaders and export flows.
- Approach: resolve `novella_working_dir`, call bridge on desktop, store relative path, use `convertFileSrc` for previews, keep HTTP/data URLs in browser mode.
- Tests: StepCharacter interaction/preview tests and pure path resolver tests.
- Validation: `pnpm exec jest --runInBand src/__tests__/pages/character-reference-assets.test.ts` (or nearest focused test), `pnpm exec tsc --noEmit`.
- Rollback signals: generated result not visible or existing references disappear after save.
- Deferred to implementation: no schema migration; old strings remain readable.

### U3 - Assistant image generation message path

- Goal: natural-language request from assistant chat generates, persists, and renders an image message, then updates the active role references.
- Requirements covered: R3, R4, R6.
- Acceptance criteria covered: assistant message contains image and path; adjustment request works.
- Depends on: U2.
- Files: `src/features/creative-assistant/types.ts`, `src/features/creative-assistant/creative-assistant-session.ts`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/features/creative-assistant/components/AssistantChatBubble.tsx` only if needed, `src/pages/project-edit/components/StepCharacter.tsx`, focused tests.
- Forbidden files: dialogue provider protocol and unrelated assistant memory formats.
- Approach: add optional generated-image metadata to messages, detect explicit Chinese generate/adjust intent, invoke page callback, attach result to assistant message, render `<img>` with path metadata, persist metadata compatibly.
- Tests: intent detection, session round-trip, assistant DOM image rendering, callback/update behavior.
- Validation: focused Jest; browser smoke with mocked generation.
- Rollback signals: ordinary chat triggers generation unexpectedly, or image callback failures lose assistant text.
- Deferred to implementation: model-native tool calling remains out of scope.

## Consistency Check

- implementationUnitCount: 3
- sourceRequirementsCovered: R1,R2,R3,R4,R5,R6
- sourceRequirementsDeferred: none
- openQuestionsCount: 0

## Validation Plan

- Unit: Rust validators, TS intent/path/session helpers.
- Integration: TypeScript + Cargo build checks and bridge registration.
- User flow: role generate button and assistant generate/adjust request show the image.
- Data / operations: project JSON stores relative path; no API key or provider URL is persisted on desktop.
- Observability: sanitized toast/error only; no prompt credentials in logs.

## Rollback / Recovery

Disable the native download callback and keep existing remote URL strings; delete only newly generated assets under the project `assets/images` folder if a user explicitly removes them. No Git destructive operations.

## Plan Self-Review

- Placeholder scan: no TBD/TODO; deferred items are bounded implementation details.
- Consistency check: all six requirements map to units and validation.
- Scope check: no new provider, dependency, or cloud service.
- Acceptance coverage: immediate preview, persistence, assistant return, security, browser fallback covered.
- Validation gaps: authenticated provider smoke remains not-applicable; browser/runtime evidence pending execution.
- Alternatives and ADR check: native download and trigger strategy recorded with consequences.
- High-risk pre-mortem check: path safety, accidental generation, and rendering failures covered.

## Completion

- U1 已完成：`generate_configured_image`、`download_image_asset`、`read_image_asset` 及 TS bridge 已注册并通过 Rust/TypeScript 校验。
- U2 已完成：角色页生成、落盘、相对路径持久化、重载预览和项目身份/水合保护已实现。
- U3 已完成：助手自然语言图片意图、生成回调、图片消息持久化和角色引用同步已实现。
- 最终证据：`docs/ae/gates/20260823T101011Z-work-final.json`；Tauri 截图保存在本地验证输出目录，不作为项目运行时依赖。
