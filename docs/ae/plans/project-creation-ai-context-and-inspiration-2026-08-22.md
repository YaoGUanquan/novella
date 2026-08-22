---
type: plan
status: completed
date: 2026-08-22
title: project-creation-ai-context-and-inspiration
origin: docs/ae/prds/project-creation-ai-context-and-inspiration-2026-08-22.md
originFingerprint: 2026-08-22-project-creation-ai-context-and-inspiration
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 新建工程 AI 上下文与随机灵感

## Source

`docs/ae/prds/project-creation-ai-context-and-inspiration-2026-08-22.md`

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Readiness

- Goal: 持久化创建页元信息，向后续助手提供完整上下文，并将随机灵感接入配置化对话模型。
- Acceptance criteria: R1-R5 / AC1-AC5。
- Non-goals: 自动创建工程、读取密钥、引入联网搜索。
- Affected areas: `ProjectData`、项目 slice、创建弹窗、四个助手调用点、Jest。
- Validation surface: focused Jest、`pnpm run build:check`、用户本地服务验证。
- Open questions: 无；模型失败使用既有本地样本是明确降级行为。

## Validation Evidence

| Acceptance criterion | Applicable tier             | Expected signal                | Preconditions / owner | Status     | Recovery        |
| -------------------- | --------------------------- | ------------------------------ | --------------------- | ---------- | --------------- |
| AC1                  | Focused automated test      | store 保留画风和画幅           | Jest                  | passed     | 回退 slice 改动 |
| AC3-AC5              | Focused automated test      | SSE 结果回填；失败回退本地样本 | Jest mock             | passed     | 保留可编辑表单  |
| AC1-AC5              | Integration/build           | 类型与打包成功                 | pnpm                  | passed     | 修正构建        |
| AC3                  | Authenticated service smoke | 真实助手生成灵感               | 用户本地密钥          | unverified | 检查对话服务    |

## Contract Value Classification

- Canonical persisted value: `ProjectData.name`、`description`、`artStyle`、`aspectRatio`。
- Derived representation: AI 请求中的项目上下文及随机灵感草稿。
- Caller-controlled input: 创建表单内容、画风和画幅选择。
- Trust boundary: 远程对话服务；请求不得包含服务连接设置。

## Alternatives Considered

- Recommended: feature 层适配组件调用既有 `aiService.streamConfiguredDialogue`，shared 创建弹窗通过注入回调接收流式结果；严格 JSON 解析失败时使用本地样本。
- Alternative: 复用侧边 AI 助手。拒绝，因为工程尚未创建，没有项目级会话或回填目标。
- Alternative: 删除本地随机样本。拒绝，因为会让未配置或临时故障时的创建流程不可用。

## Decisions

### ADR-1 - AI 优先、离线兜底

- Decision: 随机灵感总是先尝试对话模型，失败后自动选择本地样本。
- Drivers: 满足动态灵感需求，同时保留离线创建能力。
- Alternatives: 仅 AI 或仅静态样本。
- Why chosen: 不把模型连通性作为工程创建的单点依赖。
- Consequences: 成功路径会产生一次模型请求。

## Risks

- 模型可能返回 Markdown 或非 JSON；解析必须拒绝并降级。
- 其他项目创建调用方依赖 `ProjectData` 现有字段；类型扩展必须保持可选和兼容。

## Implementation Units

### U1 - 保留工程创作元信息

- Goal: 在类型和项目 slice 中持久化画风与画幅。
- Requirements covered: R1。
- Acceptance criteria covered: AC1。
- Depends on: none。
- Files: `src/core/project/types/project.ts`, `src/stores/slices/projectSlice.ts`, `src/__tests__/stores/project.store.test.ts`。
- Forbidden files: 已保存项目数据与密钥存储。
- Validation: focused store Jest。
- Rollback signals: 新建工程缺失基础字段或已有 store 测试回归。

### U2 - SSE 随机灵感与助手上下文

- Goal: 使用配置化对话模型生成可编辑灵感，并让四个助手入口带上视觉约束。
- Requirements covered: R2-R5。
- Acceptance criteria covered: AC2-AC5。
- Depends on: U1。
- Files: `src/shared/components/project/CreateProjectModal.tsx`, `src/features/project/components/AICreateProjectModal.tsx`, `src/features/home/components/ProjectGrid.tsx`, `src/features/home/components/HeroSection.tsx`, `src/shared/components/layout/AppLayout/AppLayout.tsx`, `src/shared/components/layout/AppLayout/types.ts`, `src/app/index.tsx`, `src/pages/project-edit/components/StepCharacter.tsx`, `src/pages/project-edit/components/StepScript.tsx`, `src/pages/project-edit/components/StepStoryboard.tsx`, `src/pages/project-detail/ProjectDetailPage.tsx`, `src/__tests__/features/CreateProjectModal.test.tsx`, `src/__tests__/features/AICreateProjectModal.test.ts`。
- Forbidden files: 服务连接配置与 API Key。
- Validation: focused modal/adapter Jest; build。
- Rollback signals: AI 调用失败时本地样本仍可回填。

## Validation Plan

- Unit: store 元信息和模态框 SSE 成功/失败路径。
- Integration: `pnpm run build:check`。
- User flow: 选择画风/画幅，点击随机灵感，编辑回填结果，创建工程后打开助手确认上下文。
- External: 不自动调用用户真实密钥。

## Completion Review

- Placeholder scan: passed。
- Acceptance coverage: R1-R5 映射至 U1-U2。
- Validation gap: 真实认证模型调用和浏览器截图需用户本地验证；不影响 mock/构建交付。
- Final gate: `docs/ae/gates/20260822T101500Z-project-creation-ai-context-and-inspiration-final.json`。
