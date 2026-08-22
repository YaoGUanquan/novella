---
type: code-review
status: comment
date: 2026-08-22
scope: creative-assistant-visible-content
---

# 代码评审：助手可见正文去标记与换行

## Findings

无 P0/P1。

- [P3] 未闭合 JSON 仍可能解析失败 - `src/features/creative-assistant/creative-assistant-memory.ts:183`
  Evidence: 只有 payload 是完整 JSON 时才会恢复本轮状态；截断 JSON 只隐藏标记，不恢复状态。
  Impact: 流中途失败时“保存本轮记忆”可能不出现，正文仍保持干净。
  Fix: 保持现状即可；不要猜测半截 JSON。

## Task Review Contract

- specVerdict: approve
- qualityVerdict: approve
- cannotVerifyFromDiff:
  - 用户当前桌面窗口里那条《股海浮沉》历史消息，需重新打开助手或等热更新后目视确认
- blockingFindings: []

## Lane Verdicts

- Reviewer lane: COMMENT
- Architect lane: APPROVE
- Overall: COMMENT

## Residual Risk

- 模型若完全不输出换行，界面只能按已有空行分段，不会擅自在每个句号后断行。
