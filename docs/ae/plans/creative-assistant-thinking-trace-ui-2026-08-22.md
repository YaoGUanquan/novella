---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-thinking-trace-ui
origin: docs/ae/prds/creative-assistant-agent-thinking-2026-08-22.md
originFingerprint: creative-assistant-agent-thinking-2026-08-22
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 创作助手思考过程改为 Cursor 式时间线

## Source

- `docs/ae/prds/creative-assistant-agent-thinking-2026-08-22.md`
- 现有实现：`agentSteps` 已接入 `runStream`，UI 仍是原生 `<details>` +「完成 · 步骤名」编号列表。用户截图只看到最终正文，认为思考过程未设计好。

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

只改思考过程的展示，不改步骤语义、会话持久化或对话传输。目标是 Cursor 式：独立可折叠轨迹、状态用图标而不是「完成 ·」前缀、进行中展开、完成后收成一行但仍可点开。

## Readiness

- Goal: 用户一眼能把「思考过程」和模型正文分开，交互接近 Cursor 的 Thought 行。
- Acceptance criteria: PRD R1/R3 的可见性；进行中标题为「正在思考」；完成后标题为「思考过程」且步骤可展开；步骤用图标表示 running/done/failed。
- Non-goals: 真实工具循环、展示模型 reasoning 文本、重做消息气泡配色。
- Affected areas: 创作助手 Sheet 思考 UI。
- Validation surface: 现有 Sheet Jest；浏览器若可用再看一眼。
- Open questions: 无。

## Validation Evidence

| Acceptance criterion     | Applicable tier        | Expected signal and bounded claim                                    | Preconditions / owner | Status               | Recovery or rollback signal |
| ------------------------ | ---------------------- | -------------------------------------------------------------------- | --------------------- | -------------------- | --------------------------- |
| R1/R3 思考块与正文分离   | Focused automated test | 完成后标题为「思考过程」；进行中为「正在思考」；步骤不含模型推理文本 | Jest                  | verified (26 passed) | 还原 `<details>`            |
| 浏览器可见 Cursor 式轨迹 | Browser acceptance     | 发送后展开步骤，结束后收成可点标题行                                 | 本地 Tauri/Vite       | unverified           | 保持现有功能时间线          |

## Assumptions

- 第一期仍无真实工具循环；UI 只改已有 `agentSteps` 的展示。
- Cursor 式折叠不等于隐藏：标题行必须始终可见。

## Alternatives Considered

- Recommended: 独立 `AgentThinkingTrace` 按钮+竖线时间线；live 时展开，结束后折叠为标题行。
- Alternative: 继续用 `<details>` 只改 CSS。Rejected because 原生 summary 很难做成 Cursor 的 chevron+状态图标。
- Alternative: 完成后也强制展开。Rejected because 长回复会把正文顶下去；Cursor 是收成一行。

## Decision Drivers

- Driver 1: 思考块必须在视觉上不像模型正文。
- Driver 2: 进行中要能看见步骤推进。
- Driver 3: 不增加新依赖。

## Decisions

### ADR-1 - 完成后折叠为标题行

- Decision: `live` 时展开；`live` 结束后折叠，标题仍显示「思考过程」。
- Why chosen: 对照用户截图，他们看的是完成后的正文；必须留下可识别的 Thought 行，而不是把步骤永久铺在正文上。
- Consequences: 测试在断言步骤文案前要点开标题。

## Implementation Units

### U1 - Cursor 式思考轨迹 UI

- Goal: 替换 `<details>` 编号列表。
- Requirements covered: R1, R3
- Acceptance criteria covered: 标题与正文分离；图标状态；可折叠。
- Depends on: none
- Files: `src/features/creative-assistant/components/AgentThinkingTrace.tsx`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Forbidden files: `src/core/**`, `src-tauri/**`
- Approach: 按钮标题 + `aria-expanded`；左侧竖轨；running 用 `Loader2`（`motion-reduce:animate-none`）；done 用 Check；failed 用 X。步骤 label 不再拼接「完成 ·」。
- Tests: 完成后能点开看到「请求对话模型」「应用技能：…」；进行中可见「正在思考」。
- Validation: `corepack pnpm test -- src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Rollback signals: 还原 Sheet 内 `<details>`。
- Deferred to implementation: 具体间距 class。

## Consistency Check

- implementationUnitCount: 1
- sourceRequirementsCovered: R1, R3（展示层）
- sourceRequirementsDeferred: 无功能缺口；R2/R4-R8 已由前一实现覆盖
- openQuestionsCount: 0

## Plan Self-Review

- Placeholder scan: 无
- Scope check: 仅 UI
- Acceptance coverage: 可见性与折叠
- Validation gaps: 浏览器仍可能 unverified

## Handoff

实现 U1 后跑聚焦 Jest，并写 2026-08-22 日报。
