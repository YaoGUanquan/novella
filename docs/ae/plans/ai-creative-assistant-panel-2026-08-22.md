---
type: plan
status: implemented
date: 2026-08-22
title: ai-creative-assistant-panel
origin: docs/ae/prds/ai-creative-assistant-panel-2026-08-22.md
originFingerprint: ai-creative-assistant-panel-2026-08-22
depth: deep
format: human-readable-plan
sharded: false
---

# AI 创作助手侧边对话与回填实施计划

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Plan Readiness

- Requirements: `docs/ae/prds/ai-creative-assistant-panel-2026-08-22.md`。
- Design: `docs/ae/designs/ai-creative-assistant-panel-2026-08-22/design.md`。
- Decision drivers: 用户确认优先、目标表单上下文明确、复用现有 SSE 和 UI 原语。
- Validation: Jest component/logic test、TypeScript、ESLint、Vite build、桌面/窄屏浏览器验收；不进行真实付费请求。

## Alternatives

1. 保留各表单内联的 SSE 回复区：改动最小，但不支持自然多轮澄清且占用表单空间，拒绝。
2. 推荐：共享侧边 Sheet，target parser/apply 由调用方提供：支持多轮、确认回填，且不引入全局状态或新依赖。
3. 全局聊天中心加路由状态：可跨页面保存历史，但需要额外持久化和目标绑定，超出本轮。

## Pre-mortem

- 候选数据误写到错误表单：每个入口闭包绑定唯一 target 和 `onApply`；恢复信号是取消确认时表单发生变化，立即阻断交付。
- 部分 JSON 被当作最终候选：候选阶段只在流结束后解析；恢复信号是解析异常后任何表单变化。
- Sheet 在窄屏遮挡输入或无法关闭：浏览器以 390px 宽度验证关闭、输入与发送；恢复信号是回退至现有内联入口。

## Implementation Units

### U1. 构建共享 AI 创作助手 Sheet

- Requirements: R1, R2, R3, R4, R5, NFR1, NFR2
- Design: ADR-001, ADR-002, ADR-003; EP-001; ST-001..ST-004
- Depends on: none
- Owned files:
  - `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`
  - `src/features/creative-assistant/types.ts`
  - `src/features/creative-assistant/index.ts`
  - `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Forbidden files: AI provider credentials, secure storage, server endpoints, global application layout.
- Work: 使用现有 Sheet、ScrollArea、ConfirmDialog、Button/Input/Textarea 建立消息时间线、SSE 状态、候选生成、复制、停止和确认回填；调用方控制候选 parser 与表单 apply。
- Validation: 先写 TC-001 至 TC-003 的失败测试；断言首 chunk、abort、解析失败、确认/取消回填。
- Rollback signals: 候选未确认时调用 `onApply`、或取消后流继续更新。
- Deferred: 聊天记录持久化。

### U2. 替换脚本、角色与分镜的内联入口

- Requirements: R1, R3, R4, R5, NFR2
- Design: ADR-001, ADR-003; ST-004
- Depends on: U1
- Owned files:
  - `src/pages/project-detail/ProjectDetailPage.tsx`
  - `src/pages/project-detail/hooks/projectDetailActions.ts`
  - `src/pages/project-detail/hooks/useProjectDetail.ts`
  - `src/pages/project-edit/components/StepCharacter.tsx`
  - `src/pages/project-edit/components/StepScript.tsx`
- Forbidden files: model settings, remote-video request logic, Tauri command contracts.
- Work: 将三个入口替换为上下文悬浮图标；构建各 target prompt、parser 与 `onApply`；保留手动编辑与已有确认保存。删除上一轮只服务内联 SSE 的冗余生成 UI/本地流控制，不删除已验证的基础 `aiService` SSE 能力。
- Validation: 表单回填前后断言、工程保存流程 smoke、浏览器验收。
- Rollback signals: 已确认脚本、角色或分镜无法编辑/保存，或现有手动路径丢失。
- Deferred: 可跨页面的连续聊天。

### U3. 更新流程证据并完成交互验收

- Requirements: NFR1, NFR2
- Depends on: U1, U2
- Owned files:
  - `docs/00-process/active/ai-assisted-creative-and-video-materials-2026-08-22/progress.md`
  - `docs/ae/reviews/ai-creative-assistant-panel-2026-08-22.md`
- Forbidden files: secrets, generated bundles.
- Work: 记录 red-green、浏览器桌面/窄屏结果、代码评审和认证服务未验证边界。
- Validation: focused tests, `pnpm exec tsc --noEmit`, scoped ESLint, `pnpm run build`, browser check。
- Rollback signals: 本地/浏览器证据混同为真实模型验证时，停止交付并修正证据声明。

## Evidence Matrix

| Acceptance criterion | Tier                        | Expected proof                                          | Owner | Status         | Recovery                                 |
| -------------------- | --------------------------- | ------------------------------------------------------- | ----- | -------------- | ---------------------------------------- |
| R2-R4                | Focused component test      | SSE chunk、候选隔离、确认/取消回填行为                  | U1    | unverified     | retain form value and cancel stream      |
| R1, R5               | Integration/browser         | 各 target 入口、复制和手动编辑可用                      | U2    | unverified     | restore existing form controls           |
| NFR2                 | Browser acceptance          | 390px + desktop Sheet 可关闭、无 overflow/console error | U3    | unverified     | reduce Sheet to full-width mobile layout |
| Actual provider      | Authenticated service smoke | 用户明确授权时才调用                                    | user  | not-applicable | do not send project text                 |

## Plan Self-Review

- R1-R5、NFR1-NFR2 都映射到 U1-U3 或证据矩阵。
- 不新增依赖、后端接口、持久化结构或模型设置。
- U1 是唯一共享状态所有者；U2 只拥有 target-specific 表单映射，文件所有权无冲突。
- 计划状态：需要需求/设计/计划文档 review 与 Git/worktree gate 后实施。
