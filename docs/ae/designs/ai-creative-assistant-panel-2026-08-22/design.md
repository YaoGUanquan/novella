---
type: design
status: drafted
date: 2026-08-22
title: ai-creative-assistant-panel
origin: docs/ae/prds/ai-creative-assistant-panel-2026-08-22.md
originFingerprint: ai-creative-assistant-panel-2026-08-22
format: human-readable-design
sharded: false
---

# Design: AI 创作助手侧边对话与回填

## Source

- `docs/ae/prds/ai-creative-assistant-panel-2026-08-22.md`

## AI Parse Contract

- canonicalKind: design
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Split Manifest

- mode: unified
- root: `docs/ae/designs/ai-creative-assistant-panel-2026-08-22`
- files: `design.md`

## Overview

- Goal: 以可复用侧边对话替换表单附近的即时 SSE 草稿区，并把 AI 到表单的边界固定为“候选 -> 明确确认 -> 回填”。
- Source requirements: R1-R5, NFR1-NFR2.
- Required dimensions: overview, architecture, ui-ux, test-cases, non-functional.
- Explicit omitted dimensions: database（消息不持久化）；API（复用现有客户端 AI service，无新服务端接口）；security（无新凭证或授权面）。

## Existing Project Evidence

- mode: inspected

| Evidence category         | Repository-relative inputs                                                                                                                                          | Sanitized conclusion                                           | Confidence |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| stack and commands        | `package.json`, `src/app/index.tsx`                                                                                                                                 | Vite + React 19 + Jest，使用现有构建和浏览器验证。             | verified   |
| structure and conventions | `src/pages/project-detail/hooks/projectDetailActions.ts`, `src/pages/project-edit/components/StepCharacter.tsx`, `src/pages/project-edit/components/StepScript.tsx` | 页面拥有表单状态；SSE 已通过 `aiService.streamGenerate` 使用。 | verified   |
| reusable assets           | `src/components/ui/sheet.tsx`, `src/components/ui/confirm-dialog.tsx`, `src/components/ui/scroll-area.tsx`                                                          | 可复用右侧 Sheet、确认弹窗和滚动消息区，无需新增依赖。         | verified   |

## Implementation Constraints

- Repository paths: 新助手位于 `src/features/creative-assistant/`；仅适配三个现有页面目标。
- Runtime/build commands: `pnpm test -- --runInBand <scoped tests>`, `pnpm exec tsc --noEmit`, `pnpm run build`。
- Dependency boundaries: 仅调用 `aiService.streamGenerate`；调用方通过 typed parser/apply 回调拥有表单数据。
- Rollback constraints: 删除悬浮触发器后既有表单和保存路径可独立继续使用。

## Decisions

### ADR-001 - 上下文专属侧边 Sheet

- Decision: 每个目标表单将触发器锚定在自身工作卡片，打开右侧 Sheet。
- Drivers: 表单可见性、目标明确性、移动端适配。
- Alternatives: 内嵌聊天区（挤占表单）；全局聊天（回填目标不明确）。
- Consequences: 创建一个共享壳组件，但不创建全局 store。

### ADR-002 - 两阶段 AI 状态

- Decision: 对话消息和候选草稿分开；只有“生成可回填草稿”的 SSE 完成后允许申请回填。
- Drivers: 结构化解析安全、减少误填。
- Alternatives: 每条对话自动解析（不可靠）；一次性表单生成（不满足多轮需求）。
- Consequences: Sheet 有 `chatting`、`candidate-ready`、`applying` 状态。

### ADR-003 - 回填确认与所有权

- Decision: Sheet 通过 `onApply(candidate)` 回调写回表单，随后关闭；不直接持久化工程。
- Drivers: 用户确认、复用现有表单保存和错误处理。
- Alternatives: Sheet 直接写项目 store（绕过表单）；自动保存（不可控）。
- Consequences: 每个 target 的 parser 和表单值映射由调用方显式提供。

## Mapping Tables

### api-field-to-database-column-mapping

N/A: 无新 API 或持久化结构。

### api-error-to-ui-state-mapping

| EP ID  | Error/status | ST ID  | UI state   | User-visible behavior      |
| ------ | ------------ | ------ | ---------- | -------------------------- |
| EP-001 | SSE abort    | ST-002 | 对话已停止 | 保留已收消息，可继续发送。 |
| EP-001 | SSE/解析失败 | ST-003 | 可重试错误 | 显示错误，不修改目标表单。 |

