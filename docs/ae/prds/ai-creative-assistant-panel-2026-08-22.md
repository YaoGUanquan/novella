---
type: prd
status: implemented
date: 2026-08-22
topic: ai-creative-assistant-panel
format: human-readable-requirements
sharded: false
---

# AI 创作助手侧边对话与回填

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

当前脚本、角色和分镜入口把 SSE 结果直接显示在各自表单附近，用户无法先通过多轮对话澄清创作意图，也没有明确的“将候选结果写回表单”确认步骤。目标是在每个创作表单旁提供一个上下文专属的悬浮 AI 入口，打开右侧对话面板，以 SSE 显示模型回复；模型产出可回填候选稿后，用户可确认回填、复制或继续手动编辑。

## Requirements

**侧边对话与草稿回填**

- R1. 脚本、角色与分镜表单各自提供可发现的悬浮 AI 助手图标；点击后打开与当前表单上下文绑定的右侧面板。
  Acceptance: 三个目标表单均可从悬浮入口打开助手，面板标题明确显示当前目标，关闭后不改变当前表单数据。
- R2. 面板支持用户和 AI 的多轮 SSE 对话；每个用户消息和逐段 AI 回复在同一消息时间线中可见，并可取消正在进行的回复。
  Acceptance: 首个 SSE chunk 到达时新增 assistant 消息实时更新；取消后不再追加内容，已有历史消息保留。
- R3. 用户可在对话完成后请求“生成可回填草稿”；模型返回的结构化候选稿只保存在临时状态，不能自动修改表单。
  Acceptance: 脚本、角色、分镜各自使用对应的候选输出约束；无法解析的候选保留原文与错误提示，不覆盖表单。
- R4. 可解析候选稿准备好后，面板必须出现“填充表单”确认弹窗；确认才将候选稿写回当前表单，取消保持原表单不变。
  Acceptance: 确认前后表单值可比较；取消后原值完全保持；回填成功后回到原表单并显示可编辑内容。
- R5. 用户始终可复制候选内容、继续对话，或直接在原有表单手动输入/编辑；这些路径不强制持久化聊天记录。
  Acceptance: 候选区提供复制操作；关闭重开不依赖历史持久化；手动输入和现有确认保存路径仍可用。

## Non-Functional Requirements

- NFR1. 对话请求继续复用现有 OpenAI/Anthropic SSE 解析、配置解析和 AbortSignal 边界；密钥不得出现在消息、页面或日志中。
  Acceptance: 既有协议测试仍通过，新增测试断言发送上下文不含密钥。
- NFR2. 抽屉在桌面保持右侧工作区宽度、在窄屏占满可用宽度；键盘焦点、关闭按钮、发送禁用和错误重试状态可用。
  Acceptance: 浏览器在桌面和窄屏下不出现溢出或遮挡，发送中的取消和发送按钮状态明确。

## Must-Haves (Conditional)

- Requirement ID: R4
  Must-have completion condition: 没有用户在确认弹窗中的明确确认，任何 AI 候选稿都不能写回脚本、角色或分镜表单。

## Success Criteria

- 用户可通过多轮 SSE 对话澄清任一创作目标，再选择是否回填。
- 表单回填可见、可取消、可复制且不破坏手动编辑。
- 既有脚本、角色、分镜的确认保存行为保持兼容。

## Scope Boundary

### In Scope

- 项目详情脚本与项目编辑角色、分镜三个目标的共享侧边 AI 对话助手。
- 内存中的消息、候选草稿、确认弹窗和表单回填适配。
- 与现有 SSE 服务和表单状态的前端集成、测试和浏览器验收。

### Out Of Scope

- 聊天记录跨会话持久化、多人协作、提示词模板市场或模型配置重做。
- 自动确认回填、自动保存工程或真实付费模型 smoke。

### Constraints

- 复用 `src/components/ui/sheet.tsx`、`src/components/ui/confirm-dialog.tsx`、`aiService.streamGenerate` 和现有 UI 视觉基线。
- 保留用户直接编辑和现有工程保存路径。

## Validation Evidence

| Acceptance criterion | Tier                   | Expected signal                                   | Status         |
| -------------------- | ---------------------- | ------------------------------------------------- | -------------- |
| R2, R3               | Focused automated test | SSE 消息逐段更新、取消与解析失败保持草稿隔离      | unverified     |
| R4, R5               | Component/browser test | 确认回填改变目标表单，取消/复制不改变目标表单     | unverified     |
| NFR2                 | Browser acceptance     | 桌面与窄屏 Sheet 可操作、无溢出、无 console error | unverified     |
| 真实模型             | Authenticated smoke    | 用户明确要求时验证保存配置                        | not-applicable |

## Perspective Collision

- Critic（价值分歧）：自动回填省步骤但会造成不可逆的错误感知；选择明确确认而非自动写入。
- Pragmatist（事实分歧）：三个页面已有不同本地草稿状态；共享对话壳、由调用方负责 target parser 和 apply 是最小改动。
- Innovator（假设分歧）：全局助手可随时可用，但容易丢失“填到哪个表单”的语义；选择表单上下文专属入口。
- Systems：SSE 原文与结构化候选必须分离，不能把未完成 JSON 当作表单数据。

Collision insight: 对话面板本身不拥有工程数据，只有调用方持有回填权限，既保留多轮创作又防止跨表单误写。Thinking preservation zone: 用户决定何时需求“已明确”，以及是否采纳、复制或手动修改候选结果。

## Key Decisions

- D1. 使用右侧 Sheet 而非内嵌聊天区或全局浮层。Reason: 保持原表单可见，明确回填目标并不占用工作区主内容。
- D2. 候选稿通过单独的“生成可回填草稿”动作产生。Reason: 避免把普通澄清对话误解为最终结构化数据。
- D3. 回填采用确认弹窗，回填后仍由现有表单保存动作持久化。Reason: 用户要求确认，且不改变已有数据所有权和保存边界。
- D4. 角色路径由后续 PRD `creative-assistant-character-form-save-2026-08-22` 覆盖 R3/R4 的“禁止自动改表单 / 必须弹窗填充”：可解析角色草稿先预览到左侧表单，对话内「保存角色」才持久化。脚本与分镜仍走 D3 确认弹窗。Reason: 角色页需要对照左侧表单看草稿，但不能把“已保存到项目记忆”误当成已填角色。

## Open Questions

### Must Resolve Before Planning

- 无。用户已明确选择侧边对话、确认回填、复制和手动输入并存的交互。

### Deferred To Planning

- Q1. 候选内容复制时采用结构化 JSON 还是用户可读文本；本轮默认复制可读预览文本。

## Consistency Check

- requirementsCount: 5
- nonFunctionalRequirementsCount: 2
- decisionsCount: 3
- openQuestionsCount: 1
