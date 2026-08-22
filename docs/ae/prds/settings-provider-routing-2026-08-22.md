---
type: prd
status: superseded
date: 2026-08-22
topic: settings-provider-routing
format: human-readable-requirements
sharded: false
---

# 可配置 AI 连接与本地工作目录

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

系统偏好页当前展示固定的官方 Provider 卡片，只保存 API Key，无法配置自定义请求地址、实际模型 ID 或网关密钥。文本 Provider 策略也把请求地址硬编码，导致设置页输入的地址无法改变真实请求路径。工作目录虽然调用了 Tauri 文件对话框，但 web 开发模式没有清晰的能力边界和 fallback 提示。

目标是提供可复用的连接配置：用户可以为文字、图像、视频和语音服务设置自定义 base URL、模型 ID、API Key（以及需要时的 Secret），并为远程视频网关配置与 `ph-MoneyPrinterTurbo`/`image.kkone.vip` 契约一致的地址和密钥；桌面端工作目录按钮应打开本地目录选择器并持久化结果。

## Requirements

**Provider connection settings**

- R1. 设置页必须按实际模型目录动态展示可用 Provider/模型，不再把“官方最新两款模型”作为唯一配置来源。  
  Acceptance: 新增或修改模型目录后，设置项可以显示对应 Provider 和模型 ID，不需要再编辑页面中的固定卡片数组。
- R2. 每个连接项必须支持编辑并持久化 `base URL`、API Key、模型 ID；Provider 需要额外凭据时支持 Secret 字段。  
  Acceptance: 保存后刷新设置页，字段仍存在；请求配置能读取同一组值。
- R3. 文本请求必须使用用户配置的 API Key、base URL 和模型 ID；未配置自定义 URL 时保留当前 Provider 默认地址。  
  Acceptance: mocked fetch 能观察到自定义 URL、Authorization 和 model，且 base URL 不会泄漏到 JSON request body。
- R4. API Key 校验必须只做格式/连通性提示，不得把真实密钥写入日志、toast 或错误文本。  
  Acceptance: 校验失败和网络失败的可见信息不包含完整密钥。

**Remote video gateway**

- R5. 设置页必须提供独立的远程视频网关配置，包括启用开关、base URL、API Key、请求超时和模型映射入口；默认值可参考 `https://api.kkone.vip`，但不得强制使用官方 Key。  
  Acceptance: 用户可以保存自定义网关地址和密钥，配置值可被远程视频服务读取；空配置不会发起远程请求。
- R6. 远程视频配置的数据模型必须允许按模型处理不同 endpoint/字段协议，至少能表达 `/v1/video/generations` 与 `/v1/videos` 两类路径，以及异步任务查询。  
  Acceptance: 配置与请求构造层不依赖单一硬编码路径；视频模型可映射到 v1/v2/v3/Grok/MiniMax 等网关别名。

**Working directory**

- R7. 桌面端点击“更改路径”必须打开目录选择器，选择结果写入持久化设置并立即显示。  
  Acceptance: Tauri runtime 下选择目录后，字段更新且重启后保留绝对路径。
- R8. web 模式不能伪造本机绝对路径；目录选择不可用时必须给出明确提示，同时允许手动编辑路径。  
  Acceptance: 非 Tauri 环境不会抛出未处理异常，用户能看到能力边界提示。

## Non-Functional Requirements

- NFR1. 密钥优先使用现有 `secureStorage`，保留已有 localStorage 兼容读取；迁移不得清空旧配置。  
  Acceptance: 旧 `api_*_key`/`ai_model_settings_*` 数据仍能被识别，新保存数据走 secure storage facade。
- NFR2. 保持现有 `aiService`、`imageGenerationService` 和 `tauriService` 的公开调用签名兼容。  
  Acceptance: 现有核心测试和 TypeScript 检查不因配置重构而改变调用方。
- NFR3. 外部远程服务仅做配置和请求构造集成；不在无凭据条件下宣称真实服务 smoke 通过。  
  Acceptance: 测试使用 mocked transport；真实网关验证状态明确标记为 unverified。

## Must-Haves (Conditional)

- Requirement ID: R2
  Must-have completion condition: base URL、模型 ID、API Key 刷新后仍能恢复，且不是只保存到 React state。
- Requirement ID: R3
  Must-have completion condition: 至少一个文本 Provider 的 mocked request 断言自定义 URL、Bearer Key 和 model。
- Requirement ID: R7
  Must-have completion condition: Tauri 目录选择结果经过持久化并重新加载。

## Success Criteria

- 设置页不再要求用户为不可用的官方 endpoint 填 Key；用户可配置自己的兼容网关。
- AI 请求实际使用设置页保存的 URL、模型和密钥。
- 远程视频网关可以被配置而不会与本地视频流程耦合。
- 桌面端工作目录可通过目录选择器选择，web 模式行为诚实可解释。

