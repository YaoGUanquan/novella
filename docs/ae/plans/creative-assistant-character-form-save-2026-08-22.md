---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-character-form-save
origin: docs/ae/prds/creative-assistant-character-form-save-2026-08-22.md
originFingerprint: creative-assistant-character-form-save-2026-08-22
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 角色对话回填与对话内保存

## Source

- `docs/ae/prds/creative-assistant-character-form-save-2026-08-22.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

角色步骤：完整字段解析、候选成功后预览回填、对话内保存、Designer 读取草稿。助手增加可选 autoPreview/onPersist，默认路径不变。

## Readiness

- Goal: 对话草稿进入可见角色表单，保存发生在对话里。
- Acceptance criteria: PRD R1–R5。
- Non-goals: 脚本/分镜同款、无确认自动落库。
- Affected areas: 助手 Sheet、StepCharacter、CharacterDesigner、propose-candidate 指令。
- Validation surface: Jest（助手 + 角色解析）。
- Open questions: 无。

## Alternatives Considered

- Recommended: 候选解析后 `onApply` 预览；对话「保存角色」调用 `onPersist`。
- Alternative: 把草稿直接写入手动空表单的内部 state。Rejected：两套表单仍分裂。
- Alternative: 记忆保存时顺带写角色。Rejected：记忆 ≠ 角色表单。

## Implementation Units

### U1 - 解析完整角色草稿

- Requirements covered: R1
- Depends on: none
- Files: `src/pages/project-edit/components/parse-character-drafts.ts`, `src/__tests__/pages/parse-character-drafts.test.ts`, `src/pages/project-edit/components/StepCharacter.tsx`
- Forbidden files: `src-tauri/**`
- Approach: 从 StepCharacter 抽出解析；映射 appearance/clothing；更新 candidateInstructions。
- Validation: Jest 解析用例。
- Rollback signals: 还原内联 parseCharacterDrafts。
- Deferred to implementation: 服装 type 白名单。

### U2 - 助手预览回填与对话保存

- Requirements covered: R2, R3, R4
- Depends on: U1
- Files: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`, `src/core/services/ai/assistant-skills/ae-catalog.ts`, `src/pages/project-edit/components/StepCharacter.tsx`
- Forbidden files: `src-tauri/**`
- Approach: `autoPreviewCandidate` + `onPersist`；预览不关 Sheet；角色页接入；propose-candidate 指令补充角色表单触发。
- Validation: 预览不点填充即 onApply；保存才 onPersist；默认路径仍要填充确认。
- Rollback signals: 去掉新 props。
- Deferred to implementation: 按钮文案。

### U3 - Designer 水合草稿

- Requirements covered: R5
- Depends on: U1
- Files: `src/features/character-consistency/components/CharacterDesigner.tsx`
- Forbidden files: `src-tauri/**`
- Approach: 以 `characters[0] ?? character` 为源水合；编辑时 `onChange`。
- Validation: 若无现成测试，用解析+页面接线的聚焦测试或组件断言姓名。
- Rollback signals: 还原忽略 characters。
- Deferred to implementation: 多角色列表 UI。

## Consistency Check

- implementationUnitCount: 3
- sourceRequirementsCovered: R1-R5
- openQuestionsCount: 0

## Plan Self-Review

- 无 TBD。脚本/分镜保持默认。真实模型是否主动 propose-candidate 仍 unverified。
