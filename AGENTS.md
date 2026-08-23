<!-- ae-codex:init managed -->

# Novella 开发规范

本文档是当前仓库的项目级开发契约。以当前分支源代码、配置和测试为准；`docs/developer-guide/` 与公开开发者站点用于补充设计意图，不能替代本地实现证据。发现冲突时，记录在 `docs/08-ai-memory/05-decision-log.md`，不要静默按文档改写行为。

## 项目与技术栈

- 项目：Novella / Novella AI，面向 AI 漫剧创作的桌面应用。
- 前端：React 19、TypeScript、Vite、Zustand、Radix UI、Tailwind CSS、Framer Motion。
- 桌面端：Tauri v2 + Rust 2021；本地媒体处理使用 FFmpeg，浏览器路径可使用 FFmpeg WASM。
- 包管理：pnpm workspace；Rust 使用 Cargo workspace。
- 测试：Jest、Testing Library、Playwright。
- 当前开发分支：`develop`。开始工作前必须确认工作区状态，不覆盖用户已有变更。

## 证据优先级

当不同来源不一致时，按以下顺序判断：

1. 当前源码、类型、测试和运行配置。
2. `package.json`、`tsconfig.json`、`vite.config.ts`、ESLint/dependency-cruiser 配置和 Cargo manifests。
3. `docs/developer-guide/`、`docs/user-guide/` 与 `CONTRIBUTING.md`。
4. 公开开发者文档 <https://agions.github.io/novella/developer-guide/>。

以下内容在没有本地符号、调用链或运行验证前只能视为设计意图：Auto-Swarm 角色、具体模型能力、供应商支持列表、性能数字、GPU 加速效果和 FFmpeg fallback 行为。

## 目录职责

```text
src/main.tsx                         React 入口
src/app/                             Providers、路由和应用编排
src/pages/                           页面级容器
src/components/                      跨页面业务/媒体 UI
src/features/                        垂直业务切片
src/shared/                          UI 基元、stores、types、utils
src/core/ai/                         AI 类型、Provider strategy、registry
src/core/services/                   AI/音频/视频/项目/Pipeline 领域服务
src/core/pipeline/                   PipelineEngine、step、checkpoint、质量门
src/infrastructure/tauri-bridge/    Tauri IPC、事件和平台适配
packages/*/                          pnpm workspace 子包
src-tauri/src/commands/              Tauri 命令路由和输入校验入口
src-tauri/src/services/              Rust 文件、视频、FFmpeg、配置业务逻辑
src-tauri/src/models/                Rust 数据模型
src-tauri/src/utils/                 路径校验、ID、FFmpeg 辅助函数
crates/*                             Rust workspace 的 core、ai、media、ipc、plugin、updater
docs/                                VitePress 文档、分析报告和 AE 工作流产物
```

## 依赖方向

允许的总体方向：

```text
app/pages -> components/features -> core/services/core -> shared/types
frontend -> infrastructure/tauri-bridge -> Tauri commands -> Rust services -> crates
```

禁止以下依赖：

- `src/core/**` 导入 `src/app/**`、`src/pages/**` 或 UI 组件。
- `src/core/services/**` 导入页面或组件。
- `src/shared/**` 导入 `core`、`features`、`app`、`pages` 或 `infrastructure`。
- `src/features/**` 直接导入另一个 feature 的内部实现；跨 feature 协作通过 `core/services` 或 `shared`。
- 任何模块直接调用第三方 AI/视频 API 绕过 Provider、service 或 adapter 边界。
- barrel `index.ts` 自己导出并从同一 barrel 反向导入，造成循环依赖。

依赖边界由 `eslint.config.js` 和 `dependency-cruiser.config.js` 守护。新增跨层引用时，先说明为什么现有边界不足，再同步更新规则和测试。

## TypeScript 与 React 规范

