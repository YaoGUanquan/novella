---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-candidate-preview
origin: docs/ae/prds/creative-assistant-candidate-preview-2026-08-22.md
originFingerprint: 2026-08-22-creative-assistant-candidate-preview
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 候选稿预览改成中文摘要

## Source

`docs/ae/prds/creative-assistant-candidate-preview-2026-08-22.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

解析成功后，助手候选稿区默认显示中文标签摘要；原文折叠；复制和保存不变。

## Readiness

- Goal: 普通用户能读懂候选稿，不必面对 JSON 墙。
- Acceptance criteria: R1–R5。
- Non-goals: 不改回填/保存；不在对话里再做一套可编辑表单。
- Affected areas: `src/features/creative-assistant`
- Validation surface: 纯函数测试 + Sheet 测试。
- Open questions: Q1 在计划中关闭——未知 key 用中文表，没有则保留原 key。

## Validation Evidence (Conditional)

| Tier                               | Status         | Bounded claim                             |
| ---------------------------------- | -------------- | ----------------------------------------- |
| Static inspection                  | planned        | 解析成功主视图不再绑定 `candidateRaw`     |
| Focused automated test             | planned        | 姓名/中文标签可见；原文折叠；未解析仍原文 |
| Browser acceptance                 | unverified     | 本轮无可用浏览器验收                      |
| Authenticated service / deployment | not-applicable | 不触及                                    |

## Assumptions

- `candidate.value` 可能是对象、数组，或测试里那种 JSON 字符串；摘要层应对字符串尝试 JSON.parse。
- 工作区已有未提交改动，本任务继续在当前 `develop` 上增量修改，不 commit。

## Alternatives Considered

- Recommended: 结构化中文标签 + 折叠原文。
- Alternative: 把 JSON pretty-print 后当 Markdown 渲染。仍像代码。
- Rejected because: 完全删除原文会让复制/排障变差。

## Decision Drivers

- Driver 1: 普通用户可读。
- Driver 2: 与左侧表单标签对齐。
- Driver 3: 最小改动，不改保存链路。

## Decisions

### ADR-1 - 摘要在 feature 层纯函数生成，Sheet 只负责渲染

- Decision: `candidate-preview.ts` 把 `unknown` 转成节点树；React 组件只渲染。
- Drivers: 可单测、core 不引入 React。
- Alternatives: 在 Sheet 内联 JSX；角色专用组件。
- Why chosen: 脚本/分镜共用；测试不依赖 DOM。
- Consequences: 未知字段走兜底标签。
- Follow-ups: 无。

## Risks

- 字符串候选稿误解析成 JSON 导致摘要怪异。缓解：仅在 trim 后以 `{`/`[` 开头且能 parse 时才转换。
- 过深嵌套撑破侧栏。缓解：限制深度，超出显示简短文本。

## Pre-Mortem

- Failure scenario 1: 预览仍含 `"name"`，用户觉得没改。
- Failure scenario 2: 复制变成摘要文本，下游粘贴失败。
- Failure scenario 3: 未解析路径被摘要覆盖，排障变难。
- Mitigations: 测试覆盖这三条。

## Global Constraints

- 不改 `parseCharacterDrafts` 合同。
- 不新增依赖。
- 不 commit / push。

## Implementation Units

### U1 - 候选稿摘要纯函数

- Goal: 把解析结果变成带中文标签的节点树。
- Requirements covered: R1, R2, R3, NFR1
- Acceptance criteria covered: 角色字段中文；枚举中文；空字段省略。
- Depends on: none
- Files: `src/features/creative-assistant/candidate-preview.ts`, `src/__tests__/features/creative-assistant/candidate-preview.test.ts`
- Forbidden files: `src/core/**`, `package.json`
- Approach: 跳过 id 等内部键；角色/外观/服饰映射表；数组逐条成卡片。
- Tests: 牛来草稿含姓名/外观/服饰；空字段不出现；未知 key 保留。
- Validation: `corepack pnpm test -- src/__tests__/features/creative-assistant/candidate-preview.test.ts`
- Rollback signals: 摘要把 `id` 展示给用户，或丢失 name。
- Deferred to implementation: 深度上限取 4。

### U2 - 卡片改用摘要并折叠原文

- Goal: Sheet 解析成功显示摘要；失败显示原文；复制仍原文。
- Requirements covered: R1, R4, R5, NFR2
- Acceptance criteria covered: 主视图非 JSON；查看原文；复制原文。
- Depends on: U1
- Files: `src/features/creative-assistant/components/CandidatePreview.tsx`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Forbidden files: `src/core/**`, `src/pages/**`
- Approach: 解析成功渲染 `CandidatePreview`；`<details>` 放原文；未解析继续 `<pre>`。
- Tests: 生成牛来草稿后预览可见「姓名」「牛来」，预览 testid 不含 `"name"`；保存按钮仍在。
- Validation: `corepack pnpm test -- src/__tests__/features/creative-assistant`
- Rollback signals: 保存角色测试失败，或未解析路径消失。
- Deferred to implementation: 无。

## Consistency Check

- implementationUnitCount: 2
- sourceRequirementsCovered: R1,R2,R3,R4,R5,NFR1,NFR2
- sourceRequirementsDeferred: none
- openQuestionsCount: 0

## Validation Plan

- Unit: candidate-preview 纯函数测试。
- Integration: Sheet 生成草稿后的预览与保存。
- User flow: 浏览器 unverified。
- Data / operations: not-applicable。
- Observability: 无。

## Rollback / Recovery

还原 Sheet 候选稿区为 `<pre>{candidateRaw}</pre>` 并删除预览模块。

## Plan Self-Review

- Placeholder scan: 无占位。
- Consistency check: 2 units, R1–R5 均覆盖。
- Scope check: 不改保存链路。
- Acceptance coverage: 完整。
- Validation gaps: 浏览器 unverified。
- Alternatives and ADR check: 已记录。
- High-risk pre-mortem check: 非高风险，仍覆盖复制/未解析。

## Handoff

执行 U1 再 U2；不提交 Git。