## Scope Boundary

### In Scope

- 设置页连接项和远程视频网关配置。
- 配置存取、旧数据兼容、文本 Provider endpoint 路由。
- Tauri/web 目录选择行为。
- 远程视频模型/endpoint 配置契约和请求构造的基础接口。

### Out Of Scope

- 这次不替换现有本地视频剪辑、TTS、FFmpeg 流程。
- 不在没有用户凭据的情况下调用真实外部模型或上传真实素材。
- 不把浏览器端调用改成暴露上游 Bearer Key 的 direct-to-provider 模式。

### Constraints

- 复用现有 `secureStorage`、`tauriService`、模型目录和 Provider strategy 边界。
- 远程视频参考遵循 `ph-MoneyPrinterTurbo` 的服务端配置原则：网关地址、密钥和异步任务状态不应泄漏到 UI 日志。

## Validation Evidence (Conditional)

| Acceptance | Tier                   | Expected signal                                             | Preconditions                       | Status     | Recovery                                         |
| ---------- | ---------------------- | ----------------------------------------------------------- | ----------------------------------- | ---------- | ------------------------------------------------ |
| R2/R3      | Focused automated test | settings round-trip and mocked fetch contract pass          | test deps installed                 | unverified | keep legacy read path and disable custom routing |
| R5/R6      | Static + focused test  | remote config shape and endpoint mapper cover v1/v2 classes | fixtures from external docs and MPT | unverified | leave remote video disabled                      |
| R7/R8      | Browser acceptance     | desktop chooser path and web fallback are visible           | running UI/Tauri runtime            | unverified | retain manual input                              |

## Perspective Collision (Conditional)

- Critic: fixed official cards create false confidence and encourage storing unusable credentials.
- Pragmatist: replacing every provider protocol at once expands risk; preserve strategy interfaces and add a shared connection resolver first.
- Innovator: one custom gateway can route many model IDs, so model ID must be editable rather than inferred from display labels.
- Systems: remote video has multiple wire contracts and async lifecycle; keep it as a separate gateway configuration rather than silently treating it as text/image.
- Collision insight: the smallest safe product unit is configurable connection metadata plus request routing, while full remote task orchestration remains a separately testable boundary.
- Blind spot: actual third-party model availability and account entitlements cannot be proven without user credentials.
- Thinking preservation zone: provider defaults and UI grouping remain product choices; implementation must not turn current illustrative model names into hard protocol guarantees.

## Key Decisions

- D1. Replace the fixed key-only cards with dynamic provider connection cards and one dedicated remote-video gateway section.  
  Reason: avoids duplicate configuration surfaces and makes custom gateways first-class.
- D2. Resolve credentials and URL through the existing secure storage facade with legacy fallback.  
  Reason: preserves current data while giving Tauri a stronger persistence path.
- D3. Keep remote video gateway settings separate from text/image provider settings.  
  Reason: the referenced service has multiple asynchronous request contracts and should not inherit chat-completion assumptions.

## Dependencies And Assumptions

### Dependencies

- `src/core/services/project/secure-storage-service.ts`
- `src/infrastructure/tauri-bridge/commands.ts`
- `src/core/config/model-catalog.ts`
- `D:/codes/ph-MoneyPrinterTurbo/app/services/remote_video.py` and its AE plan/design
- `https://image.kkone.vip/1/docs.html` external model contract

### Assumptions

- OpenAI-compatible custom gateways expose a chat-completions-compatible path beneath the configured base URL.
- The browser can only edit a path string; absolute directory selection is a Tauri capability.

## Open Questions

### Must Resolve Before Planning

- None; the requested UI and routing direction is sufficiently specified.

### Deferred To Planning

- Q1. [Affects R6][technical] Whether full remote task submission/polling belongs in this change or only its configuration/request contract. Resolve by keeping the first implementation at configuration + transport boundary unless an existing Novella task surface is found.

## Evidence Notes

- Current fixed settings cards -> `src/pages/settings/SettingsPage.tsx`
- Hard-coded text endpoints -> `src/core/ai/providers/*-strategy.ts`
- Existing secure storage -> `src/core/services/project/secure-storage-service.ts`
- Existing directory dialog -> `src/infrastructure/tauri-bridge/commands.ts:openFile`
- Remote gateway patterns -> `D:/codes/ph-MoneyPrinterTurbo/app/services/remote_video.py`, `docs/ae/plans/new-api-video-generation-2026-08-16.md`
- External model paths and fields -> `https://image.kkone.vip/1/docs.html` (retrieved 2026-08-22)

## Consistency Check

- requirementsCount: 8
- nonFunctionalRequirementsCount: 3
- decisionsCount: 3
- openQuestionsCount: 1
