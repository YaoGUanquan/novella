---
type: experience
status: recorded
date: 2026-08-23
scope: repository-specific
---

# 创作助手 UI Reducer 下沉经验

## Problem

`AICreativeAssistantSheet` 同时用多个 setter 管消息、generating、streaming ID、错误、候选稿和项目记忆。流式完成、重试、取消、候选解析和图片生成回调可能乱序，旧请求的 finally 有机会清除新请求状态。

## Decision

- core `CreativeAssistantAgent` 继续负责 UI-free 领域编排和注入 adapter。
- feature `assistantUIReducer` 负责确定性展示状态和 stale-turn guard。
- React 组件保留输入/附件/弹窗/DOM/AbortController、网络与持久化 effect。
- terminal actions 用 `assistantId` 原子提交消息、错误、generating 和 streaming ID。
- 候选解析或图片生成完成回调结束后再提交成功终态，避免提前开放下一轮。

## Reusable Lessons

1. 流式 patch 与 terminal transition 要分开；通用 patch 不应绕过完成/失败/取消 action。
2. `finally { setGenerating(false) }` 在可重试或可并发 UI 中不安全，必须按 turn ID 收尾。
3. reducer 不应吸收副作用；持久化由 readiness guard 的 effect 消费 reducer 快照。
4. 失败 fallback 若由完成回调成功处理，终态错误应采用回调结果，而不是无条件保留原 transport 错误。
5. 外部事件去重既要对现有 transcript 去重，也要对同一批次内重复 ID 去重。

## Evidence

- `pnpm exec tsc --noEmit`
- scoped ESLint for assistant component/reducer/tests
- `pnpm test -- --runInBand src/__tests__/features/creative-assistant`：11 suites / 72 tests
- `pnpm build`：2719 modules transformed
- 浏览器 `/project/new`：助手打开、missing-provider 失败终态可见、console 无 warning/error
- `git diff --check`
- Gate：`docs/ae/gates/20260823T084619Z-lfg-final.json`

## Boundaries

真实凭据 Provider 和用户单独启动的 Tauri 窗口没有在本轮直接验收；这些结论不能从 Jest 或 Web browser smoke 外推。
