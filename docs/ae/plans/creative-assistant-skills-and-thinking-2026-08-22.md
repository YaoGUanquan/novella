---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-skills-and-thinking
origin: docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md
originFingerprint: creative-assistant-skills-and-thinking-2026-08-22
depth: deep
format: human-readable-plan
sharded: false
---

# 创作助手技能注册表与思考分流实施计划

## Source

- `docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md`
- 文档评审：`docs/ae/reviews/creative-assistant-skills-and-thinking-2026-08-22.md`（COMMENT，无阻断）

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

在现有侧边创作助手上增加：能力注册表、三个内置技能的点选/提议/可见调用、写提案确认、思考与正文分流。不合并 Auto-Swarm，不加载外部 SKILL.md，不新增供应商。

## Readiness

- Goal: 用户能启用/点选内置技能，看到调用与真实思考块，写操作仍需确认。
- Acceptance criteria: PRD R1-R10, NFR1-NFR3, must-have R5。
- Non-goals: 文件技能、嵌套子 Agent、生图/视频技能、MCP、新密钥路径。
- Affected areas: 对话事件模型、OpenAI/Anthropic SSE 解析、Tauri chunk 事件、创作助手 feature。
- Validation surface: 聚焦 Jest、tsc、eslint scoped、Vite build；真实密钥 SSE 与浏览器交互保持 unverified，除非后续单独验收。
- Open questions: PRD Q1-Q3 在下列 ADR 中关闭。

## Validation Evidence

| Tier                        | Expected signal                                               | Preconditions | Status         | Bounded claim               |
| --------------------------- | ------------------------------------------------------------- | ------------- | -------------- | --------------------------- |
| Static inspection           | 助手无第三方 fetch；事件 kind 不含密钥                        | 当前源码      | unverified     | 仅证明静态边界              |
| Focused automated test      | 技能启用/拒绝、思考与正文分离、确认写保护、旧文本流仍只含正文 | Jest          | unverified     | 不证明真实模型或 Tauri 窗口 |
| Integration or build        | `tsc --noEmit`、scoped eslint、`pnpm run build`               | 本地依赖      | unverified     | 不证明运行时 SSE            |
| Authenticated service smoke | 真实思考分片 / 模型技能提议                                   | 用户密钥      | not-applicable | 需用户明确要求              |
| Browser acceptance          | 芯片、折叠思考、确认回填                                      | 浏览器工具    | unverified     | 交付时若工具可用再做        |

## Contract Value Classification

- Canonical persisted value: 项目记忆仍为 `novella_creative_assistant_memory_v1:{projectId}`；会话正文仍为 `novella_creative_assistant_session_v1:{projectId}`。
- Derived or ephemeral: 思考块、技能调用过程、未确认候选稿。
- Caller-controlled input: 用户点选的技能 ID、模型输出的技能标记。
- Source precedence: 用户点选优先于模型提议；禁用列表否决一切调用。
- Trust boundary: 技能 ID 必须存在于启用注册表；写 handler 只返回提案，`onApply` 与记忆保存仍由 Sheet 确认动作触发。

## Evidence Matrix

| Acceptance criterion     | Applicable tier               | Expected signal and bounded claim                 | Preconditions / owner | Status     | Recovery or rollback signal    |
| ------------------------ | ----------------------------- | ------------------------------------------------- | --------------------- | ---------- | ------------------------------ |
| R5 无确认不写表单/记忆   | Focused automated test        | 技能提议后 `onApply` 与 memory key 不变，直到确认 | Jest                  | unverified | 失败则撤回技能执行接入         |
| R7/R8 思考分流且不伪造   | Focused automated test        | 注入 thinking 事件才出现思考块                    | Jest                  | unverified | 失败则隐藏思考 UI              |
| R10 旧文本流不被思考污染 | Focused automated test        | `streamConfiguredDialogue` 只拼接 text 分片       | Jest                  | unverified | 失败则事件流与字符串流拆分回退 |
| 桌面思考事件             | Runtime / authenticated smoke | Tauri 窗口可见思考块                              | 用户桌面验收          | unverified | Web 路径仍可用                 |

## Assumptions

- 用户确认方案 B 即接受第一期三技能切片。
- 不主动发送 Anthropic extended thinking / OpenAI reasoning 请求参数；只解析若已出现的分片，避免代理因未知字段失败。
- 技能启用状态第一期仅当前 Sheet 会话有效，默认全部启用。

## Alternatives Considered

