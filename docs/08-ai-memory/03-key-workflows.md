<!-- ae-codex:init managed -->

# 关键工作流

记录需要跨任务复用的稳定流程。

## 模板

- 工作流：
- 使用场景：
- 步骤：
- 验证：
- 已知风险：

## 增加对话模型 Provider

- 使用场景：接入新的聊天模型或统一代理路径。
- 步骤：确认协议和认证 -> 选择 `AIProviderStrategy` 或 OpenAI-compatible strategy -> 注册到 `ProviderRegistry` -> 配置模型和密钥来源 -> 接入 dispatcher/stream -> 添加成功、超时、限流、结构化响应和 fallback 测试。
- 验证：Provider 单元测试、dispatcher fallback 测试、`pnpm build:check`、不使用真实密钥的 mock/contract 测试。
- 风险：不同厂商消息格式、流式事件格式、错误码和异步任务语义不能假设兼容。

## 增加视频生成服务

- 使用场景：接入云端视频生成 API，并把结果纳入分镜或渲染流水线。
- 步骤：确认同步/异步协议 -> 定义提交、查询、取消和下载状态 -> 放入 image-generation provider adapter 或新的 video-generation service -> 映射到资产库/项目状态 -> 接入轮询、取消、重试、进度和错误 UI -> 记录成本和结果元数据。
- 验证：请求构造 contract 测试、异步状态机测试、超时/取消测试、下载校验测试；真实服务验证需单独授权和测试凭据。
- 风险：生成任务通常异步；不能把 HTTP 200 当作视频已生成，也不能把远程 URL 当作永久本地资产。

## Tauri 视频处理

- 使用场景：本地剪辑、预览、缩略图和 FFmpeg 导出。
- 步骤：前端调用 `tauriService` -> Tauri command 校验路径 -> Rust service 执行 FFmpeg -> 返回结果或事件进度。
- 验证：命令参数测试、路径越界测试、FFmpeg 缺失测试、桌面端 smoke test。

## 创作助手对话、技能与角色回填

- 使用场景：用户在角色设定、脚本或分镜打开侧栏助手，澄清后生成可回填草稿。
- 步骤：打开 Sheet -> 可选点选 AE 适配技能 -> SSE 对话（思考过程展示编排步骤）-> 生成候选稿 -> 角色路径自动预览表单 -> 对话内「保存角色」才写入已确认角色；脚本/分镜走填充确认弹窗。项目记忆另点保存。
- 验证：`corepack pnpm test -- src/__tests__/features/creative-assistant src/__tests__/features/character-consistency src/__tests__/pages/parse-character-drafts.test.ts src/__tests__/services/assistant-skills.test.ts`
- 风险：模型可能只聊天不吐 JSON，或把 JSON 包成字符串；顶层外观字段必须合并进 `appearance`，否则身高/体型/特征对不上下拉或文本框。

## 新建工程 AI 灵感与上下文

- 使用场景：用户在新建漫剧工程弹窗中点击“随机灵感”，或创建工程后打开任一创作助手。
- 步骤：读取当前表单标题/概要/画风/画幅 -> feature 适配层调用 `streamConfiguredDialogue` -> 拼接 SSE 文本 -> 去除代码块并解析 `{ name, description }` -> 回填可编辑表单；失败则使用本地样本 -> 创建时由 store 保留 `artStyle` 和 `aspectRatio` -> 后续助手将两项加入项目上下文。
- 验证：`CreateProjectModal` 成功/失败 Jest、`AICreateProjectModal` 请求契约 Jest、项目 store Jest、`pnpm run build:check`。
- 风险：真实服务可能因浏览器 CORS、模型输出不规范或配置错误失败；不能把模型失败当作创建工程失败。

## 服务连接与素材路由

- 使用场景：用户在设置里保存对话、图片、视频三类连接，创作助手和生成入口读取同一份配置。
- 步骤：设置页只收集 URL / Key / 模型 -> `loadServiceConnection` / `loadRemoteVideoGatewaySettings` -> 对话走 configured SSE；图片有 Key 则 OpenAI 兼容 `/images/generations`，否则回退旧 provider；视频启用后走 remote-video-service，并阻断非公网素材。
- 验证：`src/__tests__/services/ai-connection-settings.test.ts`、`configured-generation-routing.test.ts`、`remote-video-service.test.ts`。
- 风险：默认 vendor URL 只是代码占位，不能当成已确认合作；真实生成需单独授权。
