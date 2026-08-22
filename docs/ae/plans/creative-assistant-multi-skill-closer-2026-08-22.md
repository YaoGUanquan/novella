---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-multi-skill-closer
origin: docs/ae/prds/creative-assistant-multi-skill-closer-2026-08-22.md
originFingerprint: creative-assistant-multi-skill-closer-2026-08-22
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 多技能保留结果并统一文末结论

## Source

- `docs/ae/prds/creative-assistant-multi-skill-closer-2026-08-22.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

仅改点选技能的提示合同与对应测试。不改技能执行模型、不新增多轮流水线、不做可点选项 UI。

## Readiness

- Goal: 多选技能时提示要求保留各技能正文，并只在文末问一件事。
- Acceptance criteria: PRD R1–R4。
- Non-goals: 点击芯片、真实工具循环。
- Affected areas: `formatSelectedSkillsForPrompt`、可选的 `sendMessage` 用户指令、`ae-ideate` 单技能「最小下一步」措辞。
- Validation surface: Jest（assistant-skills / creative-assistant-memory）。
- Open questions: 无。

## Validation Evidence

| Acceptance criterion | Applicable tier        | Expected signal and bounded claim                 | Preconditions / owner | Status         | Recovery or rollback signal          |
| -------------------- | ---------------------- | ------------------------------------------------- | --------------------- | -------------- | ------------------------------------ |
| R1–R3 提示合同       | Focused automated test | 2+ 可见技能点选时含「本轮结论」；单选不含该多选段 | Jest                  | unverified     | 还原 `formatSelectedSkillsForPrompt` |
| 真实模型收口         | Authenticated smoke    | 不作为本期证明                                    | 用户凭据              | not-applicable | 无                                   |

## Assumptions

- 只改提示即可满足本期；不解析模型输出做拦截。

## Alternatives Considered

- Recommended: 在 `formatSelectedSkillsForPrompt` 对 2+ 可见技能追加收口合同。
- Alternative: 发送时拆成两次模型调用。Rejected：超出选定方案，成本高。
- Alternative: UI 可点选项。Rejected：D2 推迟。

## Decision Drivers

- Driver 1: 兑现用户选定的 A 方案。
- Driver 2: 最小改动，保持提示词转向边界。
- Driver 3: 单选不倒退。

## Decisions

### ADR-1 - 收口合同挂在 formatSelectedSkillsForPrompt

- Decision: 统计 `visibility === 'user-selectable'` 的点选数量；>=2 时追加多选收口段。
- Why chosen: 系统提示与用户指令都会经过该函数或等价 selectedSkillIds；单测最稳。
- Consequences: `sendMessage` 可再加一句用户侧强调，但不作为唯一来源。

## Implementation Units

### U1 - 多选收口提示合同

- Goal: 2+ 点选时注入「保留各结果 + 文末本轮结论」。
- Requirements covered: R1, R2, R3, R4
- Acceptance criteria covered: 提示断言；无 SKILL.md 读取。
- Depends on: none
- Files: `src/core/services/ai/assistant-skills/parse-skill-marker.ts`, `src/core/services/ai/assistant-skills/ae-catalog.ts`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/services/assistant-skills.test.ts`, `src/__tests__/features/creative-assistant/creative-assistant-memory.test.ts`
- Forbidden files: `src-tauri/**`, `src/core/services/ai/text/**`
- Approach: `formatSelectedSkillsForPrompt` 追加多选合同；`ae-ideate` 指令改为多选时不写技能内最小下一步；`sendMessage` 在多选时强调结尾只问一件事。
- Tests: 2 技能含本轮结论；1 技能不含「多个技能」收口段。
- Validation: `corepack pnpm test -- src/__tests__/services/assistant-skills.test.ts src/__tests__/features/creative-assistant`
- Rollback signals: 还原上述提示字符串。
- Deferred to implementation: 收口段中文措辞。

## Consistency Check

- implementationUnitCount: 1
- sourceRequirementsCovered: R1-R4
- sourceRequirementsDeferred: 无
- openQuestionsCount: 0

## Plan Self-Review

- Placeholder scan: 无
- Scope check: 仅提示合同
- Acceptance coverage: R1-R4 映射到 U1
- Validation gaps: 真实模型 unverified

## Handoff

实现 U1 后跑聚焦 Jest。