- Recommended: 保留 `AsyncGenerator<string>` 给现有调用方；新增事件流给助手。技能用与 `<novella-state>` 同风格的受约束标记，由注册表执行。
- Alternative: 升级全部生成为事件并改造灵感弹窗。Rejected because R10 要求既有文本流行为不变。
- Alternative: 原生 `tools`/`tool_use`。Rejected because 当前 OpenAI/Anthropic/Tauri 均无 tool 解析，第一期会把供应商协议差异带进助手。
- Alternative: 把 Auto-Swarm AgentRegistry 当技能表。Rejected because 它是批处理黑板，CustomUserAgent 未真正调模型。

## Decision Drivers

- Driver 1: 确认后才写工程/记忆。
- Driver 2: 不破坏灵感弹窗等字符串流调用方。
- Driver 3: 插拔面是注册表，不是文件或流水线。

## Decisions

### ADR-1 - 双轨流：字符串兼容 + 事件流

- Decision: 保留 `aiService.streamConfiguredDialogue(): AsyncGenerator<string>`，仅转发 `text` 分片。新增 `streamConfiguredDialogueEvents(): AsyncGenerator<DialogueStreamEvent>` 供助手使用。
- Drivers: R10, Q1。
- Alternatives: 全面改事件；在字符串里内嵌 kind 前缀。
- Why chosen: 灵感弹窗继续拼 JSON 文本；思考不会泄漏进候选 JSON。
- Consequences: Provider 与 Tauri 需能产出 kind；字符串 API 忽略 thinking。
- Follow-ups: 无。

### ADR-2 - Tauri chunk 增加可选 kind

- Decision: `novella://dialogue/chunk` payload 增加 `kind: "text" | "thinking"`，缺省 `"text"`。不新增独立 thinking 事件名。
- Drivers: Q2, 现有 complete/error 契约最小改动。
- Alternatives: 新事件 `novella://dialogue/thinking`。
- Why chosen: 旧监听者忽略未知字段仍能读 `content`；桥接层按 kind 分流。
- Consequences: Rust `DialogueChunkEvent` 与 TS `NativeDialogueChunkEvent` 同步。
- Follow-ups: 不在 chunk 中放 api_key。

### ADR-3 - 技能标记 + 注册表，启用状态不持久化

- Decision: 模型用 `<novella-skill id="...">` 闭合标记提议调用；宿主校验启用表后执行。Sheet 内默认启用三个内置技能，关闭只影响当前打开的助手会话。
- Drivers: R1-R4, Q3, 既有 state 标记模式。
- Alternatives: 原生 function calling；localStorage 持久化启用集。
- Why chosen: 与现有解析风格一致；避免第一期再增加存储契约。
- Consequences: 刷新页面后技能恢复默认全开；这是明确天花板，若需要跨会话记住禁用集再加存储。
- Follow-ups: 跨会话持久化禁用集。

### ADR-4 - 澄清技能是可见调用，不是二次隐藏请求

- Decision: `clarify-requirements` 只把本轮 system 指示加强为 intake，并在时间线记一条只读调用；不额外发起第二次 LLM 请求。
- Drivers: 文档评审 P3。
- Alternatives: 技能执行后再自动续写一轮。
- Why chosen: 可观察、无额外费用、无循环风险。
- Consequences: 用户点选澄清后，当次发送的 prompt 可测。
- Follow-ups: 无。

## Risks

- 模型不输出技能标记：手动点选与现有按钮必须仍可用。
- 供应商用非标准 reasoning 字段：只识别 `delta.reasoning_content`、`delta.reasoning` 与 Anthropic `thinking_delta`；其他视为不支持。
- Tauri 旧事件无 kind：桥接按 text 处理。

## Pre-Mortem

- Failure scenario 1: 思考分片被拼进 `streamConfiguredDialogue` 字符串，灵感 JSON 解析失败。
- Failure scenario 2: 模型标记 `propose-candidate` 后未确认就调用 `onApply`。
- Failure scenario 3: 禁用技能仍出现在 system prompt，模型继续提议并被执行。
- Mitigations: 字符串流过滤 thinking；写技能只产出提案；执行前 `assertEnabled`。

## Global Constraints

- 不修改 Auto-Swarm、图像/视频服务、密钥存储。
- 不新增依赖。
- 不覆盖工作区中与本任务无关的已有改动。
- React 助手不直接 `fetch` 模型 URL。
- 技能 handler 不得自己写表单或记忆。

## Implementation Units

### U1 - 对话事件类型与字符串兼容层

