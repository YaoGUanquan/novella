---
type: plan
status: implemented
date: 2026-08-22
title: editor-truthful-workflow
origin: docs/ae/prds/editor-truthful-workflow-2026-08-22.md
originFingerprint: 2026-08-22-editor-truthful-workflow
depth: standard
format: human-readable-plan
sharded: false
---

# 编辑器真实工作流实施计划

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Chosen Approach

1. 复用现有表单、图片服务和协作服务：最小改动，符合本仓库结构。
2. 新建全局编辑器 store：拒绝，会与当前 Context/store 双写且不解决演示数据问题。
3. 保留 demo 并附说明：拒绝，用户明确要求真实工作流，仍会造成误导。

## Units

### U1 恢复角色手动表单

- Covers: R1, AC1, ADR-001, ST-001, TC-001
- Depends on: none
- Owns: `src/pages/project-edit/components/StepCharacter.tsx`
- Change: 在空角色及已有角色状态保留 `CharacterDesigner` 手动创建入口；保存时更新当前角色并沿用项目保存边界。AI 草稿区域保持独立。
- Validation: focused component/page test, TypeScript.
- Rollback signal: 保存手动角色无法进入已确认列表时回退该单元。

### U2 恢复协作加载与面板查询

- Covers: R5, AC5, ADR-003, ST-004, T-001, TC-004
- Depends on: none
- Owns: `ProjectEditContext.tsx`, `project-edit-state.ts`, `CollaborationPanel.tsx`, loader/context tests as needed
- Change: 传递/恢复 loader 协作数据，以实际工程 ID 查询评论；hydrate 运行期服务。
- Validation: collaboration and project-edit focused tests, TypeScript.
- Rollback signal: 重新打开工程后数据重复或误归属时，撤回 hydrate 初始化。

### U3 去除分镜伪状态并接入图片服务

- Covers: R2-R4, R6, AC2-AC4, AC6, ADR-002, ST-002, ST-003, TC-002, TC-003
- Depends on: U2
- Owns: `StoryboardEditor.tsx`, `StepStoryboard.tsx`, relevant tests
- Change: 删除 demo 回退与定时图片切换，空态替代；异步调用 `generateImage`；真实视频才播放；中文化并统一深色输入对比度；改正不发 AI 的按钮文案。
- Validation: mocked image-service test, TypeScript, lint, build, browser without provider request.
- Rollback signal: 图片生成失败替换已有 URL 或空态仍出现 demo 时回退该单元。

### U4 评审、验证与交付证据

- Covers: TC-001-TC-005
- Depends on: U1, U2, U3
- Owns: focused tests, process evidence, review and gate records
- Change: 运行 scoped tests、types、lint、build、浏览器验收；记录未做的认证服务 smoke。
- Validation: exact command results recorded in progress/gate.
- Rollback signal: 任一回归未被定位前不得宣称完成。

## Preconditions and Safety

- Existing worktree is dirty and on `develop`; the user previously authorized continuing this task there. Preserve all unrelated changes and perform no Git write.
- Tests must mock image generation; do not call user-configured providers or expose secrets.

## Pre-mortem

1. 类型边界不同导致 loader 数据无法 hydrate。Mitigation: 在初始化边界显式窄化数组并用 focused tests。
2. 异步图片请求完成时用户切换选中帧。Mitigation: 用请求开始时的 frame ID 回写，不读取稍后的 selection。
3. `CharacterDesigner` 内部 state 不随已确认数组重置。Mitigation: 只把它作为创建表单挂载，已确认角色沿用现有小卡编辑。

## Validation Contract

- `pnpm test -- --runInBand <focused test files>`
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint <touched files> --quiet`
- `pnpm run build`
- Browser: 编辑器中文空态、手动角色表单、评论/版本、深色输入与 console；不发送真实 provider 请求。
