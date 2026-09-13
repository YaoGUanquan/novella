# Novella 后续全面修复与演进报告

日期：2026-09-06  
范围：当前 `D:\codes\ph-novella` 仓库  
参考方法：用户提供的 Agent 项目审计文章；结合仓库 `AGENTS.md`、现有 AE 产物、源码、配置、测试和本地浏览器证据。

## 1. Executive Summary

当前项目已经具备 Novella AI 漫剧创作的基础能力：React 19 + Vite + Tauri v2，已有对话 Provider 注册/分发、图像生成适配器、远程视频任务、小说解析与小说转剧本能力、PipelineEngine、项目资产服务和创作助手。

主要问题不是“缺少一个模型接入”，而是不同领域已经出现多个局部入口，尚未形成可长期扩展的统一运行契约：

1. 视频供应商、模型名、请求参数和轮询协议仍有一部分通过模型名称启发式分支决定。
2. 图像适配器、图像生成服务和远程视频服务存在重复路由责任。
3. 对话智能体可以生成内容和候选修改，但还不是带权限、预览、幂等、撤销和审计的项目操作执行器。
4. 小说 -> 剧本 -> 分镜 -> 视频的能力已分散存在，缺少带项目身份的持久中间产物、checkpoint、恢复和质量门统一编排。
5. 通用资产服务、资源库 feature 和 Tauri 受控媒体资产路径尚未合并为一个规范的资源模型。
6. 前端首页的视觉基线偏重装饰，部分文案把未被运行时证明的模型和 GPU 能力展示成事实；移动端和键盘可达性存在缺口。

本次已完成低风险前端修复，未改变路由、API、权限或业务调用链。更大范围的 AI、资源和 Pipeline 迁移应按本文的阶段顺序实施，先建立契约和观测，再逐步迁移现有实现。

## 2. Scope and Method

### 2.1 检查范围

- 技术栈、包脚本、Vite 配置、目录职责和依赖方向。
- 应用入口、路由、首页、布局、设置页和现有视觉 token。
- 对话 Provider 注册/分发和创作助手。
- 图像/视频生成 service、adapter、远程任务类型和错误处理。
- 小说服务、PipelineEngine、项目存储、资产服务和 Tauri 图片资产命令。
- plugin crate 当前 manifest/registry 能力。
- focused tests、TypeScript、Lint、Vite 构建、本地浏览器桌面/移动视图。

### 2.2 证据等级

| 标记       | 含义                                               |
| ---------- | -------------------------------------------------- |
| `verified` | 当前源码、命令结果或浏览器操作直接观察到           |
| `inferred` | 由多个已观察事实推导出的高置信判断                 |
| `assumed`  | 为后续产品设计提出的待确认方案，不代表当前系统事实 |

本报告不把模型能力、GPU 加速、供应商支持范围、真实服务可用性或生产部署状态当作已验证事实。

## 3. Current Inventory

### 3.1 当前已有能力

| 领域         | 现有入口                                                                                        | 当前判断                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 对话         | `src/core/services/ai/text/ai-call-dispatcher.ts`、`src/core/ai/providers/provider-registry.ts` | `verified`：已有中心分发与 Provider 注册方向                                     |
| 创作助手     | `src/core/services/ai/assistant-agent/creative-assistant-agent.ts`                              | `verified`：支持流式对话、图片生成、候选稿、应用/持久化、记忆、取消和重试        |
| 图片         | `src/core/services/ai/image/image-generation/adapter.ts`、`image-generation-service.ts`         | `verified`：已有 adapter/provider 结构，但路由责任重复                           |
| 视频         | `src/core/services/ai/video/remote-video-service.ts`                                            | `verified`：已有异步提交、查询、取消、轮询、下载等流程，但协议分支集中在 service |
| 小说         | `src/core/services/ai/text/novel-service.ts`                                                    | `verified`：已有解析、小说转剧本、分镜生成和适配性分析基础                       |
| 流水线       | `src/core/pipeline/pipeline-engine.ts`                                                          | `verified`：已有 pause/resume/cancel/checkpoint 概念                             |
| 资产         | `src/core/services/project/asset-service.ts`、`src/features/asset-library/index.ts`             | `verified`：存在两个未统一的资产系统                                             |
| 本地媒体安全 | `src-tauri/src/commands/image.rs`                                                               | `verified`：图片命令已有受控项目资产路径校验方向                                 |
| 插件         | `crates/plugin/src/lib.rs`                                                                      | `verified`：目前主要是 manifest 和内存 registry，不是完整 provider 执行契约      |
| 前端         | `src/features/home/**`、`src/shared/components/layout/AppLayout/**`、全局 CSS                   | `verified`：已有 cyberpunk/studio 视觉基线，但 token 与全局效果有重叠            |

