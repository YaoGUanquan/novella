---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-agent-thinking
format: human-readable-requirements
sharded: false
---

# 创作助手展示智能体思考过程（非模型思维链）

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

用户期望打开创作助手后能看到类似 Cursor 的「思考过程」：智能体正在做什么、做到哪一步。当前界面在点选技能后立刻显示「技能 · 已调用」，正文区只剩「AI 正在输入...」，流结束后常见空白卡片，输入框技能标签也不清除。

上一轮 `docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md` 把「思考」定义成供应商 `thinking` / `reasoning_content` 分片（R7/R8/D4）。用户已明确否定该定义：**要展示的是智能体编排过程，不是大模型返回的推理文本。**

成功信号：发送后能看到逐步更新的智能体步骤；完成后步骤可折叠保留，下面才是可见正文；输入框技能标签本轮用完即清；没有可见正文时步骤和失败/空回复说明仍在，而不是卡片消失。

## Requirements

**智能体思考过程**

- R1. 创作助手在生成过程中必须展示本轮智能体活动时间线，替代「AI 正在输入...」作为主状态。步骤来自助手运行时实际发生的编排，而不是模型生成的内心独白或供应商推理分片。  
  Acceptance: 发送后、正文出现前，界面出现至少一条进行中的智能体步骤；测试注入纯文本流时，步骤文案不含虚构的模型思维链段落。
- R2. 第一期时间线只反映助手已经在做的事，最小集合为：开始处理本轮请求；应用用户点选的技能（列出中文名，未点选则跳过该步）；正在请求已配置对话模型；正在整理回复。若触发候选稿跟进或请求失败/取消，必须追加对应完成或失败步骤。  
  Acceptance: 点选「想法发散」「文案润色」后发送，时间线含这两项应用步骤；无点选时不含「应用用户点选技能」；取消或抛错后时间线有失败/已停止状态，而不是空白。
- R3. 步骤必须随编排推进实时更新（进行中 / 完成 / 失败），完成后保留在该条助手消息上，默认折叠为「思考过程」，展开可见步骤列表；可见正文在时间线之下。  
  Acceptance: 流式测试能观察到步骤从进行中变为完成；完成后仍能展开看到步骤，且正文与步骤分区渲染。
- R4. 不得把供应商思考/推理分片、模型输出的 `<novella-state>` / `<novella-skill>` 原文、或提示词里的技能说明，展示为「思考过程」。既有 `message.thinking` 通道不再作为用户可见的思考过程标题或主内容。  
  Acceptance: 注入 `kind: thinking` 的流不在「思考过程」主区域渲染该文本；「思考过程」标题下只有智能体步骤。

**空回复与技能标签**

- R5. 本轮请求结束后若没有可见正文，不得把消息渲染成空白或继续显示「AI 正在输入...」；必须保留智能体时间线，并给出明确说明（无可见回复或请求未完成）。  
  Acceptance: 流结束且可见正文为空时，仍能看到步骤和第 2 条说明文案；`generating` 为 false 时不再出现「AI 正在输入...」。
- R6. 用户点击发送后，输入框内本轮点选的技能标签必须立即清除，技能下拉关闭；本轮请求仍携带发送瞬间的技能快照。对话时间线中的智能体步骤继续展示这些技能。  
  Acceptance: 发送后「移除技能 …」按钮消失；同一轮助手消息步骤仍包含所点选技能名。

**兼容与写保护**

- R7. 不因此把 AE 可选技能升级为可执行工作流；点选技能仍只改变本轮指令。回填表单与保存项目记忆仍需用户确认。  
  Acceptance: 无新增对 `SKILL.md` / `ae.mjs` 的运行时读取；无确认时 `onApply` 与已保存记忆不变。
- R8. 普通多轮对话、停止、重试、删除消息、清空会话、图片附件和滚动到最新消息保持可用。  
  Acceptance: 现有创作助手聚焦测试在扩展后仍通过；停止后不再追加正文。

## Non-Functional Requirements

