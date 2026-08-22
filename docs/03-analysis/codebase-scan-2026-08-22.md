---
type: analysis
status: baseline
date: 2026-08-22
topic: novella-static-codebase-scan
scope: user-owned fork at local develop branch
---

# Novella 静态代码扫描基线

## 授权与范围

- 对象：`D:/codes/ph-novella`，用户已拥有并正在开发的 fork 工作区。
- 分支：`develop`。
- 方法：Git 文件清单、配置读取、源码符号/调用点检索、公开开发者文档提取。
- 类型：授权的防御性静态分析；未执行项目二进制、未抓包、未重放外部请求、未使用密钥。

## 文件基线

截至扫描时 Git 跟踪文件约 898 个：TypeScript 417、TSX 216、Rust 36、Markdown 28、JSON 14、TOML 9，另有 CSS/Less/JS/YAML/图片等资源。统计来源：`git ls-files` 和扩展名分组命令。

关键目录：

- `src/`：React 应用、领域服务、AI、Pipeline、基础设施。
- `packages/*`：workspace UI、core、AI engine、storyboard、audio、render pipeline 包。
- `src-tauri/`：Tauri 命令、文件/视频/设置服务、路径验证。
- `crates/*`：Rust core、ai、media、ipc、plugin、updater。
- `docs/`：VitePress 文档、开发者指南、用户和部署文档。

## 运行与构建配置

- Node：`package.json`，ESM，pnpm workspace。
- TypeScript：`tsconfig.json`，路径别名 `@/*` 和 `@novella/*`，当前 `strict: false`。
- Vite：`vite.config.ts`，Web 开发默认 `127.0.0.1:1420`，Tauri 模块 external，FFmpeg/vendor 分包。
- Rust：根 `Cargo.toml` 定义 workspace；`src-tauri/Cargo.toml` 连接 Tauri 与本地 crates。
- 质量脚本：`pnpm check`、`pnpm test`、`pnpm test:e2e`、madge、knip、jscpd。

## 核心调用链

### 对话模型

`UI/feature -> core/services/ai/text -> ai-call-dispatcher -> provider strategy -> HTTP endpoint`

已观察的 Provider strategy：OpenAI、OpenAI-compatible、Anthropic、Google、Baidu、Alibaba、Zhipu、Mock；实际注册以 `src/core/ai/providers/provider-registry.ts` 为准。公共类型位于 `src/core/ai/types/ai-core.ts` 与 `src/core/ai/providers/ai-provider-interface.ts`。

### 图像/视频生成

`feature -> image-generation-service -> image-generation adapter/provider -> remote API -> asset/result mapping`

当前适配器目录包含 `kling.ts`、`seedance.ts`、`seedream.ts`、`vidu.ts`。这些文件的具体协议、同步/异步语义和鉴权字段必须逐个以实现和厂商文档核实。

### 本地视频处理

`tauriService -> invoke(command) -> src-tauri/src/commands/video.rs -> path_validator -> services/video -> FFmpeg`

已注册命令包括视频分析、关键帧、缩略图、剪辑、预览、FFmpeg 检查和临时文件清理。文件和视频路径边界由 `path_validator.rs` 控制。

### 流水线

`PipelineStep -> PipelineEngine -> retry/progress/checkpoint/quality gate -> output`

核心类型和入口在 `src/core/pipeline`；旧的 `src/core/services/pipeline/pipeline-types.ts` 标记为兼容层，不能作为新功能的首选入口。

## 外部文档对照结论

- 外部开发者指南确认了 pnpm + Cargo、React/Tauri/Rust、Provider strategy、Pipeline、Tauri 双模式和 FFmpeg 双模式方向。
- 本地代码确实存在对应目录和实现，但外部文档中的 Auto-Swarm 角色、具体模型清单、部分 crate/命令描述不能仅凭文档视为运行时事实。
- 对照详情：`docs/03-analysis/external-developer-docs-2026-08-22.md`。

## 安全观察

- 观察到 Provider/API key、Bearer token 和 secure storage/localStorage fallback 相关代码；报告不记录任何实际密钥或 token。
- Tauri 文件命令在视频和项目文件入口使用路径校验，这是新增本地 I/O 或下载逻辑必须复用的安全边界。
- 新增远程接口前必须明确 API key 存储、请求超时、重试、日志脱敏、远程 URL 下载和本地资产留存策略。

## 已验证 / 推断 / 未验证

### 已观察

- 代码目录、构建配置、Provider/adapter、Pipeline、Tauri command 和 Rust workspace 均存在。
- `ae-init` 已在 `develop` 分支创建 AE 工作流目录和记忆库骨架。

### 高置信推断

- 新的聊天 Provider 应复用 strategy/registry/dispatcher；新的云端视频服务应复用 image-generation adapter 或建立平行的 video-generation service。
- Tauri 只适合本地文件/FFmpeg/桌面能力；第三方云 API 不应直接塞入 Rust 视频处理命令，除非后续明确选择后端代理架构。

### 未验证

- 未执行 `pnpm install`、TypeScript、ESLint、Jest、Playwright、Cargo check 或 Tauri 启动。
- 未验证任一真实 AI/视频 API 的 endpoint、认证、限流、异步任务、下载和计费行为。
- 未运行依赖图工具，因此图谱是基于配置和源码入口的静态关系图，不是完整 import 图。

## 建议的下一步输入

在实现前需要确认：首批对话模型 Provider、首批视频生成服务、直连还是统一后端代理、密钥保存位置、是否需要异步任务持久化，以及验收使用 mock contract 还是测试账号。