### 3.2 主要调用边界

```text
UI/feature
  -> core/services
  -> dispatcher / registry / adapter
  -> provider endpoint or Tauri command
  -> project/resource/pipeline state
```

该方向符合项目依赖约束，应继续坚持。后续不应允许 React 组件直接调用第三方 AI/视频 API。

## 4. Findings

### P0：必须先修复的契约风险

#### F-001 视频执行上下文不稳定

- 级别：`P0`
- 状态：`verified`
- 位置：`src/core/services/ai/video/remote-video-service.ts`
- 观察：视频协议和 endpoint 通过 `grok-*`、`minimax-*`、`video-v1` 及默认 `/v1/videos` 等模型名分支决定；轮询阶段重新读取当前设置和模型映射。
- 风险：用户提交任务后修改设置，可能使后续查询、下载或错误映射使用与提交时不同的 provider/model 上下文；新增供应商会继续扩大条件分支。
- 修复方向：提交时生成不可变 `VideoExecutionContext`，至少包含 `providerId`、`modelId`、`operation`、`endpointRef`、`protocol`、`requestVersion`、`taskId`、`idempotencyKey`、超时/重试策略和脱敏 request metadata。轮询、取消、下载只使用该上下文，不重新推导。
- 验收：修改设置不影响已提交任务；每个 provider/model/operation 组合都有 contract test；旧任务可恢复或明确失败。

#### F-002 Pipeline checkpoint 缺少 workflow/project 身份

- 级别：`P0`
- 状态：`verified`
- 位置：`src/core/pipeline/pipeline-engine.ts`、`src/core/services/domain/manga-pipeline-orchestrator.ts`
- 观察：checkpoint key 当前以 `stepId` 为主；主要漫剧编排调用 `enableCheckpoint: false`。
- 风险：多项目并行、重启恢复或同一步骤重试时可能发生 checkpoint 串用；长流程不能可靠恢复。
- 修复方向：checkpoint key 使用 `workflowId/projectId/runId/stepId` 的结构化命名；保存输入摘要、schemaVersion、provider execution context、状态、进度、错误类别和输出引用；先为小说到视频主流程启用 checkpoint，再迁移其他流程。
- 验收：双项目同 step 并行、进程重启、取消后恢复、失败重试、旧 checkpoint 版本兼容测试。

#### F-003 对话智能体缺少受控项目操作边界

- 级别：`P0`
- 状态：`verified` / `inferred`
- 位置：`src/core/services/ai/assistant-agent/creative-assistant-agent.ts`
- 观察：已有候选生成、应用和持久化能力，但尚未形成通用 typed tool/command、权限 gate、dry-run、确认、幂等、撤销和审计事件契约。
- 风险：如果直接把模型文本解释成项目变更，可能出现误修改、重复执行、不可回滚和无法追责。
- 修复方向：定义 `ProjectAction` 联合类型，例如 `createProject`、`importNovel`、`generateScript`、`generateStoryboard`、`submitVideoJob`、`linkResource`、`exportProject`。每个 action 必须有 schema 校验、权限范围、预览 diff、确认策略、idempotency key、undo/recovery 语义和审计事件。
- 验收：模型只能请求已注册 action；无权限 action 被拒绝；重复 action 不重复写入；高风险动作需要确认；所有状态变化能追溯到 turnId/actionId。

### P1：应在近期统一的架构问题

#### F-004 Provider 路由责任重复

- 级别：`P1`
- 状态：`verified`
- 位置：`src/core/services/ai/image/image-generation/adapter.ts`、`image-generation-service.ts`、`remote-video-service.ts`
- 观察：adapter 和 service 都参与 provider/model 路由；图片和视频能力模型类型也不完全一致。
- 风险：新增供应商时需要修改多个入口，容易出现路由不一致、fallback 不一致和类型漂移。
- 修复方向：建立统一 `CapabilityRegistry`，按 `operation + providerId + modelId` 注册：能力声明、请求 mapper、响应 parser、错误 mapper、任务生命周期、超时/重试策略、资产落盘策略。service 只负责调度与状态，不写供应商字段分支。
- 验收：路由只存在一个注册入口；provider contract test 覆盖 request/response/error；未知模型得到明确的 unsupported error。

