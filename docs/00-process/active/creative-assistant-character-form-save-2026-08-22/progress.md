# 角色对话回填与对话内保存

- 状态：complete
- 需求：`docs/ae/prds/creative-assistant-character-form-save-2026-08-22.md`
- 计划：`docs/ae/plans/creative-assistant-character-form-save-2026-08-22.md`
- 共识门：用户要求先补全表单再对话保存；文档评审无阻断。
- 验证：`corepack pnpm test -- src/__tests__/features/creative-assistant src/__tests__/pages/parse-character-drafts.test.ts src/__tests__/services/assistant-skills.test.ts` → 39 passed
- 偏差：无
- 未验证：浏览器、真实模型是否主动 propose-candidate
