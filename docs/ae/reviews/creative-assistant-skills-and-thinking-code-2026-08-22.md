---
type: code-review
status: comment
date: 2026-08-22
scope: creative-assistant-skills-and-thinking
---

# 代码评审：创作助手技能与思考分流

## Findings

- [P3] 模型提议写技能后的二次生成会在测试中产生 act 警告 - `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx:324`
  Evidence: `queueMicrotask` 触发的候选稿流在 Jest 中于 act 外更新状态；测试仍通过。
  Impact: 测试噪声，不影响产品确认回填。
  Fix: 后续可用 `waitFor` 可预测的调度或把 follow-up 并入同一 turn 的 UI 提案，而不是现在就改行为。

无 P0/P1。Must-have R5 由测试覆盖：技能提议与按钮生成都不会在确认前调用 `onApply`。字符串流过滤 thinking。禁用技能可关闭草稿按钮。

## Task Review Contract

- specVerdict: approve
- qualityVerdict: approve
- cannotVerifyFromDiff:
  - 真实供应商 thinking/reasoning 分片
  - 真实模型是否输出 `<novella-skill>`
  - Tauri 窗口内思考块展示
- blockingFindings: []

## Evidence Boundaries

- Proven tier and bounded claim: 聚焦 Jest 34 passed；tsc；scoped eslint；`cargo check --manifest-path src-tauri/Cargo.toml`；`vite build`
- Blocked or unverified proof and residual risk: 未做真实密钥 SSE、未做浏览器交互验收

## Known Unrelated Failures

- 全量 Jest 中既有 SettingsPage `novella_working_dir` 失败不在本次文件范围内，未重跑全量套件。

## Lane Verdicts

- Reviewer lane: COMMENT
- Architect lane: APPROVE
- Overall: COMMENT

## Coverage

- Requirements covered: R1-R10, NFR1-NFR3
- Plan units covered: U1-U5
- Governance checks: 无外部 SKILL.md 运行时；无 Auto-Swarm 合并；助手无第三方 fetch

## Residual Risk

- 技能启用状态不跨会话持久化（ADR-3 明确天花板）。
- 未主动请求 extended thinking；无分片的模型只有调用记录和正文。