#### F-005 对话、图像、视频缺少统一运行契约

- 级别：`P1`
- 状态：`inferred`
- 修复方向：抽象 `GenerationRequest`、`GenerationResult`、`GenerationTask`、`ProviderError`、`UsageMetadata`、`ExecutionContext`。统一记录 provider、model、operation、requestId、耗时、重试次数、流式状态和脱敏错误类别。
- 注意：不同协议可以保留 adapter 内部差异，不要求所有供应商使用同一原始 JSON。

#### F-006 资产系统未统一

- 级别：`P1`
- 状态：`verified`
- 位置：`asset-service.ts`、`src/features/asset-library/index.ts`、`src-tauri/src/commands/image.rs`
- 观察：通用资产 localStorage、feature 内存 registry、Tauri 项目资产路径各自存在。
- 风险：资源无法跨项目稳定引用；版本、来源、生成任务、许可、访问范围和删除策略缺少单一事实源。
- 修复方向：建立 canonical `Resource` 模型：`resourceId`、`kind`、`name`、`version`、`projectRefs`、`storageRef`、`provenance`、`generationRef`、`dimensions/duration`、`status`、`visibility`、`createdAt/updatedAt`。项目只保存 resource reference；本地媒体仍只保存受控相对路径。
- 验收：角色、物品、场景、音频、图片、视频都能通过同一资源查询/引用接口；跨项目引用不会复制秘密或临时 URL；删除有引用检查。

#### F-007 长流程中间产物缺少持久边界

- 级别：`P1`
- 状态：`verified` / `inferred`
- 修复方向：把小说、章节、人物表、场景表、剧本、镜头表、视频任务、成片分别作为可版本化 artifact；每个 artifact 携带 schemaVersion、上游引用、质量门结果和生成执行上下文。
- 验收：可从任一中间产物继续；上游修改能标记下游 stale，而不是静默覆盖；重新生成可选择覆盖、分支或新版本。

### P2：重要的可维护性与体验问题

#### F-008 安全存储 fallback 边界不清晰

- 级别：`P2`
- 状态：`verified`
- 位置：`src/core/services/project/secure-storage-service.ts`
- 观察：Tauri store 优先，但浏览器/localStorage fallback 也承载 API key。
- 风险：开发浏览器环境容易让用户误以为 API key 处于桌面安全存储。
- 修复方向：区分 `desktop-secure` 和 `browser-development` backend；浏览器 fallback 默认不保存密钥或显式标记不安全；设置页显示存储级别和清除入口。

#### F-009 插件 manifest 尚未形成可执行 Provider 插件协议

- 级别：`P2`
- 状态：`verified`
- 位置：`crates/plugin/src/lib.rs`
- 修复方向：先定义 capability manifest 和版本协商，不直接开放任意动态代码执行。插件只能声明 provider/capability/schema/permissions；执行仍通过受控 host adapter。

#### F-010 错误、超时、重试和 fallback 需要统一分类

- 级别：`P2`
- 状态：`inferred`
- 修复方向：统一区分认证失败、限流、参数错误、供应商不可用、任务超时、下载校验失败、用户取消、权限拒绝和本地存储失败。UI 显示可行动的状态，日志记录 requestId/provider/operation/耗时，禁止记录 token 和完整敏感 prompt。

#### F-011 全局视觉规则与组件状态冲突

- 级别：`P2`
- 状态：`verified`
- 位置：`src/styles/globals.css`、`src/app/styles/global.css`
- 观察：全局曾移除 focus ring；存在宽泛 transition 和多个 token/主题文件；首页使用部分未验证能力文案和装饰性光晕。
- 修复方向：保留现有 dark studio 基线，收敛 token 来源；focus 交给 `:focus-visible`；动效只服务反馈和状态；事实文案来自运行时状态或明确标为预览。

### P3：可排期优化

- F-012：补齐首页、设置页、项目列表的 error/empty/loading/success/disabled 状态测试。
- F-013：清理废弃的平行样式和未使用的旧 CSS module，需先通过引用扫描确认。
- F-014：为 provider、资源、pipeline 和 assistant action 增加可观察性面板，但不把诊断数据直接暴露秘密。

## 5. Conflict Matrix

