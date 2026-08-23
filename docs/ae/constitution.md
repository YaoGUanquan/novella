---
type: constitution
status: current
date: 2026-08-23
---

# Novella AE 工程宪章

## Purpose

本文件补充 `AGENTS.md` 中可由 AE 计划、实现和审查直接检查的长期原则。冲突时以系统/用户指令、最近的 `AGENTS.md` 和当前源码测试为准。

## Scope

适用于 Novella 的 feature、core service、React 集成、异步 Agent/Provider 工作流及其 AE 交付证据。

## Principles

### P-001 分离领域编排与展示状态

- 规则：`core` Agent 负责领域命令、适配器和事件；feature 纯 reducer 负责确定性的展示状态；React 组件负责浏览器 API、refs、取消、网络和持久化副作用。
- 理由：避免 UI 状态反向污染 core，同时消除多个 setter 对同一异步终态的竞争。
- 审查：检查 core 是否导入 React/feature，reducer 是否读取存储或网络，组件是否绕过 reducer 修改受管状态。
- 违规示例：在 Agent 内保存弹窗状态；在 reducer 中调用 `localStorage`；完成一次 turn 时分别设置消息、错误和 generating。

### P-002 异步终态必须可抗陈旧事件

- 规则：流式完成、失败和取消必须绑定稳定 turn ID；不属于当前活动 turn 的终态不得清除或覆盖较新的 turn。
- 理由：重试、取消和快速切换项目会产生乱序事件。
- 审查：必须存在 stale-turn 单测，并确认 terminal action 原子更新消息、错误和活动状态。
- 违规示例：无 ID 的 `setGenerating(false)`；旧请求 finally 清空新请求的 streaming ID。

### P-003 持久化与确认边界不可由模型输出绕过

- 规则：候选稿、项目记忆和工程写入保持独立；只有明确用户动作和成功的 adapter 结果才能显示保存成功。
- 理由：保护用户编辑和已确认项目数据。
- 审查：验证候选解析、表单回填、记忆保存和工程保存的调用链与测试相互独立。

### P-004 交付声明必须有分层证据

- 规则：至少执行与改动匹配的类型/静态检查、聚焦测试和构建；UI 交互变更在可运行时必须浏览器验收。真实 Provider、Tauri IPC 或外部服务未执行时必须标记未验证。
- 理由：静态通过不能替代运行时或真实服务证据。
- 审查：交付记录必须列出实际命令、结果、浏览器信号、未验证边界和 gate proof。

### P-005 生成媒体必须转化为受控项目资产

- 规则：桌面端生成图片不得把供应商临时 URL、Data URL 或 Blob URL作为永久项目引用；必须落盘到项目资产根，并只持久化相对路径。读取时必须经限定目录、大小和图片魔数校验的 IPC。
- 理由：供应商地址会过期，WebView 可能受 CORS/协议限制，宽泛文件协议会扩大本地文件读取面。
- 审查：确认写入路径固定为 `<workingDir>/<projectId>/assets/images/`，项目 JSON 只含 `assets/images/...`，会话恢复重新生成预览 URL。

### P-006 项目身份与异步水合必须保持一致

- 规则：编辑既有项目时保存身份优先取路由 `projectId`；加载器不得跨项目复用 store 快照，异步磁盘水合不得用陈旧快照覆盖本地已修改角色或资产。
- 理由：随机 UUID、跨项目 fallback 和只比较数组长度会让生成成功的资产写入错误项目或在随后水合时消失。
- 审查：必须覆盖项目 ID 选择、跨项目 fallback 拒绝、角色内容级 merge/hydration 和旧快照保护测试。

## Required Gates

- reducer/异步状态变更：聚焦状态转换测试、完整 feature 测试、TypeScript、ESLint、生产构建、`git diff --check`。
- React 用户流变更：在现有 route 上检查目标入口、关键终态和浏览器 console。
- Provider/Tauri 相关结论：只有真实运行或明确 contract 证据才能标为 verified。
- 生成图片资产：Rust 路径/格式测试、TS 会话与保存/加载竞态测试、Tauri WebView 角色卡和助手消息可见性。

## Artifact Ownership

- 项目强制约束：`AGENTS.md`。
- AE 治理原则：`docs/ae/constitution.md`。
- 需求/设计/计划/门禁：`docs/ae/{prds,designs,plans,gates}`。
- 稳定跨会话知识：`docs/08-ai-memory`。
- 人工架构图与扫描说明：`docs/03-analysis`；AE 图谱入口与快照：`docs/ae/graphs`。

## Amendment Process

新增或修改原则时必须记录日期、原因、受影响文件、迁移动作和验证方式；不得用宪章覆盖直接用户决策或现有源码事实。

## Amendments

### 2026-08-23：加入 feature reducer 与异步陈旧事件约束

- 来源：创作助手 UI reducer 下沉完成后的实现与审查证据。
- 变更：新增 P-001、P-002，并把确认边界和分层验证固化为 P-003、P-004。
- 影响：后续 Agent/UI 重构、AE 计划、代码审查和交付 gate。
- 迁移动作：创作助手已迁移；其他 feature 只在出现同类多字段异步状态时采用，不要求机械改写现有简单局部 state。

### 2026-08-23：加入生成资产与项目身份约束

- 来源：Grok SSE/Base64 图片接入、项目图片落盘和项目加载竞态修复。
- 变更：新增 P-005、P-006，固定临时媒体到项目资产的转换边界，以及路由项目身份和异步水合一致性。
- 影响：图片 Provider、Tauri 文件 IPC、角色参考图、助手会话、项目保存与加载。
- 迁移动作：现有角色图片链路已迁移；其他生成媒体接入时复用相同的 canonical persisted value / derived preview 分离原则。

## Sync Impact

- `AGENTS.md` 增加 reducer/副作用/turn ID 规则。
- 创作助手 PRD、设计、计划、开发者文档、AI 记忆和架构图谱同步到已实现状态。
- 图片资产 PRD、计划、经验、README、开发者文档、AI 记忆和架构图谱同步到已实现状态。
