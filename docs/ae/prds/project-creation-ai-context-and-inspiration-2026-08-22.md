---
type: prd
status: implemented
date: 2026-08-22
title: project-creation-ai-context-and-inspiration
format: human-readable-prd
---

# PRD: 新建工程 AI 上下文与随机灵感

## Problem

新建工程弹窗收集工程名称、剧情概要、视觉画风和画幅，但项目创建存储层会丢弃画风和画幅。编辑页的 AI 创作助手也只携带名称、简介和正文，因此模型无法完整理解项目的视觉约束。弹窗“随机灵感”目前只从静态数组选择内容，未利用已配置的对话模型。

## Goals

- R1: 新建工程时持久化工程名称、剧情概要、画风和画幅。
- R2: 在角色、脚本、分镜和项目详情的 AI 创作助手请求中携带已保存的画风与画幅。
- R3: 点击“随机灵感”时，优先通过已配置对话模型 SSE 生成工程名称与剧情概要，并把结果回填到可编辑输入框。
- R4: AI 灵感请求携带当前已输入名称/概要、已选画风和画幅作为创作约束；不得发送 API Key 或连接配置。
- R5: 对话模型不可用、返回非预期内容或被取消时，保留现有本地随机灵感兜底，且用户仍可创建工程。

## Acceptance Criteria

- AC1: 新建工程后，其 `ProjectData` 可读到 `artStyle` 与 `aspectRatio`。
- AC2: 四个创作助手入口的 `projectContext` 包含“视觉画风”和“目标画幅”。
- AC3: 已配置模型成功返回严格 JSON 时，随机灵感按钮流式等待并回填标题与概要。
- AC4: 生成期间按钮禁用并显示生成状态；发生失败时显示提示并填入本地灵感。
- AC5: 随机灵感的模型请求中有画风、画幅和当前表单内容，不含 API Key。

## Non-goals

- 不自动创建工程或自动提交灵感结果。
- 不新增模型配置、联网搜索或图片生成。
- 不调用真实用户密钥进行自动测试。

## Validation Contract

- Jest 覆盖项目元数据持久化与随机灵感的 SSE 回填/兜底。
- TypeScript 和 Vite 构建通过。
- 用户在当前本地服务配置下手动验证一次成功 SSE，状态在交付前保持 `unverified`。

## Implementation Record

- `ProjectData` 已新增可选 `artStyle` 和 `aspectRatio`，项目 slice 会保留创建时的值。
- 创建弹窗保持在 shared 层，通过 `generateInspiration` 注入回调；真正的 SSE 调用位于 `src/features/project/components/AICreateProjectModal.tsx`。
- 首页、Hero 和全局布局的新建工程入口统一使用 feature 适配组件；模型失败时回退本地灵感。
- 角色、脚本、分镜和详情页 AI 助手上下文均追加视觉画风与目标画幅。

## Evidence

- focused Jest：3 suites / 10 tests passed。
- `pnpm run build:check`：passed。
- `git diff --check`：passed（仅存在既有换行风格警告）。
- 真实供应商 SSE 与浏览器交互截图：未验证，未使用用户保存的密钥。