| 主题          | 当前事实                                    | 目标意图           | 冲突                        | 处理顺序                                    |
| ------------- | ------------------------------------------- | ------------------ | --------------------------- | ------------------------------------------- |
| Provider 路由 | 多处 service/adapter 分支                   | 统一封装供应商     | 路由责任重复                | 先定义 registry，再迁移，不先删除旧入口     |
| 视频轮询      | 每次可能重新读设置                          | 任务长期稳定       | 执行上下文漂移              | 提交时冻结 context                          |
| Pipeline      | 有 checkpoint API，但主流程关闭             | 小说到视频可恢复   | 设计能力未接入主流程        | 先补 key/schema，再开启主流程               |
| 助手          | 可生成候选和应用                            | 对话自动化项目能力 | 缺 typed action 和权限 gate | 先 preview，再允许 mutation                 |
| 资源          | localStorage、内存 registry、Tauri 资产分离 | 跨项目引用资源     | 没有 canonical resource id  | 先建兼容 facade，再逐步迁移存储             |
| 存储          | Tauri secure store + 浏览器 fallback        | 密钥安全保存       | fallback 安全级别不明显     | 明确 backend/status，默认不保存 browser key |
| UI 文案       | 首页有具体模型/GPU/厂商名                   | 后续供应商会变化   | 展示绑定未验证能力          | 使用能力类别或运行时数据                    |

## 6. Target Architecture

### 6.1 Provider Capability Registry

```text
CapabilityRegistry
  operation: dialogue | image | video | audio | embed
  providerId
  modelId
  capabilityVersion
  requestMapper
  responseParser
  streamParser
  taskLifecycle: submit | query | cancel | download
  errorMapper
  policy: timeout | retry | rateLimit | fallback
  assetPolicy
```

供应商差异保留在 adapter 内部；上层只看统一的 operation、状态、结果和错误契约。视频模型名称只作为 registry key，不再承担协议推断职责。

### 6.2 Project Automation Layer

```text
Conversation turn
  -> intent/result parser
  -> typed ProjectAction validator
  -> permission + risk policy
  -> preview/diff
  -> user confirmation when required
  -> idempotent command executor
  -> project/resource/pipeline state
  -> audit event + assistant response
```

模型输出永远不能直接写项目状态。所有 mutation 都要经过 action registry 和领域 service。

### 6.3 Resource and Artifact Layer

```text
Resource: character | prop | location | image | audio | video | style | template
Artifact: novel | chapter | script | shot-list | storyboard | generation-task | final-video
Reference: project/resource/artifact relationship
StorageRef: validated relative path or controlled remote task reference
Provenance: prompt hash, provider/model, source artifact, creator, timestamp
```

远程 URL、Data URL、Blob URL 不能作为永久项目资产引用；远程任务完成后必须经过响应解析、文件类型/大小/路径校验和受控落盘。

### 6.4 Long-running Workflow

```text
Novel import
  -> novel artifact
  -> character/location/prop extraction
  -> script artifact
  -> shot-list/storyboard artifact
  -> image/audio/video generation tasks
  -> quality gates
  -> editable timeline/final export
```

每一步都由 PipelineEngine 管理依赖、进度、错误、重试、checkpoint、取消和恢复；UI 只展示状态和发起命令。

## 7. Prioritized Action Plan

### Phase 0：契约与观测基线

目标：不改变用户业务行为，先把边界固定下来。

- 定义 `ExecutionContext`、`ProviderError`、`GenerationTask`、`ProjectAction`、`Resource`、`Artifact` 类型。
- 为 requestId、turnId、actionId、workflowId、projectId 建立统一脱敏日志字段。
- 记录当前 provider/model 路由和任务生命周期作为迁移基线。
- 将所有未确认的模型能力从 UI 固定文案改为能力类别或预览状态。

完成门：类型/API contract tests 通过；不新增直接第三方 API 调用；无秘密进入日志和文档。

### Phase 1：统一 Provider Registry

- 先覆盖 dialogue、image、video 三类 operation。
- 把当前已存在 provider adapter 迁移为 registry entry。
- 为每个 provider/model 编写 request snapshot、response parser、错误映射、超时和重试测试。
- 远程视频任务提交后冻结 execution context。
- 保留旧 service 作为兼容 facade，迁移完成后再删除重复分支。

完成门：新增一个视频模型只需要新增 registry/adapter/test，不修改核心 service 条件分支。