- Goal: 定义 `DialogueStreamEvent`，字符串流只含 text。
- Requirements covered: R7, R8, R10, NFR1
- Acceptance criteria covered: 思考不进入字符串流；缺省事件为 text。
- Depends on: none
- Files:
  - `src/core/services/ai/text/dialogue-stream-events.ts`
  - `src/core/services/ai/text/ai-service.ts`
  - `src/__tests__/services/configured-dialogue-stream.test.ts`
- Forbidden files: `src/features/agent/**`, `src-tauri/**`, credentials
- Approach: 新增 `{ kind: 'text' | 'thinking'; text: string }`。`streamConfiguredDialogue` 对事件流只 yield `kind === 'text'` 的 `text`。新增 `streamConfiguredDialogueEvents`。Web 路径若 strategy 仍只提供 string stream，则全部映射为 text 事件。
- Tests: 既有文本流断言不变；新增：thinking 事件不出现在字符串拼接结果中。
- Validation: `pnpm exec jest --runInBand src/__tests__/services/configured-dialogue-stream.test.ts`
- Rollback signals: 灵感弹窗或旧测试收到非正文内容。
- Deferred to implementation: 无。

### U2 - Provider 与 Tauri 思考分片解析

- Goal: OpenAI/Anthropic/桌面 SSE 能发出 thinking 与 text。
- Requirements covered: R7, R8, R10, NFR1
- Acceptance criteria covered: 真实分片可分流；无分片不编造。
- Depends on: U1
- Files:
  - `src/core/ai/providers/base.ts`
  - `src/core/ai/providers/openai-strategy.ts`
  - `src/core/ai/providers/anthropic-strategy.ts`
  - `src-tauri/src/commands/dialogue.rs`
  - `src/infrastructure/tauri-bridge/commands.ts`
  - `src/__tests__/services/anthropic-stream.test.ts`（若已存在则扩展；否则新增对应 provider 流测试）
- Forbidden files: `src/features/agent/**`, 图像/视频服务
- Approach: 可选 `streamEvents`。OpenAI：`delta.content` -> text；`delta.reasoning_content` 或 `delta.reasoning` -> thinking。Anthropic：`delta.type === 'text_delta'` -> text；`thinking_delta` / `delta.type === 'thinking_delta'` -> thinking。不传额外 thinking 请求体字段。Rust `parse_sse_data` 同样分流并 `emit` 带 kind 的 chunk。TS 桥按 kind 产出事件。`stream()` 保持只 yield text，供未改调用方。
- Tests: mock SSE 含 reasoning/thinking_delta 时事件 kind 正确；纯 content 流无 thinking。
- Validation: 聚焦 provider/对话 Jest；`cargo check -p novella-app` 或 workspace 中含 dialogue 的 crate（以实际 package 名为准）。
- Rollback signals: 纯文本 SSE 不再产出正文。
- Deferred to implementation: 不启用 extended thinking 请求参数。

### U3 - 技能注册表与三个内置技能

- Goal: 可查询/启用/禁用/校验/解析技能标记，执行只产生提案。
- Requirements covered: R1, R2, R3, R5, R6, NFR2
- Acceptance criteria covered: 禁用拒绝；只读无确认；写只返回提案。
- Depends on: none
- Files:
  - `src/core/services/ai/assistant-skills/types.ts`
  - `src/core/services/ai/assistant-skills/registry.ts`
  - `src/core/services/ai/assistant-skills/builtin.ts`
  - `src/core/services/ai/assistant-skills/parse-skill-marker.ts`
  - `src/core/services/ai/assistant-skills/index.ts`
  - `src/__tests__/services/assistant-skills.test.ts`
- Forbidden files: Sheet 组件（本单元不改 UI）、AgentRegistry、SKILL.md 加载器
- Approach: `AssistantSkill`：`id`, `label`, `sideEffect: 'none' | 'candidate-proposal' | 'memory-proposal'`。内置 `clarify-requirements`, `propose-candidate`, `propose-memory`。解析 `<novella-skill id="...">`（允许空内容或闭合标签），从可见正文剥离。`executeSkill({ id, enabledIds })` 对未知/禁用返回 `{ status: 'rejected', reason }`；通过则 `{ status: 'accepted', sideEffect }`。不调用 `onApply`，不写 localStorage。
- Tests: 启用集过滤、禁用拒绝、标记隐藏、非法 id 拒绝。
- Validation: 上述 Jest。
- Rollback signals: 禁用技能仍 accepted。
- Deferred to implementation: 技能参数 JSON；多技能同轮串行。第一期每轮最多接受一个写提案。

### U4 - 助手时间线、点选与确认衔接