- NFR1. 智能体步骤可以随消息做紧凑持久化（步骤名、状态、可选短原因）；不得把供应商推理全文、附件二进制或 API key 写入会话存储。  
  Acceptance: 会话 JSON 不含 `reasoning`/`thinking` 全文和附件 dataUrl。
- NFR2. 助手 UI 仍不得直连第三方模型 URL；步骤由现有对话调用链的本地编排产生。  
  Acceptance: 静态检查助手组件无新增第三方 AI `fetch`。

## Must-Haves (Conditional)

- Requirement ID: R1
  Must-have completion condition: 用户可见的「思考过程」只来自智能体编排步骤，不来自大模型返回的推理文本。
- Requirement ID: R5
  Must-have completion condition: 生成结束后不存在「空白卡片 + 仅技能已调用」且无任何说明的状态。

## Success Criteria

- 发送后能看到智能体在做什么，而不是只有脉冲「AI 正在输入...」。
- 思考过程看起来像 Cursor 的步骤时间线，而不是模型思维链。
- 点选技能发送后输入框标签消失，时间线里仍能看到这些技能被应用。
- 模型没吐出可见正文时，用户仍知道本轮发生了什么。

## Scope Boundary

### In Scope

- 创作助手侧边栏本轮智能体活动时间线的展示、更新、折叠和空/失败说明。
- 发送后清除输入框技能标签。
- 将既有「供应商思考分片 = 思考过程」的用户可见语义降级或隐藏。

### Out Of Scope

- 把助手升级为 Cursor 级编码 Agent（读文件、改仓库、shell、MCP、嵌套子智能体）。
- 执行 AE / mattpocock `SKILL.md`。
- 新的模型供应商、function calling 市场、联网搜索。
- 用提示词让模型编造「第一步…第二步…」当作思考过程。
- 修改 Auto-Swarm / Multi-Agent Studio。

### Constraints

- 延续：AE 可选技能第一期只做提示词转向；写操作确认后才生效。
- 当前助手没有真实工具循环；第一期步骤只能映射现有编排，不能假装执行了外部技能文件。
- 不把「没有推理分片」解释成做不到思考过程。

## Validation Evidence

| Acceptance criterion | Tier                             | Expected signal                                                             | Status                             |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| R1–R6, R8            | Focused automated test           | 步骤序列、折叠后仍在、空正文说明、发送后芯片消失、thinking 分片不进主时间线 | unverified                         |
| R7, NFR2             | Static inspection + focused test | 无 SKILL.md 执行；无第三方 fetch；写保护不变                                | unverified                         |
| NFR1                 | Focused automated test           | 会话持久化不含推理全文                                                      | unverified                         |
| 浏览器可见步骤       | Browser acceptance               | 发送后时间线推进、芯片清除、空/失败态可读                                   | unverified                         |
| 真实模型是否返回正文 | Authenticated service smoke      | 不作为本需求通过条件；空正文由 R5 兜底                                      | not-applicable until user requests |

## Perspective Collision

- Perspectives: critic, pragmatist, innovator, systems.
- Disagreements:
  - Value: 创新视角要真实工具循环才配叫思考过程；务实视角认为第一期只能展示现有编排，否则会做成假 Agent。
  - Fact: 当前点选技能不是工具执行，只是注入指令；「已调用」在请求发出前就出现，与事实不符。
  - Assumption: 批评视角认为状态步骤会被当成虚假思维链；系统视角认为只要步骤只陈述运行时动作，就与禁止伪造 CoT 不冲突。
- Collision insights:
  - 「像 Cursor」与「不做通用 Agent」同时成立的条件是：时间线协议可扩展，第一期只挂载真实发生的编排步骤。
  - 「不要伪造思考」与「必须能看到思考过程」同时成立的条件是：禁止的是模型独白，不是智能体状态。
- Blind spots: 远端长时间无分片时，需要可感知的「等待模型」步骤，否则仍会像消失。
- Thinking preservation zone: 角色与剧情判断仍留在模型正文里，不编进智能体步骤。

## Key Decisions