### Phase 2：资源与 artifact 统一

- 建立 canonical resource store 与项目引用 API。
- 对角色、物品、场景先做迁移样板，再扩展到图像、音频、视频和模板。
- 增加资源版本、来源、生成任务引用、引用计数/删除保护和访问范围。
- 为 Tauri 文件路径建立唯一安全入口，浏览器只走开发态受限 backend。

完成门：同一角色资源可被两个项目引用；资源移动、删除、重新生成有明确结果。

### Phase 3：对话自动化与权限

- 设计 action catalog 和风险等级。
- 只先开放 read-only action 和 preview action。
- 再开放导入、生成、保存等 mutation action。
- 高风险操作要求用户确认；所有 action 支持幂等和重复检测。
- 增加撤销、恢复和审计事件。

完成门：对话可以完成一个可追踪的“导入小说 -> 生成剧本草稿”流程，但模型不能绕过 action executor。

### Phase 4：小说到视频 Workflow

- 将小说解析、章节拆分、人物/场景提取、剧本生成、镜头表、分镜、视频任务接入统一 PipelineEngine。
- 为每个 artifact 保存版本和上游引用。
- 开启项目级 checkpoint，支持暂停、恢复、取消、重试和断点下载。
- 质量门至少覆盖结构完整性、角色引用完整性、镜头字段完整性、资产可用性和视频任务终态。

完成门：重启桌面应用后可以从最近的有效 checkpoint 恢复，不重复提交已成功的远程视频任务。

### Phase 5：插件和供应商扩展

- 将 plugin manifest 升级为 capability/schema/permission/version contract。
- 先支持受控 host adapter，不直接执行未经授权的插件代码。
- 建立供应商兼容性矩阵、弃用策略和迁移文档。

完成门：供应商接入、升级和禁用不需要修改 UI 或核心 workflow 业务逻辑。

## 8. Verification Plan

### Static and focused tests

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- provider registry contract tests
- video execution context immutability tests
- action schema/permission/idempotency tests
- resource reference/version/path validation tests
- pipeline checkpoint isolation/recovery tests

### Build and structural checks

- `pnpm build`
- `pnpm build:check`
- `pnpm madge:circular`
- `pnpm knip`
- `pnpm docs:check`
- `cargo check --workspace`

### Browser checks

- desktop and 390px/360px mobile viewport
- keyboard traversal and visible focus
- loading/empty/error/success/disabled states
- text overflow and horizontal scroll
- reduced motion
- console errors, failed requests, unexpected navigation

### Runtime and external service checks

单元测试和浏览器本地页面不能证明真实供应商调用、Tauri 桌面权限、远程视频轮询或生产部署。真实服务验收需要脱敏凭据、明确授权、可回收测试任务和独立的 authenticated runtime evidence。

## 9. Residual Risks

1. 当前浏览器验收是本地 Web/Vite 路径，不等同于 Tauri 桌面运行时验收。
2. 本次未改变 Provider、资源和 Pipeline 核心架构，因此 F-001 至 F-010 仍属于后续工作。
3. 首页仍使用远程 Unsplash 预览图，网络不可用时会影响视觉完整性；后续应迁移为受控本地静态资产或明确的占位组件。
4. 全局样式仍存在多套主题文件和部分宽泛 transition；本次只修复 focus 规则，未做大规模 token 合并。
5. 当前项目状态为空工程时的 empty path 已验证；真实项目数据、删除失败、远程任务失败和 Tauri 文件权限错误仍需专项验收。
6. “所有后续修复”需要产品确认资源共享范围、权限角色、远程直连/代理模式、成本上限、视频任务保留策略和版本冲突规则，这些在本报告中标为 `assumed`，不能直接视为已定产品决策。

## 10. Decision Checklist

以下决策在 Phase 0 结束前必须确认：

- 供应商调用是直连、后端代理还是桌面端安全代理。
- provider/model 配置是用户级、项目级还是任务级；任务级 context 是否永久冻结。
- 资源是仅当前项目、用户资源库、团队资源库还是可公开共享。
- AI action 哪些默认执行，哪些必须确认，哪些只允许 preview。
- 小说、剧本、分镜和视频 artifact 的版本冲突采用覆盖、分支还是合并。
- 视频远程任务的最长保留时间、轮询上限、下载重试和成本保护。
- 浏览器开发态是否允许保存 API key；若允许，如何显式标记不安全。
