---
type: evidence
status: captured
date: 2026-08-22
source: https://agions.github.io/novella/developer-guide/
---

# 外部开发者文档对照

## 来源

公开入口：<https://agions.github.io/novella/developer-guide/>

本次提取了以下页面：`architecture`、`module-system`、`pipeline-engine`、`ai-providers`、`platform-layer`。

## 文档声明与本地证据

| 文档主题    | 外部文档声明                            | 本地代码证据                                                                           | 状态                                   |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| 总体架构    | pnpm + Cargo + React/Tauri + Auto-Swarm | `package.json`、`Cargo.toml`、`src`、`src-tauri`、`crates`                             | 已观察；Auto-Swarm 运行态未验证        |
| 模块系统    | 分层边界和命名规则                      | `eslint.config.js`、`dependency-cruiser.config.js`、目录结构                           | 已观察                                 |
| Pipeline    | step、重试、质量门、checkpoint          | `src/core/pipeline`、`src/core/services/pipeline`                                      | 已观察；外部示例与本地版本存在演进差异 |
| AI Provider | strategy、registry、fallback chain      | `src/core/ai/providers`、`src/core/services/ai/text`                                   | 已观察；真实 Provider API 未验证       |
| 平台层      | Web/Tauri 双模式、FFmpeg fallback       | `src/infrastructure/tauri-bridge`、`src-tauri/src/commands/video.rs`、`@ffmpeg/*` 依赖 | 已观察；桌面/Web 运行未验证            |

## 需要注意的差异

1. 外部文档以产品/目标架构语言描述 `MasterDirectorAgent`、`ProjectBlackboard` 和多个 Agent 角色；本次静态扫描未把这些名称当作本地实现事实，后续需用符号和运行调用链逐项确认。
2. 外部文档示例里的 Pipeline step 列表、质量阈值和 API 类型是说明性契约；本地 `src/core/pipeline/pipeline-types.ts`、step 实现和测试才是当前分支的实现依据。
3. 外部文档列出模型和供应商名称，但供应商 endpoint、密钥策略、返回格式和视频任务状态必须以具体 provider 实现和目标厂商官方文档核实。
4. 外部文档描述 FFmpeg 原生与 WASM 双模式；当前本地代码同时存在 Tauri/Rust FFmpeg 路径和 `@ffmpeg/ffmpeg` 依赖，但本次没有运行验证 fallback。

## 后续使用规则

- 外部文档用于理解设计意图和术语，不替代本地源代码、测试或实际运行证据。
- 若外部文档与代码冲突，在 `docs/08-ai-memory/05-decision-log.md` 记录冲突和选择，不静默改写基线。
- 新增对话或视频 API 时，必须补充目标服务官方契约、认证、超时/重试、异步状态和验证证据。
