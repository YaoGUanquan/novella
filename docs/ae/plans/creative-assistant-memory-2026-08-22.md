---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-memory
origin: docs/ae/prds/creative-assistant-memory-2026-08-22.md
---

# 创作助手项目记忆实施计划

## Scope

在 `src/features/creative-assistant/` 内完成纯逻辑、项目级本地记忆和侧边 Sheet 交互；不改 Provider、Tauri 或项目持久化契约。

## Units

### U1. 记忆与状态契约

- 新增 `creative-assistant-memory.ts`：类型、默认值、localStorage 读写、状态标记解析、intake prompt 构造。
- 状态解析失败时保留自然语言正文，不更新记忆。

### U2. Sheet 接入

- 普通对话携带已保存记忆和 intake 规则。
- 流式输出隐藏状态标记；回复完成后展示本轮识别内容。
- 用户确认后合并记忆；新建对话不删除记忆；提供清除当前项目记忆入口。
- 候选稿请求不带状态标记，保留现有解析/确认回填流程。

### U3. 验证

- 新增纯函数测试和 Sheet 回归测试。
- 运行创作助手测试、`pnpm exec tsc --noEmit`、`pnpm run build`；真实模型请求不执行。

## Risks / Rollback

- 模型不遵守状态标记：正文仍可用，记忆不更新；不影响聊天或候选稿。
- localStorage 不可用或配额不足：助手继续工作，记忆回退为空。
- 回滚时删除新增 memory 模块并恢复 Sheet 调用，不触及项目表单和 Provider 代码。
