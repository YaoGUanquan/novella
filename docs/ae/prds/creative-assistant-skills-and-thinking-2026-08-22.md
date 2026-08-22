---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-skills-and-thinking
format: human-readable-requirements
sharded: false
---

# 创作助手可插拔技能、调用可见与思考分流

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

当前创作助手是单通道 SSE 文本对话：用户只能看到一段连续回复，无法点选或禁用能力，模型也不能以可见方式调用产品能力。思考过程和工具调用（若供应商发出）会被扁平文本吞掉。用户选择方案 B：以现有侧边对话为核心，增加能力注册表和受约束的调用循环；思考与正文分流展示，类似 Cursor 时间线，但不做成通用编程 Agent。

成功信号：用户能启用/禁用内置技能、手动点选或由模型从已启用列表提议调用；调用出现在对话时间线；写副作用仍需确认；有供应商思考事件时可见且可折叠，没有时不伪造思维链。

## Requirements

**能力注册与插拔**

- R1. 产品内置一组可注册、可启用、可禁用的创作技能；禁用的技能不得进入模型可见能力列表，也不得被本轮调用。
  Acceptance: 测试能断言启用列表变化后，请求上下文只包含已启用技能，且对禁用技能的调用提议被拒绝。
- R2. 技能通过统一注册面接入；第一期只提供编译期内置实现，但注册/注销/查询接口不得绑定某一个 Sheet 组件。
  Acceptance: 注册表可列出、启用、禁用内置技能；卸载某个内置技能后助手仍能进行普通对话。
- R3. 用户可在发送前点选本轮要使用的已启用技能；未点选时，模型只能从当前已启用列表中提议调用。
  Acceptance: 点选技能的请求能被观察；未点选时仍可出现来自已启用列表的调用提议；未启用技能不会出现。

**调用可见与写保护**

- R4. 对话时间线除用户/助手正文外，还能展示技能调用记录（名称、是否只读/需确认、成功或拒绝原因）。
  Acceptance: 一次被接受的调用在消息时间线中可见；被拒绝的调用显示原因且不产生副作用。
- R5. 只读技能可以在本轮自动执行；任何会回填表单、保存项目记忆或改工程数据的技能只能产生提案，必须由用户明确确认后才生效。
  Acceptance: 只读调用不打开确认弹窗也能完成；候选稿仍走现有确认回填；记忆仍走“保存本轮记忆”；无确认时表单值和已保存记忆不变。
- R6. 第一期内置技能仅限：澄清需求（只读）、生成可回填草稿（写提案）、保存记忆提案（写提案）。三者均可禁用。
  Acceptance: 三个技能均可单独关闭；关闭后对应入口或自动提议消失；现有“生成可回填草稿”和“保存本轮记忆”行为不被绕过。

**思考分流**

- R7. 当对话传输实际收到供应商思考/推理分片时，助手将其显示为可折叠的思考块，与最终正文分离。
  Acceptance: 注入思考分片的流式测试中，思考块与正文分开展示；思考内容不进入候选稿解析，也不作为已确认事实写入项目记忆。
- R8. 供应商未发出思考/推理分片时，界面可以显示“正在回复”或已发生的技能调用，但不得编造思维链或伪思考段落。
  Acceptance: 仅有正文分片的流不渲染思考块正文；测试断言不会插入虚构思考文本。

**兼容现有对话**

- R9. 普通多轮 SSE 对话、取消、重试、删除消息、清空会话、图片附件和项目记忆协议保持可用。
  Acceptance: 现有创作助手聚焦测试在扩展后仍通过；取消后不再追加内容；清空会话不删除项目记忆。
- R10. 新建工程“随机灵感”等其他 `streamConfiguredDialogue` 调用方若仍使用文本流，不得被本次事件模型破坏。
  Acceptance: 既有灵感/对话文本流测试继续通过，或明确增加兼容适配且行为不变。

## Non-Functional Requirements

