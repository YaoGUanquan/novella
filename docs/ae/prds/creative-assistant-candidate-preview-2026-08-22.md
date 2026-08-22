---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-candidate-preview
format: human-readable-requirements
sharded: false
---

# 候选稿预览改成普通用户可读摘要

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

角色草稿已能回填左侧表单，但助手候选稿区仍把整段 JSON 放在 `<pre>` 里。普通用户看到 `"name"`、`"role"` 等键，无法快速核对姓名、外观、服饰。复制和保存按钮本身可用，问题是默认展示。

成功信号：解析成功后，候选稿区默认显示中文标签和字段值；点保存/复制的行为不变。

## Requirements

**展示**

- R1. 解析成功的候选稿默认不得以原始 JSON 作为主视图。  
  Acceptance: 可见预览区出现角色名称等字段值，且不含 `"name"` 这类 JSON 键文本。
- R2. 角色候选稿须用与左侧表单对应的中文标签展示：姓名、定位、简介、性格、背景、性别、年龄、外观、服饰等已有字段。嵌套的外观、服饰展开为子项。空字段不展示。  
  Acceptance: 含 name/appearance/clothing 的草稿能读到「姓名」「外观」「服饰」及对应值。
- R3. 定位、服饰类型等枚举值用中文展示（如 protagonist→主角，top→上装）。  
  Acceptance: 预览中出现「主角」而不是必须阅读 `protagonist`。
- R4. 解析失败时仍展示候选稿原文，便于复制或继续澄清。  
  Acceptance: 无法解析时可见原始文本，没有伪装成已解析摘要。
- R5. 解析成功时仍可查看原始内容；「复制」继续复制原始候选稿，不复制格式化后的摘要。  
  Acceptance: 存在「查看原文」入口；复制内容等于生成时的原始字符串。

## Non-Functional Requirements

- NFR1. 脚本/分镜共用同一候选稿卡片，解析成功后同样改为可读摘要，不单独做成角色专用组件契约。  
  Acceptance: 任意解析为对象/数组的候选稿都能走出 JSON 主视图。
- NFR2. 不改保存、回填、记忆、模型输出合同。候选稿底层仍是 JSON。  
  Acceptance: 现有保存角色/填充表单测试仍通过。

## Must-Haves (Conditional)

- Requirement ID: R1  
  Must-have completion condition: 角色草稿预览默认看不到 JSON 花括号键值墙。

## Success Criteria

- 普通用户能在对话候选稿区用中文核对「牛来」的姓名、外观、服饰，再点保存。
- 需要原始数据时仍能复制或展开原文。

## Scope Boundary

### In Scope

- 助手候选稿区的默认展示与原文折叠。
- 通用对象/数组摘要，角色字段中文标签优先。

### Out Of Scope

- 把候选稿改成可在对话里直接编辑的表单。
- 改变 JSON 生成、解析、回填或保存流程。
- 新增 Markdown 依赖或把摘要渲染成聊天正文。

### Constraints

- 继续使用现有 UI 基元；不新增依赖。
- `core/` 不得引入 React。

## Validation Evidence (Conditional)

- Static inspection: 候选稿区不再把 `candidateRaw` 作为解析成功时的主视图。
- Focused automated test: 解析成功显示中文标签与姓名；原文折叠；未解析仍显示原文。
- Browser acceptance: 相关但本轮工具不可用时标 `unverified`。
- Authenticated service / deployment: not-applicable。

## Perspective Collision (Conditional)

- Perspectives: critic, pragmatist, innovator, systems.
- Disagreements: 价值分歧——是否完全隐藏 JSON；假设分歧——用户是否还需要核对原始结构。
- Collision insight: 批评「JSON 不可读」与系统「候选稿本质仍是结构化数据」可同时成立：默认给人看摘要，原文作为次要入口。
- Blind spot: 脚本/分镜字段若只做角色专用 UI，下一步会再投诉 JSON。
- Thinking preservation: 摘要标签的文案应贴近左侧表单，不要另造一套营销式叙事。

## Key Decisions

- D1. 默认展示结构化中文标签列表，而不是把 JSON 转成 Markdown 长文。  
  Reason: 与左侧表单字段对齐，扫描比段落更快。
- D2. 原始 JSON 保留在折叠的「查看原文」中；复制仍用原文。  
  Reason: 不丢掉排障和粘贴能力。
- D3. 用通用对象摘要覆盖脚本/分镜，角色枚举另做中文映射。  
  Reason: 同一卡片，避免下一步重复投诉。

## Dependencies And Assumptions

### Dependencies

- 现有 `parseCandidate` 成功后 `candidate.value` 可用。
- 角色字段来自当前 `Character` 与草稿解析。

### Assumptions

- 用户要改的是默认观感，不是保存语义。
- 未映射的脚本/分镜英文字段用中文兜底标签即可，不必一次做完所有枚举。

## Open Questions

### Deferred To Planning

- Q1. [Affects NFR1][technical] 未知字段标签用固定中文表还是 key 原样；计划里选固定表加兜底。

## Evidence Notes

- 当前主视图是 `<pre>{candidateRaw}</pre>` -> Evidence: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`
- 用户截图为已回填后的 JSON 数组 -> Evidence: 本轮附件与对话。

## Consistency Check

- requirementsCount: 5
- nonFunctionalRequirementsCount: 2
- decisionsCount: 3
- openQuestionsCount: 1
