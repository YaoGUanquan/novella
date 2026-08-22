---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-agent-thinking
origin: docs/ae/prds/creative-assistant-agent-thinking-2026-08-22.md
originFingerprint: creative-assistant-agent-thinking-2026-08-22
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 创作助手智能体思考过程

## Source

- `docs/ae/prds/creative-assistant-agent-thinking-2026-08-22.md`
- 文档评审：`docs/ae/reviews/creative-assistant-agent-thinking-2026-08-22.md`（COMMENT，无阻断）

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

把创作助手用户可见的「思考过程」从供应商推理分片改为本轮智能体编排时间线；空正文保留步骤和说明；发送后清除技能标签（代码已有，测试对齐步骤文案）。不新增 Agent 运行时，不执行 SKILL.md。

## Readiness

- Goal: 发送后能看到智能体步骤；完成后可折叠；无可见正文时不空白消失。
- Acceptance criteria: PRD R1-R8, NFR1-NFR2, must-have R1/R5。
- Non-goals: 编码 Agent、function calling、让模型编造步骤、展示 reasoning_content。
- Affected areas: 创作助手类型、会话持久化、Sheet 流式编排与时间线 UI。
- Validation surface: 聚焦 Jest；浏览器验收若工具可用则做，否则 unverified。
- Open questions: PRD Q1-Q3 由下列 ADR 关闭。

## Validation Evidence

| Tier                        | Expected signal                                                           | Preconditions                | Status         | Bounded claim        |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------- | -------------- | -------------------- |
| Focused automated test      | 步骤出现在正文前；thinking 分片不进思考过程；空正文有说明；发送后芯片消失 | Jest                         | unverified     | 不证明真实模型       |
| Static inspection           | 助手无新增第三方 fetch                                                    | 源码                         | unverified     | 仅静态边界           |
| Browser acceptance          | 发送后时间线推进                                                          | 本地 Vite/Tauri + 浏览器工具 | unverified     | 工具不可用则保持缺口 |
| Authenticated service smoke | 真实模型正文                                                              | 用户密钥                     | not-applicable | R5 兜底空正文        |

## Contract Value Classification

- Canonical persisted value: `novella_creative_assistant_session_v1:{projectId}` 中的消息正文与紧凑 `agentSteps`。
- Derived or ephemeral: 进行中步骤状态、供应商 thinking 分片。
- Caller-controlled input: 发送瞬间的技能 ID 快照、模型正文。
- Source precedence: 智能体步骤由本地编排写入；模型文本不得覆盖步骤含义。
- Trust boundary: 步骤 label 由注册表中文名和固定编排文案生成，不采用模型输出作为步骤名。

## Evidence Matrix

| Acceptance criterion       | Applicable tier        | Expected signal and bounded claim             | Preconditions / owner | Status     | Recovery or rollback signal    |
| -------------------------- | ---------------------- | --------------------------------------------- | --------------------- | ---------- | ------------------------------ |
| R1/R4 思考过程不是模型推理 | Focused automated test | 注入 thinking 文本不出现在「思考过程」下      | Jest                  | unverified | 失败则隐藏思考 UI              |
| R5 空正文不消失            | Focused automated test | 空流结束仍有步骤 + 说明，无「AI 正在输入...」 | Jest                  | unverified | 失败则恢复说明文案             |
| R6 发送清芯片              | Focused automated test | 移除技能按钮消失，步骤含技能名                | Jest                  | unverified | 失败则保留发送时 setState 顺序 |
| NFR1 不持久化推理全文      | Focused automated test | session JSON 无 thinking 全文                 | Jest                  | unverified | 失败则从 save 映射删除该字段   |

## Assumptions

- 第一期步骤映射现有 `runStream` 编排即满足「像 Cursor」。
- R6 的芯片清除已在 Sheet 发送路径落地，本计划只需把断言从「技能 · 已调用」对齐到步骤文案。
- 供应商 thinking 事件仍可被传输层解析，但 UI 丢弃。

## Alternatives Considered

- Recommended: 在 `CreativeAssistantMessage` 上增加 `agentSteps`，由 `runStream` 按编排推进；`<details>` 在该条消息生成中展开、完成后折叠。
- Alternative: 独立时间线 store。Rejected because 一步对话消息已足够，避免跨层状态。
- Alternative: 继续渲染 `message.thinking`。Rejected because PRD D1。
- Alternative: 新增工具循环。Rejected because PRD 非目标。

## Decision Drivers

- Driver 1: 用户可见思考必须来自智能体动作。
- Driver 2: 最小改动，不把 Sheet 做成 Agent 运行时。
- Driver 3: 空/失败态必须可读。

## Decisions

### ADR-1 - 步骤存在消息上并紧凑持久化

- Decision: `agentSteps: { id, label, status }[]` 存在助手消息上；会话保存 label/status，不保存 thinking。
- Drivers: R3, NFR1, Q1/Q2。
- Alternatives: 仅内存、独立实体。
- Why chosen: 重开面板仍能看到本轮做了什么；字段少。
- Consequences: 旧会话无步骤则不渲染思考过程。
- Follow-ups: 无。

### ADR-2 - 对用户隐藏供应商 thinking

- Decision: `kind: thinking` 不写入可见思考过程，也不再渲染 `message.thinking`。
- Drivers: R4, Q3。
- Alternatives: 开发态二级折叠。
- Why chosen: 避免两套「思考」并存。
- Consequences: 旧测试「先想动机」必须改为断言不出现。
- Follow-ups: 无。

### ADR-3 - 点选技能一步列出，不提前「已调用」