- NFR1. 继续使用已配置对话服务、现有密钥路径和 AbortSignal；不新增供应商、endpoint、密钥存储或联网搜索。
  Acceptance: 请求消息、时间线和日志中不含 API key；协议测试不引入真实密钥。
- NFR2. 助手 UI 不直接请求第三方模型；技能执行器位于 `core` 或 feature 适配层之上的领域服务，不绕过 Provider/service 边界。
  Acceptance: 静态检查助手组件不新增对第三方 AI URL 的 `fetch`。
- NFR3. 思考块和技能调用记录默认不把附件二进制写入会话持久化；思考内容不写入项目记忆 localStorage。
  Acceptance: 持久化会话 JSON 不含思考全文和附件 dataUrl；记忆 merge 输入不含思考文本。

## Must-Haves (Conditional)

- Requirement ID: R5
  Must-have completion condition: 没有任何技能调用可以在缺少用户确认的情况下调用 `onApply` 或写入已确认项目记忆。

## Success Criteria

- 用户能看到并控制三个内置技能的启用状态，并在对话里点选或接受模型提议。
- 技能调用在时间线可见；写操作仍需确认。
- 有思考分片则折叠展示，无则不伪造。
- 现有回填、记忆、取消和文本流调用方不被破坏。

## Scope Boundary

### In Scope

- 创作助手侧边对话的技能注册、启用、点选、可见调用和思考分流。
- 三个内置技能及其与现有候选稿/记忆确认路径的衔接。
- 为思考/正文分流而扩展的对话流事件（含桌面端若仍走同一助手路径）。
- 聚焦测试、类型检查和前端构建。

### Out Of Scope

- 外部 `SKILL.md` 文件热加载、MCP、shell、任意用户脚本。
- 与 Auto-Swarm / Multi-Agent Studio 流水线合并。
- 嵌套子智能体运行时（子 Agent 再开工具循环或再派生子 Agent）。
- 图像/视频生成技能、联网搜索、新的模型供应商。
- 提示词模板市场或跨用户共享技能包。

### Constraints

- 延续既有决策：不把外部开发代理技能当产品运行时；确认后才写表单或项目记忆。
- 桌面端 API key 仍只进入 native 请求内存，不进入事件文案。
- 第一期技能调用采用产品可解析的受约束提议，而不是开放的供应商 function-calling 市场。

## Validation Evidence

| Acceptance criterion | Tier                                 | Expected signal                                                             | Status                             |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------- |
| R1-R6, R8            | Focused automated test               | 启用/禁用、点选、拒绝禁用技能、只读自动执行、写提案需确认、无思考分片不伪造 | unverified                         |
| R7, R9, R10          | Focused automated test               | 思考与正文分离；现有助手与文本流测试通过                                    | unverified                         |
| NFR1, NFR2           | Static inspection + focused test     | 无密钥泄漏；助手无第三方 fetch                                              | unverified                         |
| NFR3                 | Focused automated test               | 会话持久化不含思考全文                                                      | unverified                         |
| 桌面思考事件         | Runtime health / authenticated smoke | Tauri 窗口真实 SSE 思考分流                                                 | unverified                         |
| 真实模型 skill 提议  | Authenticated service smoke          | 用户已配置密钥时的模型是否遵守调用约定                                      | not-applicable until user requests |
| Browser acceptance   | Browser acceptance                   | 点选技能、折叠思考、确认回填的交互                                          | unverified                         |

## Perspective Collision

- Perspectives: critic, pragmatist, innovator, systems.
- Disagreements:
  - Value: 创新视角要求 Cursor 级嵌套 Agent 与文件技能；务实视角要求第一期只做注册表 + 三个技能 + 时间线。
  - Assumption: 批评视角认为模型不会稳定发出调用提议；系统视角认为即使模型失败，手动点选仍能提供价值。
  - Fact: 当前传输只产出扁平文本，思考分流必须改事件模型，不能只改 UI。
