---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-multi-skill-closer
format: human-readable-requirements
sharded: false
---

# 创作助手多技能收口：保留各技能结果，结尾只问一件事

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

用户可在一轮里点选多个 AE 技能（例如想法发散 + 文案润色）。当前实现把多套指令拼进同一轮请求，每个技能又各自要求「最小下一步」，模型会输出两份完整结果和两个请确认，用户不知道回哪一句。

用户已选定：两份结果都留，结尾只问一件事。

成功信号：多选技能后仍能看到各技能产出；文末只有一个「本轮结论」和一组互斥选项；用户用一句话就能继续。

## Requirements

- R1. 用户本轮点选 2 个及以上可见技能时，助手必须分别完成每个点选技能的可见结果，不得只保留其中一个技能的产出。  
  Acceptance: 多选「想法发散」和「文案润色」的系统/用户指令仍包含这两项技能指令；合同禁止用「只做一个技能」替代多选。
- R2. 上述多选轮次中，各技能正文内不得再写各自的「最小下一步推荐」或并列的请确认。  
  Acceptance: 多选时的提示合同明确禁止技能内单独下一步；单选时仍允许该技能一次最小下一步。
- R3. 多选轮次必须在全文最后（技能标记与状态标记之前）只出现一次「本轮结论」：一句话建议，加上 2–3 个互斥选项，用户只需回复其中一项。  
  Acceptance: 多选提示含「本轮结论」和「互斥选项」；测试能断言该合同出现在 2+ 点选时、不出现在 0–1 个可见技能点选时。
- R4. 不因此把 AE 技能升级为可执行工作流；写表单与保存记忆仍需确认。  
  Acceptance: 无新增对 SKILL.md / ae.mjs 的运行时读取；无确认时 onApply 与已保存记忆不变。

## Non-Functional Requirements

- NFR1. 收口靠本轮提示词合同，不要求解析模型正文去拦第二份「最小下一步」。真实模型是否遵守合同保持 unverified，直到用户要求服务冒烟。  
  Acceptance: 自动化只证明提示合同；不把单次模型输出当作通过条件。

## Must-Haves (Conditional)

- Requirement ID: R3
  Must-have completion condition: 多选技能的提示里存在唯一文末结论合同。

## Success Criteria

- 点选两个技能发送后，用户仍能看到两份结果，但只需要回答一个选择题。
- 单选技能行为不倒退成没有下一步。

## Scope Boundary

### In Scope

- 多选可见技能时的提示词收口合同。
- 单选时保留「一个下一步」。

### Out Of Scope

- 把下一步做成可点击按钮/芯片（可后续做）。
- 每轮只跑一个技能，或自动流水线（先发散再润色）。
- 真实工具循环、执行 AE 技能文件。

### Constraints

- 延续：AE 可选技能第一期只做提示词转向。
- `<novella-skill>` 产品标记仍每轮最多一个；这与「多个可见技能出多份正文」不冲突。

## Validation Evidence

| Acceptance criterion   | Tier                        | Expected signal                                        | Status                             |
| ---------------------- | --------------------------- | ------------------------------------------------------ | ---------------------------------- |
| R1–R3                  | Focused automated test      | 2+ 点选时提示含分节完成 + 本轮结论；单选不含多选收口段 | unverified                         |
| R4                     | Static + existing tests     | 无 SKILL.md 执行；写保护测试仍过                       | unverified                         |
| 真实模型是否只问一件事 | Authenticated service smoke | 不作为本期通过条件                                     | not-applicable until user requests |

## Perspective Collision

- Perspectives: critic, pragmatist, innovator, systems.
- Disagreements: 批评视角要保留两份作业；务实视角要一个可回答的下一步。用户选择两者同时成立。
- Collision insights: 内容可并列，决策必须收口。
- Blind spots: 两个技能下一步互相矛盾时（一个还问姓名，一个已把姓名写进润色稿），结论选项如何取舍由模型按用户最新确认事实决定；不在本期做规则引擎。
- Thinking preservation zone: 不把多选改成禁止。

## Key Decisions

- D1. 采用「两份结果都留，结尾只问一件事」。  
  Reason: 用户在 2026-08-22 明确选择推荐方案。
- D2. 收口通过提示合同实现，不做结构化按钮。  
  Reason: 本期最小改动；按钮可作为后续。

## Assumptions

- 用户多选是有意同时要两份产出，而不是误触。
- 模型在明确合同下多数时候会把结论放到文末；不能 100% 保证。

## Open Questions

- 无。结构化下一步芯片明确推迟。

## Alternatives Considered

- 每轮只跑一个技能：用户未选。
- 多选改流水线：用户未选。

## Consistency Check

- requirementCount: 4
- nonFunctionalRequirementCount: 1
- decisionCount: 2
- openQuestionCount: 0