- Goal: Sheet 展示思考块、技能芯片与调用记录，并接上现有确认流。
- Requirements covered: R3, R4, R5, R6, R7, R8, R9, NFR2, NFR3
- Acceptance criteria covered: 点选可观察；思考可折叠；无思考不伪造；会话持久化不含思考全文；写确认仍在。
- Depends on: U1, U2, U3
- Files:
  - `src/features/creative-assistant/types.ts`
  - `src/features/creative-assistant/creative-assistant-session.ts`
  - `src/features/creative-assistant/creative-assistant-memory.ts`
  - `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`
  - `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
  - `src/__tests__/features/creative-assistant/creative-assistant-memory.test.ts`
- Forbidden files: `src/features/agent/**`, 项目 store 持久化、密钥配置页
- Approach: 消息增加可选 `thinking?` 与 `skillCalls?: { id, status, reason? }[]`。发送区列出三个技能芯片：启用开关 + 本轮点选。点选 `clarify-requirements` 时本轮 system 使用加强 intake，并先追加只读调用记录。点选或模型标记 `propose-candidate` 时走现有候选稿生成+确认，不直接 `onApply`。`propose-memory` 只保证本轮 state 展示与保存按钮，保存仍需点击。流使用 `streamConfiguredDialogueEvents`；思考写入 `thinking`，正文继续走 state 标记隐藏。会话 persist 仍只存 id/role/content/state。模型 system prompt 只注入已启用技能清单与标记语法。保留现有“生成可回填草稿”按钮，作为点选 `propose-candidate` 的同义入口。
- Tests: 禁用技能不进 prompt；点选澄清后 prompt 含加强指示；模型标记候选稿仍需确认；thinking 事件出现折叠块；纯文本流无思考块；persist 无 thinking。
- Validation: `pnpm exec jest --runInBand src/__tests__/features/creative-assistant`
- Rollback signals: 未确认调用了 `onApply`；或旧确认回填路径消失。
- Deferred to implementation: 嵌套子 Agent UI。

### U5 - 回归、证据与记忆

- Goal: 验证并留下过程证据。
- Requirements covered: R9, R10, NFR1
- Acceptance criteria covered: 旧测试 + 新测试 + tsc/lint/build。
- Depends on: U1, U2, U3, U4
- Files:
  - `docs/00-process/active/creative-assistant-skills-and-thinking-2026-08-22/progress.md`
  - `docs/08-ai-memory/05-decision-log.md`
  - `docs/08-ai-memory/04-known-pitfalls.md`
- Forbidden files: 密钥、真实响应全文
- Approach: 运行验证命令；记录未跑的真实服务/浏览器项；更新决策：注册表插拔、思考不伪造、写提案确认。
- Tests: 全套本任务聚焦测试。
- Validation: 见 Validation Plan。
- Rollback signals: 构建或聚焦测试失败时不宣称完成。
- Deferred to implementation: 全量 Jest 中既有无关 SettingsPage 失败不作为本任务回归。

## Consistency Check

- implementationUnitCount: 5
- sourceRequirementsCovered: R1-R10, NFR1-NFR3
- sourceRequirementsDeferred: none
- openQuestionsCount: 0（Q1-Q3 已由 ADR-1/2/3 关闭）

## Validation Plan

- Unit: assistant-skills、dialogue events、provider SSE fixtures、Sheet 组件测试。
- Integration: `pnpm exec tsc --noEmit`；scoped eslint；`pnpm run build`。
- User flow: 若浏览器工具可用，点选技能、折叠思考、取消回填；否则标 unverified。
- Data / operations: 记忆与会话 key 行为由组件测试覆盖。
- Observability: 错误仍走现有脱敏 `ConfiguredDialogueError`。

## Rollback / Recovery

- 回退事件流：助手改回 `streamConfiguredDialogue`，删除 kind 字段。
- 回退技能：移除芯片与标记解析，保留原按钮。
- 不回滚无关工作区改动。

## Plan Self-Review

- Placeholder scan: 无 TBD/TODO。
- Consistency check: 每条 R/NFR 映射到 U1-U5。
- Scope check: 无 Auto-Swarm、无 SKILL.md、无新供应商。
- Acceptance coverage: must-have R5 由 U3+U4 测试钉死。
- Validation gaps: 真实密钥桌面思考与模型是否输出标记保持 unverified。
- Alternatives and ADR check: 四个 ADR 覆盖 Q1-Q3 与评审 P3。
- High-risk pre-mortem check: 三项失败场景均有缓解。

## Handoff

执行顺序：U3 可与 U1 并行；U2 在 U1 后；U4 在 U1-U3 后；U5 最后。工作区若仍为脏 `develop`，只追加本任务文件，不还原用户其他改动，不自动提交。
