---
type: experience
status: captured
date: 2026-08-22
scope: repo-specific
title: project-creation-ai-context-and-inspiration
---

# 新建工程 AI 上下文与随机灵感

## 问题

创建页原本只把名称和概要作为基础字段保存，画风和画幅在项目 slice 中丢失；“随机灵感”也只使用静态数组，后续助手无法获知完整视觉约束。

## 关键决策

1. 保存 `artStyle` 和 `aspectRatio` 为可选项目字段，兼容历史项目。
2. 由 feature 适配层调用已配置对话 SSE，shared 弹窗通过回调注入，避免违反依赖边界。
3. SSE 只传递创作上下文，不传 API Key、endpoint 或连接配置。
4. 严格解析 JSON 失败时回退本地灵感，保证创建流程可用。

## 验证

- `pnpm exec jest --runInBand src/__tests__/stores/project.store.test.ts src/__tests__/features/CreateProjectModal.test.tsx src/__tests__/features/AICreateProjectModal.test.ts`
- `pnpm run build:check`
- `git diff --check`

结果：3 suites / 10 tests 通过，构建通过，差异检查通过；`pnpm run docs:check-links` 通过。`pnpm run docs:check` 被仓库现有 `scripts/check-docs.ts` 的 ESM `__dirname` 错误阻断，非本次文档内容错误。真实供应商 SSE 未使用用户凭据验证。

## 可复用经验

- 共享 UI 与 AI service 之间优先使用 feature adapter 或依赖注入，不要直接跨层导入。
- 任何模型生成的表单草稿都应保持“回填但不自动提交”，并提供可预测的离线兜底。
