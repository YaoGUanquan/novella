---
type: code-review
status: pass-with-unrelated-suite-failure
date: 2026-08-22
title: creative-assistant-memory
---

# 创作助手项目记忆代码审查

## Findings

无本次改动范围内的阻断问题。

## Review Scope

- `src/features/creative-assistant/creative-assistant-memory.ts`
- `src/features/creative-assistant/creative-assistant-session.ts`
- `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`
- 对应 Jest 测试和 AE 需求/计划文档

## Checks

- 状态标记经过长度、数量、类型和重复值归一化；解析失败只保留自然语言正文。
- 项目记忆仅在用户点击“保存本轮记忆”后合并；清除只操作本项目 memory key。
- 普通对话和候选稿请求分离；候选稿仍经过现有 parser 与确认弹窗才回填。
- 项目/会话切换使用 loaded-project guard，避免将旧项目状态写入新项目的 localStorage key。
- 未引入第三方运行时、Provider、endpoint、密钥或联网工具。

## Evidence

- `pnpm exec jest --runInBand src/__tests__/features/creative-assistant`：2 suites / 10 tests passed。
- `pnpm exec tsc --noEmit`：passed。
- `pnpm exec eslint src/features/creative-assistant --quiet`：passed。
- `pnpm run build`：passed；仅有已有动态/静态导入拆包提示。
- `pnpm exec jest --runInBand`：67 suites passed；`src/__tests__/services/github-issues-resolution.test.tsx` 1 suite failed，失败断言为既有 SettingsPage `novella_working_dir` 写入行为，与本次变更文件无交集。

## Residual Risk

真实模型是否稳定输出 `<novella-state>`、浏览器 CORS、Tauri 端存储权限和多模态供应商能力仍需在用户已配置服务的环境中验收；不影响无状态标记时的普通聊天和候选稿流程。
