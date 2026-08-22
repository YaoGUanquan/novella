---
type: code-review
status: comment
date: 2026-08-22
scope: native-dialogue-transport-and-recovery
---

# 代码评审：Tauri 原生对话传输与会话恢复

## Findings

本次范围内没有 P0/P1 阻断项。以下为已核对的残留风险，不是交付阻断。

- [P2] 取消是尽力而为 - `src-tauri/src/commands/dialogue.rs:213`
  Evidence: `cancel_configured_dialogue` 只置位标志；`run_stream` 在 `read_line` 返回前不会中断底层 HTTPS 读。
  Impact: 用户中止后，远端连接可能仍保持到下一行或 300s 超时。
  Fix: 后续可用带超时的非阻塞读或 `reqwest` 取消句柄；当前符合设计中的 best-effort 取消。

- [P2] 缺少 Rust 单元测试覆盖 TC-001/TC-002 - `src-tauri/src/commands/dialogue.rs:56`
  Evidence: 计划要求 HTTPS/无 host 拒绝和 SSE 解析状态机测试；当前仅有前端 Jest 与 `cargo check`。
  Impact: endpoint 校验和 OpenAI/Anthropic 解析回归只能靠桌面手工验证。
  Fix: 把 `validate_request` 与 `parse_sse_data` 抽成可测函数后补 Rust 测试。

## Task Review Contract

- specVerdict: approve
- qualityVerdict: approve
- cannotVerifyFromDiff:
  - 真实密钥桌面 SSE 是否返回分片（R1/AC1）
  - Tauri ACL 在运行时是否允许 `start_configured_dialogue`/`cancel_configured_dialogue`（与既有 app command 同一模式，未单独失败）
- blockingFindings: []

## Evidence Boundaries

- Proven tier and bounded claim: `cargo check --workspace` 证明原生命令可编译；`pnpm tauri dev` 日志证明 `novella-desktop.exe` 已启动并完成初始化；聚焦 Jest 16/16 覆盖 Web 传输开关与助手重试/删除/清空。
- Blocked or unverified proof and residual risk: 未在 Tauri 窗口内用真实密钥发送助手消息；浏览器打开 `http://127.0.0.1:1420` 只能验证 Web 路径，不能代替桌面原生传输。

## Verification Gaps

- Affected requirement ID: R1/AC1, R6
  Required proof and missing check: 桌面窗口内成功 SSE 分片与 `cargo` 之外的真实服务契约
  Status: unverified
  Owner and next action: 用户在已启动的 Tauri 窗口中打开 AI 助手并发送一条测试消息

## Known Unrelated Failures

- 工作区仍有大量与本任务无关的未提交改动（设置页、图像/视频路由、文档初始化）。未纳入本次审查。

## Open Questions

- 无新的产品决策。用户已要求直接 `pnpm tauri dev`，不再使用 Vite 代理启动。

## Lane Verdicts

- Reviewer lane: COMMENT
- Architect lane: COMMENT
- Overall: COMMENT

## Coverage

- Requirements covered: R1-R6 / AC1-AC6（实现路径齐全；AC6 的真实 SSE 未验证）
- Plan units covered: U1, U2, U3, U4
- Task IDs covered: native-dialogue-transport-and-recovery
- Governance checks: API key 未写入日志/事件；仅 HTTPS endpoint；Web 路径不走 native command

## Residual Risk

- 真实供应商 SSE 事件格式可能与当前 OpenAI/Anthropic 解析不一致。
- 自定义 app command 未写入 `capabilities/default.json`，与仓库既有 command 一致，但若未来收紧 ACL 会同时失效。