- 使用 TypeScript；新代码应保持可推导的具体类型，避免扩大 `any`、`unknown` 和非空断言的使用范围。
- `tsconfig.json` 当前 `strict: false`，不要把“编译通过”误认为类型安全；公共接口、外部响应和持久化数据仍需显式校验。
- React 使用函数式组件和 Hooks；`core/**` 不得引入 React Hooks 或 UI 状态。
- Zustand store 放在 `src/shared/stores`，按领域拆分；页面临时状态使用局部 state 或 Context selector。
- 同一 feature 内由异步事件共同驱动的消息、活动轮次、错误、候选稿、记忆和重置状态，应优先放入 feature 自有的纯 reducer；不要把展示状态塞进 `core` Agent，也不要用多个独立 setter 复制同一终态转换。
- reducer 必须保持同步、不可变和无副作用。网络、持久化、`AbortController`、DOM、滚动、文件选择器与弹窗仍由 React 集成层管理；异步终态必须携带稳定 turn ID，旧轮次不得结束或覆盖较新的活动轮次。
- `index.ts` 只做导出，不放业务逻辑。
- 使用仓库已有的 `cn()`、logger、`ServiceError`、`generate*Id` 等工具，不重复创建平行实现。
- 目录和普通 `.ts` 文件使用 `kebab-case`；React 组件 `.tsx` 使用 `PascalCase`，`index.tsx` 除外；类型/类/接口使用 `PascalCase`；变量/函数使用 `camelCase`；常量和枚举成员使用 `UPPER_CASE`。

## AI Provider 与远程服务

对话模型调用链应保持：

```text
UI/feature -> core/services/ai/text -> AICallDispatcher -> ProviderRegistry/strategy -> endpoint
```

- 新增聊天 Provider 优先实现 `AIProviderStrategy` 或复用 `OpenAICompatibleStrategy`，然后注册到 `ProviderRegistry`。
- 不从 React 组件直接写 `fetch`/`axios` 调用第三方模型。
- 统一处理请求超时、限流、认证失败、结构化响应错误、流式响应、重试和 fallback；不要以 HTTP 200 推断业务成功。
- Provider 配置必须明确 provider、model、endpoint、认证字段、超时、重试策略、流式协议和错误映射。
- API key 只能来自安全配置路径或明确的开发环境变量；不得写入源码、日志、测试快照、提交信息或文档。不要打印完整请求头和响应中的 token。
- 未确认供应商、请求协议和“直连/后端代理”模式前，不新增具体 endpoint 或模型名称。

图像/视频生成应保持：

```text
feature -> image-generation-service -> provider adapter -> remote task -> asset/project state
```

- 复用 `src/core/services/ai/image/image-generation/` 的 types、adapter、provider 和错误处理模式。
- 桌面端生成图片必须先解析供应商 JSON/SSE/Data URL 结果，再通过受校验的 Tauri 命令落盘到 `<workingDir>/<projectId>/assets/images/`；项目 JSON 只保存 `assets/images/...` 相对路径，不持久化供应商临时 URL、Data URL 或 Blob URL。
- 本地图片预览必须通过限定项目资产根的 IPC 读取；校验工作目录、项目 ID、固定 `assets/images/` 前缀、文件大小和图片魔数。不得为任意工作目录开放宽泛 asset protocol。
- 对异步视频任务明确提交、查询、取消、轮询、超时、下载、失败和幂等行为。
- 远程 URL 不是永久本地资产；下载时校验响应、文件类型、大小、路径和清理策略。
- 真实服务测试需要脱敏测试凭据和明确授权；默认使用 mock/contract 测试。

## Pipeline 规范

- 新增流水线能力使用 `src/core/pipeline` 的类型和入口；`src/core/services/pipeline/pipeline-types.ts` 是兼容层，新代码不要依赖它。
- 每个 step 明确 `stepId`、依赖、输入/输出、进度、错误、重试策略和质量门结果。
- 通过 `PipelineEngine` 统一处理顺序、状态、checkpoint、恢复、取消和事件回调；不要在 UI 中复制编排逻辑。
- 新 step 必须补充正常、边界、失败、重试和 checkpoint 恢复测试；质量门阈值必须有来源或明确标注为产品决策。
- Pipeline 输出应保持可序列化，避免把函数、窗口对象、File 对象或秘密信息写入 checkpoint。

## Tauri、Rust 与文件安全