### test-case-to-contract-coverage

| TC ID  | Scenario   | Covered IDs             | Verification signal              |
| ------ | ---------- | ----------------------- | -------------------------------- |
| TC-001 | 流式回复   | ADR-002, EP-001, ST-001 | 首 chunk 出现在 assistant 消息。 |
| TC-002 | 取消与错误 | ADR-002, ST-002, ST-003 | 表单值不变，发送可恢复。         |
| TC-003 | 确认回填   | ADR-003, ST-004         | 回调仅在确认后被调用一次。       |
| TC-004 | 取消/复制  | ADR-003, ST-004         | 取消不调用回调，复制不改变目标。 |

### ui-component-to-api-endpoint-mapping

| Component/route            | ST ID          | EP ID  | Data dependency                             |
| -------------------------- | -------------- | ------ | ------------------------------------------- |
| `AICreativeAssistantSheet` | ST-001..ST-004 | EP-001 | `aiService.streamGenerate` 与调用方上下文。 |
| 脚本/角色/分镜入口         | ST-004         | EP-001 | 各自表单草稿与 apply callback。             |

## Architecture

- `AICreativeAssistantSheet` 维护内存消息、AbortController、候选原文和确认弹窗。
- 调用方传入 `target`、`projectContext`、`buildCandidatePrompt`、`parseCandidate` 和 `onApply`。
- EP-001 表示既有 client-side AI streaming contract，不新增网络 endpoint。

## API

### EP-001 - Existing AI streaming invocation

- Input: 当前项目上下文、用户消息、目标候选约束。
- Output: SSE 文本 chunk；候选阶段由调用方 parser 转为目标值。
- Error: abort、provider failure、candidate parse failure；均不触发 `onApply`。

## Database

N/A: 不保存聊天消息或候选草稿。

## UI/UX

### ST-001 - 多轮对话

触发器显示在目标表单右侧；Sheet 打开后展示目标名称、时间线、消息输入与发送/停止按钮。发送中仍能滚动查看回复。

### ST-002 - 对话取消

停止按钮中断当前流并使 assistant 消息保留为部分回复；输入恢复可用。

### ST-003 - 候选解析失败

原文显示在候选区，给出“继续澄清”与“重新生成候选”入口；目标表单值保持不变。

### ST-004 - 候选确认回填

候选解析成功后出现预览、复制和“填充表单”。点击填充弹出确认对话框；确认调用 `onApply` 并关闭 Sheet，取消停留在预览。

## Test Cases

### TC-001 - 流式消息渲染

- Priority: P1
- Preconditions: mock AsyncGenerator 依次 yield 两个 chunk。
- Steps: 打开 Sheet、发送消息。
- Expected result: 同一 assistant 消息在首 chunk 后可见，并在结束后包含完整文本。
- Covered IDs: R2, ADR-002, EP-001, ST-001.

### TC-002 - 中断和失败隔离

- Priority: P1
- Preconditions: 可取消 generator 或抛出错误。
- Steps: 发送后停止，或让 generator 抛错。
- Expected result: 已有消息保留、输入恢复、`onApply` 未调用。
- Covered IDs: R2, R3, ST-002, ST-003.

### TC-003 - 仅确认后回填

- Priority: P1
- Preconditions: parser 返回有效候选。
- Steps: 生成候选，先取消确认对话再重新确认。
- Expected result: 取消时 `onApply` 计数为 0；确认时为 1 并携带候选。
- Covered IDs: R3, R4, ADR-003, ST-004.

### TC-004 - 响应式与可访问性

- Priority: P2
- Preconditions: 本地 Vite。
- Steps: 在桌面和 390px 宽度打开、关闭、发送面板。
- Expected result: 触发器有名称、Sheet 可关闭、无横向溢出或 console error。
- Covered IDs: R1, R5, NFR2, ST-001.

## Non-Functional

- Sheet 宽度为 `w-full sm:max-w-md`，避免固定像素在窄屏溢出。
- 不记录 API Key、Authorization 或原始安全配置；仅使用当前表单已可见的项目上下文。

## Consistency Check

- requiredDimensionsCovered: overview, architecture, ui-ux, test-cases, non-functional
- omittedDimensionsJustified: API/database/security
- stableIdsUnique: true
- mappingTablesComplete: true
- sourceScopePreserved: true
- reviewStatus: pending
