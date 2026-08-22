<!-- ae-codex:init managed -->

# 项目上下文

## 项目

- 名称：novella
- 描述：Novella (Novella AI) - AI 漫剧创作平台。采用 Tauri v2 + React 19 + Rust + Packages Monorepo 模块化架构，将小说一键转化为专业级漫剧视频。

## 检测信号

- Node.js package.json
- package type: module
- Rust Cargo project
- README.md
- scripts directory
- source directory
- docs directory

## 重要路径

- Cargo.toml
- README.md
- scripts
- src
- docs

## 可用脚本

- dev: vite
- build: vite build
- build:check: tsc && vite build
- lint: pnpm exec eslint 'src/\*_/_.{ts,tsx}' --quiet
- lint:fix: pnpm exec eslint 'src/\*_/_.{ts,tsx}' --fix
- prepare: husky install
- check: pnpm exec tsc --noEmit && pnpm run lint
- preview: vite preview
- build:desktop: bash scripts/build-desktop.sh
- tauri: tauri
- docs: pnpm run docs:api && ts-node scripts/generate-docs.ts
- docs:api: typedoc --out docs/api src/
- docs:check: ts-node scripts/check-docs.ts
- evaluate:regression: ts-node scripts/run-evaluation.ts
- test: jest
- test:fast: jest --coverage --maxWorkers=4
- test:watch: jest --watch
- test:coverage: jest --coverage
- test:changed: jest --onlyChanged
- test:ci: pnpm test -- --runInBand --coverage && pnpm exec vite build

## 身份与目标

- 当前开发分支：`develop`
- 目标：桌面端 AI 漫剧创作平台，覆盖剧本导入、AI 分析、角色/分镜、图像或视频素材生成、音频和视频合成。
- 授权范围：本地工作区代码、其 Git 历史和用户指定的公开开发者文档；本次仅做静态、只读分析。

## 技术栈证据

- 前端：React 19、TypeScript、Vite、Zustand、Radix UI/Tailwind。
- 桌面端：Tauri v2、Rust 2021、FFmpeg。
- 包管理：pnpm workspace；Rust 使用 Cargo workspace。
- 测试：Jest/Testing Library、Playwright；静态质量脚本包含 TypeScript、ESLint、madge、knip 和 jscpd。
- 证据：`package.json`、`pnpm-workspace.yaml`、`Cargo.toml`、`src-tauri/Cargo.toml`、`tsconfig.json`。

## 关键入口

- React 入口：`src/main.tsx`
- 前端服务入口：`src/core/services/index.ts`
- AI Provider：`src/core/ai/providers/`
- AI 文本服务：`src/core/services/ai/text/`
- AI 图像/视频适配器：`src/core/services/ai/image/image-generation/`
- Pipeline：`src/core/pipeline/`
- Tauri JS 桥：`src/infrastructure/tauri-bridge/commands.ts`
- 关键入口补充：创作助手 `src/features/creative-assistant/`；对话传输 `src-tauri/src/commands/dialogue.rs`；连接配置 `src/core/config/ai-connection-settings.ts`。
- Rust workspace crates：`crates/core`、`crates/ai`、`crates/media`、`crates/ipc`、`crates/plugin`、`crates/updater`。

## 运行前提

- 当前工作区已具备依赖，可执行前端 focused Jest、Vite 构建、`cargo check --workspace` 和 `pnpm tauri dev` 启动；真实供应商 SSE 仍不作为自动验证前提。
- Web 开发命令：`pnpm dev`；桌面开发命令：`pnpm tauri dev`。
- 本轮已验证：项目 store、创建弹窗/AI 适配器测试，以及 `pnpm run build:check`。
- 本轮未验证：真实对话/视频 API、浏览器交互截图和 FFmpeg 运行。Rust/Tauri 桌面进程已在 2026-08-22 通过 `cargo check --workspace` 与 `pnpm tauri dev` 启动，但真实密钥 SSE 仍待用户验收。