- Rust 是桌面能力和本地媒体处理的第一公民；TS 负责 UI、状态和类型安全的桥接封装。
- Tauri command 只做参数解析、权限/路径校验和服务路由；业务逻辑放到 `src-tauri/src/services` 或 `crates/*`。
- Command 对外返回 `Result<T, String>` 或当前项目已采用的明确可序列化错误契约；错误不得静默吞掉。
- 文件入口必须复用 `validate_input_path`、`validate_output_path`、`validate_temp_path` 和允许目录白名单；禁止拼接未经校验的用户路径执行 FFmpeg 或删除文件。
- FFmpeg 参数使用结构化构造，避免把整段用户输入拼成 shell 命令；输出、临时文件和清理路径必须可追踪。
- 新增 IPC command 时同步更新 Rust 注册、TS bridge、参数类型、权限配置和测试。
- Rust crate 之间保持 Cargo workspace 的职责边界；不要在 `src-tauri` 复制 `crates/core`、`crates/ai` 或 `crates/media` 已有逻辑。

## 错误、日志与数据

- 异步函数必须显式返回 `Promise<T>` 并处理失败；禁止空 catch、静默 fallback 或只向用户显示“失败”。
- 前端领域服务优先使用 `ServiceError` 和统一错误码；边界层把底层错误映射为可观察的用户状态。
- 日志记录 request id、provider、step、耗时和错误类别时必须脱敏；不记录 API key、Bearer token、完整 prompt 中的敏感数据或远程凭据。
- 持久化数据、checkpoint 和资产元数据需要版本兼容策略；变更字段时补迁移/兼容读取测试。
- 编辑既有项目时，路由 `projectId` 是保存身份的首要来源；不得因内存项目缺少 ID 而生成新 UUID。加载器不得采用 ID 与路由不匹配的 `currentProject`，异步磁盘快照也不得覆盖本地已修改的角色或资产引用。
- 助手会话持久化图片消息时只保存可恢复的相对路径和必要元数据，清除派生 `previewUrl`；重载后再经受控资产读取恢复预览。

## 文档与 AI 记忆

- 修改行为前阅读相关 `docs/developer-guide`、领域文档和现有测试。
- AE 需求、设计、计划、审查和证据放在 `docs/ae`；过程记录放在 `docs/00-process/active`，完成后归档；长期稳定知识放在 `docs/08-ai-memory`。
- 代码扫描、外部文档对照和架构图谱位于 `docs/03-analysis`，其中必须区分“已观察”“高置信推断”和“未验证”。
- 文档、JSON、YAML、SQL 和生成文本统一使用 UTF-8，优先无 BOM。PowerShell 中文显示异常时，先用显式 UTF-8 读取，不要批量重编码。
- 不把一次性命令输出、真实密钥、个人数据、未确认猜测或未经授权的外部响应写入记忆库。

## 开发与验证命令

首次运行：

```bash
pnpm install
pnpm dev                 # Web/Vite 开发模式
pnpm tauri dev           # Tauri 桌面模式
```

提交前按变更范围执行，涉及跨模块或外部边界时扩大验证：

```bash
pnpm check               # tsc --noEmit + lint
pnpm test                # Jest
pnpm test:e2e            # Playwright
pnpm build               # Vite 生产构建
pnpm build:check         # 类型检查 + 构建
pnpm docs:check          # 文档检查
pnpm docs:check-links    # 文档链接检查
pnpm madge:circular      # 循环依赖
pnpm knip                # 未使用导出/依赖
pnpm quality             # madge + knip + jscpd
cargo check --workspace  # Rust workspace（需要 Rust 工具链）
```

未执行的命令必须在交付说明中写明原因；不要把静态检查结果表述为运行时、浏览器或真实服务验收。

## Git 与提交

- 开始工作前运行 `git status --short --branch`，保留用户已有改动。
- 默认在 `develop` 开发；不要未经明确要求执行 reset、checkout 覆盖、rebase、删除分支、提交、推送或合并。
- 提交消息遵循 Conventional Commits：`type(scope): subject`，如 `feat(ai): add provider adapter`、`fix(video): validate output path`、`docs(architecture): update boundary map`。
- 提交前检查 `git diff --check`、测试结果、文档/配置同步和敏感信息泄漏。

## 交付报告最低要求

交付时说明：

- 修改了哪些文件和行为。
- 实际运行了哪些命令及结果。
- 哪些边界仍未验证，包含环境、凭据、桌面运行或外部服务原因。
- 是否有数据库、远程服务、文件系统或 Git 操作；不要声称未执行的验证已通过。