- Decision: 用户点选技能在时间线中显示为一条「应用技能：甲、乙」，本地瞬间完成；不再在流开始时把 `skillCalls` 标成 accepted。
- Drivers: R2 评审 P3、用户看到的空白已调用卡片。
- Alternatives: 每个技能一条 running 步骤。
- Why chosen: 这些技能不是串行工具。
- Consequences: 模型提议的写技能仍可在解析后进入既有 `skillCalls` 以触发候选稿跟进。
- Follow-ups: 无。

## Risks

- 步骤文案若写成「已调用工具」，用户会以为执行了 SKILL.md。
- `runStream` 在芯片清除后若仍读 hook 里的 `selectedSkillIds`，步骤会丢技能名。必须用 `options.initialSkillIds` 快照。
- 初始化开场白也会出现思考过程；这符合 D3。

## Pre-Mortem

- Failure scenario 1: 思考过程仍显示模型推理。Mitigation: 测试断言 thinking 文本不在 details 内。
- Failure scenario 2: 空流结束后又显示「AI 正在输入...」。Mitigation: 仅当该条消息仍在 streaming 且无步骤时才用脉冲文案。
- Failure scenario 3: 发送清芯片后步骤不含技能。Mitigation: 步骤构建只用 initialSkillIds。
- Mitigations: 上列测试。

## Global Constraints

- 不修改对话传输协议、不新增供应商参数。
- 不读取或执行 SKILL.md。
- 写表单/记忆仍需确认。
- 不提交 Git，除非用户明确要求。

## Implementation Units

### U1 - 步骤类型与会话持久化

- Goal: 消息可携带紧凑智能体步骤，读写会话时不含 thinking 全文。
- Requirements covered: NFR1, R3 persist
- Acceptance criteria covered: 会话 JSON 可恢复 id/label/status；无 thinking。
- Depends on: none
- Files: `src/features/creative-assistant/types.ts`, `src/features/creative-assistant/creative-assistant-session.ts`, `src/features/creative-assistant/agent-timeline.ts`
- Forbidden files: `src/core/**`, `src-tauri/**`, `src/pages/**`
- Approach: 新增 `CreativeAssistantAgentStep`；session save/load 映射 `agentSteps`；timeline 辅助函数生成/更新固定步骤 id：`start`、`skills`、`model`、`assemble`，失败时把当前 running 标 `failed`。
- Tests: session 往返或 Sheet 重开断言步骤仍在；thinking 不进 localStorage。
- Validation: `corepack pnpm test -- src/__tests__/features/creative-assistant/`
- Rollback signals: 加载旧会话仍只靠 content。
- Deferred to implementation: 步骤 id 字符串常量。

### U2 - runStream 推进步骤并改 UI

- Goal: 生成中展示展开的思考过程；完成后折叠；隐藏模型 thinking；空/停止/失败有说明；技能步骤用发送快照。
- Requirements covered: R1, R2, R3, R4, R5, R7, R8
- Acceptance criteria covered: 正文前有步骤；无点选则无应用技能步；thinking 不展示；空正文说明；无确认不写表单。
- Depends on: U1
- Files: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`
- Forbidden files: `src/core/services/ai/assistant-skills/**`（ besides 只读 get/label ）
- Approach: `runStream` 用 `initialSkillIds` 构建步骤；忽略 thinking 事件；streaming 中 `<details open>`；`generating===false` 且无正文时显示「本轮没有生成可见回复。」或停止/失败说明；脉冲「AI 正在输入...」不再作为有步骤时的主状态。
- Tests: 见 U3
- Validation: 同 U1 测试文件
- Rollback signals: 还原 details 到 `message.thinking`。
- Deferred to implementation: 具体 className。

### U3 - 测试对齐

- Goal: 覆盖步骤、隐藏 CoT、空正文、芯片清除与既有对话。
- Requirements covered: R6, R8, NFR2
- Acceptance criteria covered: 发送后芯片消失且步骤含技能名；旧聚焦测试仍过。
- Depends on: U2
- Files: `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Forbidden files: 非 creative-assistant 测试套件大面积改写
- Approach: 改「先想动机」用例；补空流用例；芯片用例断言步骤文案而非「技能 · 已调用」。
- Tests: 该文件本身
- Validation: `corepack pnpm test -- src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Rollback signals: 测试失败即不交付该 UI。
- Deferred to implementation: 无。

## Consistency Check

- implementationUnitCount: 3
- sourceRequirementsCovered: R1-R8, NFR1-NFR2
- sourceRequirementsDeferred: none
- openQuestionsCount: 0

## Validation Plan

- Unit: Jest 助手 Sheet + session 映射
- Integration: 不新增
- User flow: 若浏览器可用，发送一条带技能的消息看时间线
- Data / operations: localStorage 不含 thinking
- Observability: 无新日志密钥

## Rollback / Recovery

去掉 `agentSteps` 渲染即可回到正文+旧脉冲状态；会话旧数据仍可读。

## Plan Self-Review

- Placeholder scan: 无 TBD/TODO
- Consistency check: 每个 R 映射到 U1-U3
- Scope check: 未引入工具循环
- Acceptance coverage: R1-R8 均有单测或静态检查
- Validation gaps: 浏览器与真实模型 unverified
- Alternatives and ADR check: ADR-1/2/3 关闭 Q1-Q3
- High-risk pre-mortem check: 已写三条失败场景

## Handoff

先 U1 类型与 timeline 辅助，再 U2 Sheet，再 U3 测试。工作区已有脏 `develop`，只改创作助手相关文件。