- D1. 用户可见的「思考过程」= 智能体编排时间线，≠ 大模型推理分片。  
  Reason: 用户书面纠正；旧 R7/R8/D4 与该目标冲突，本 PRD 覆盖其用户可见语义。
- D2. 第一期采用「编排时间线」，不新建工具调用运行时，也不让模型输出伪步骤。  
  Reason: 现有技能是提示词适配；编造 CoT 或假装执行 SKILL.md 都会再次误导。
- D3. 无点选技能时仍展示「请求对话模型 / 整理回复」等智能体步骤，不因未点选技能而退回「AI 正在输入...」。  
  Reason: 思考过程是智能体默认能力，不是技能附加彩蛋。
- D4. 发送后立即清除输入框技能标签；本轮请求使用发送瞬间的快照。  
  Reason: 用户确认；避免下一轮误带技能，也避免「标签还在、对话却空了」的错觉。

## Alternatives Considered

- A1. 继续展示供应商 `reasoning_content` 作为思考过程。  
  Rejected: 用户明确不是这个；多数已配置模型也不会发该分片。
- A2. 升级为带 function calling 的真实 Agent 循环。  
  Deferred: 超出第一期边界，且与不执行外部 SKILL.md 的决策冲突。
- A3. 提示词要求模型输出逐步思考 JSON。  
  Rejected: 仍是「大模型的返回」，会伪造智能体动作。

## Dependencies And Assumptions

### Dependencies

- 现有创作助手 Sheet、技能点选、`streamConfiguredDialogueEvents`、会话持久化。
- `docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md` 中的技能注册与写保护仍然有效；仅「思考」用户可见定义被本文件覆盖。

### Assumptions

- 用户把 Cursor 时间线理解为「步骤 + 状态」，接受第一期步骤映射到现有编排而不是文件工具。
- 部分远端模型仍可能返回空正文或只有标记；R5 必须独立成立。
- 桌面端与 Web 走同一套助手消息模型，步骤展示不依赖特定供应商。

## Open Questions

### Must Resolve Before Planning

- 无。产品对象（智能体步骤 vs 模型推理）已由用户明确。

### Deferred To Planning

- Q1. [Affects R3][technical] 步骤是消息上的结构化字段，还是独立时间线实体；折叠控件复用 `<details>` 还是自定义列表。
- Q2. [Affects NFR1][technical] 重开会话时恢复全部步骤，还是只恢复摘要。
- Q3. [Affects R4][technical] 供应商 thinking 分片是完全丢弃，还是仅开发态可看。默认按 R4 对用户隐藏。

## Evidence Notes

- 用户纠正：思考过程是智能体过程，不是大模型返回。
- 旧决策把思考定义为传输层推理分片 -> Evidence: `docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md` R7/R8/D4；`docs/08-ai-memory/05-decision-log.md`「创作助手采用注册表技能与思考分流」。
- 当前 UI 在无正文时渲染「AI 正在输入...」，有 `message.thinking` 才显示「思考过程」-> Evidence: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`。
- 点选技能在请求发出时就写入 `skillCalls` 且状态为 `accepted` -> Evidence: 同文件 `runStream` 的 `initialSkillIds`。
- 思考分片解析依赖 `reasoning_content` / Anthropic `thinking_delta` -> Evidence: `src/core/ai/dialogue-stream-events.ts`。
- AE 技能第一期不执行 SKILL.md -> Evidence: `docs/ae/prds/creative-assistant-skill-sources-2026-08-22.md` R4。

## Requirement Quality Checklist

- WHAT/WHY: 展示智能体步骤，纠正错误的模型 CoT 定义。
- Measurable success: R1–R6 均有界面/测试可观察条件。
- Assumptions: 与已确认用户纠正分开记录。
- Non-goals: 真实编码 Agent、伪 CoT、执行 SKILL.md 已写出。
- Validation: 聚焦测试 + 浏览器验收；真实模型空正文不作为本需求阻断。

## Consistency Check

- requirementsCount: 8
- nonFunctionalRequirementsCount: 2
- decisionsCount: 4
- openQuestionsCount: 3