- Collision insights:
  - “任意插拔”与“不执行外部 SKILL.md”同时成立的条件是：插拔面是注册表，不是文件系统。
  - “自动调用更好”与“不能误写工程”同时成立的条件是：只读可自动，写操作只产生提案。
- Blind spots: 具体供应商是否发出 thinking/reasoning 分片未在本机真实验证；技能标记被模型忽略时的降级体验。
- Thinking preservation zone: 哪些创作步骤应保持手工艺（确认回填、记忆保存），哪些可以自动化，不交给实现者自行扩大写权限。

## Key Decisions

- D1. 采用方案 B：能力注册表 + 受约束调用循环，而不是纯提示词芯片或 Auto-Swarm 合并。
  Reason: 用户确认推荐方案；能保留确认写边界，并为后续技能包留下同一接口。
- D2. 第一期内置技能仅为澄清、候选稿提案、记忆提案；嵌套子智能体与文件技能后置。
  Reason: 覆盖用户“点选或理解后调用”的核心，避免一次做成通用 Agent。
- D3. 只读可自动执行；回填表单与保存记忆必须用户确认。
  Reason: 延续创作助手既有 must-have。
- D4. 思考块只展示传输层真实收到的思考/推理分片；没有则不编造。
  Reason: 避免假 Cursor 体验和把臆测写入记忆。
- D5. 第一期不合并 Multi-Agent Studio，不加载外部 SKILL.md。
  Reason: Auto-Swarm 是批处理黑板，不是对话循环；外部技能文件与既有记忆决策冲突。

## Dependencies And Assumptions

### Dependencies

- 现有创作助手 Sheet、项目记忆协议、候选稿确认回填。
- 已配置对话服务（OpenAI 或 Anthropic 协议）及现有 SSE/Tauri 传输。

### Assumptions

- 用户确认“使用推荐方案 B”即接受上一轮建议的第一期切片，而不是完整 Cursor 运行时。
- 部分已配置模型不会发出思考分片；产品在该情况下仍可用。
- 模型可能不遵守技能提议约定；手动点选必须独立可用。

## Open Questions

### Must Resolve Before Planning

- 无。产品方向已由用户选定方案 B，第一期切片已在 D2-D5 锁定。

### Deferred To Planning

- Q1. [Affects R4, R7, R10][technical] 文本流兼容是保留 `streamConfiguredDialogue(): AsyncGenerator<string>` 另增事件流，还是把现有生成器升级为可降级事件。
- Q2. [Affects R7][technical] 桌面端思考分片是新增 Tauri 事件类型，还是在现有 chunk 事件上增加 kind 字段。
- Q3. [Affects R1][technical] 技能启用状态按应用全局持久化，还是仅当前会话有效。

## Evidence Notes

- 助手消息仅 `user`/`assistant` 文本，无 tool/thinking 类型 -> Evidence: `src/features/creative-assistant/types.ts`。
- SSE 只产出字符串；Anthropic 仅解析 `text_delta`，OpenAI 仅解析 `delta.content` -> Evidence: `src/core/ai/providers/anthropic-strategy.ts`, `src/core/ai/providers/openai-strategy.ts`, `src-tauri/src/commands/dialogue.rs`。
- 无 `tools`/`tool_use` 协议 -> Evidence: 仓库 `src` 检索无匹配。
- 记忆 PRD 排除外部 SKILL.md -> Evidence: `docs/ae/prds/creative-assistant-memory-2026-08-22.md`。
- Auto-Swarm 与助手未集成 -> Evidence: `src/core/services/agent/MasterDirectorAgent.ts`, `src/features/creative-assistant/`。
- 候选稿确认回填 must-have -> Evidence: `docs/ae/prds/ai-creative-assistant-panel-2026-08-22.md` R4。

## Consistency Check

- requirementsCount: 10
- nonFunctionalRequirementsCount: 3
- decisionsCount: 5
- openQuestionsCount: 3
