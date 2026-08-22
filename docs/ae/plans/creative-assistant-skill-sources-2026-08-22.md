---
type: plan
status: implemented
date: 2026-08-22
title: creative-assistant-skill-sources
origin: docs/ae/prds/creative-assistant-skill-sources-2026-08-22.md
originFingerprint: creative-assistant-skill-sources-2026-08-22
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: 隐藏产品技能并接入 AE 创作向目录

## Source

- `docs/ae/prds/creative-assistant-skill-sources-2026-08-22.md`
- 文档评审：`docs/ae/reviews/creative-assistant-skill-sources-2026-08-22.md`（COMMENT，无阻断）

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

把三项 Novella 产品技能从下拉移除并改为始终启用；下拉改为五个 AE 创作向适配技能；点选只注入 Novella 自写指令。不执行 SKILL.md，不拷贝 GPL 原文，不新增供应商。

## Readiness

- Goal: 用户看到的可选技能来自 AE allowlist；澄清/草稿/记忆是默认智能体行为。
- Acceptance criteria: PRD R1-R7, NFR1-NFR3, must-have R4/R5。
- Non-goals: mattpocock 文件、AE 编码技能运行时、GitHub 热加载、自动启用新上游技能。
- Affected areas: `src/core/services/ai/assistant-skills/`、创作助手 prompt 与 Sheet、聚焦测试、决策日志。
- Validation surface: Jest 聚焦测试；可选浏览器点选；不跑真实密钥。
- Open questions: PRD Q1-Q2 由 ADR-2/ADR-3 关闭。

## Validation Evidence

| Acceptance criterion | Applicable tier        | Expected signal and bounded claim                        | Preconditions / owner | Status     | Recovery or rollback signal |
| -------------------- | ---------------------- | -------------------------------------------------------- | --------------------- | ---------- | --------------------------- |
| R1-R3, R6, NFR3      | Focused automated test | 下拉五技能、产品技能始终启用、点选注入、确认前不 onApply | Jest                  | unverified | 失败则撤回目录与 Sheet 改动 |
| R4, R5, NFR2         | Static inspection      | 无 SKILL.md 读取、无 github fetch、无 GPL 大段原文       | 源码                  | unverified | 删除违规文件                |
| R7                   | Focused automated test | allowlist 元数据与已知 AE id 对齐                        | Jest                  | unverified | 保留手写目录                |
| Browser              | Browser acceptance     | 下拉与可关闭标签                                         | 本地 Vite             | unverified | UI 回退到仅默认对话         |

## Assumptions

- 第一期未点选时，模型只可提议始终启用的产品技能；AE 适配技能必须用户点选才进入本轮。
- 检查入口用 Jest 契约即可，不强制新增独立 CLI。

## Alternatives Considered

- Recommended: 产品技能始终启用 + 本地 AE 适配目录 + Jest 钉扎。
- Alternative: 运行时读取 AE `SKILL.md` 并执行工作流。
- Rejected because: GPL 混用、编码 Agent 能力不适合终端创作、安全与 token 成本不可控。
- Alternative: 完全去掉技能下拉。
- Rejected because: 用户明确要求改用 AE 技能作为可选能力。

## Decision Drivers

- Driver 1: 终端用户不是 Codex 开发代理。
- Driver 2: MIT 产品不能粘贴 GPL skill 原文。
- Driver 3: 写保护与现有确认路径不能被新技能绕过。

## Decisions

### ADR-1 - 技能分层

- Decision: `visibility: always-on | user-selectable`。always-on 为三项产品技能；user-selectable 为五个 AE 适配技能。
- Drivers: R1, R2, R3
- Alternatives: 全部可见；全部隐藏。
- Why chosen: 同时满足「不显示产品技能」和「可选 AE 技能」。
- Consequences: `AssistantSkillId` 联合类型扩大；下拉只渲染 `user-selectable`。
- Follow-ups: 无

### ADR-2 - 未点选不启用 AE 技能

- Decision: `enabledSkills` = always-on 产品技能 ∪ 本轮点选的 AE 适配技能。
- Drivers: token、误调用、R4
- Alternatives: 五个 AE 技能始终可被模型提议。
- Why chosen: 关闭 PRD Q2；点选才改变本轮。
- Consequences: 未点选时 prompt 不出现 AE id。
- Follow-ups: 若用户以后要「模型自选 AE 技能」再放开。

### ADR-3 - 钉扎用测试而非 CLI

- Decision: 目录常量含 `sourceRepo`/`sourceSkill`；Jest 断言 allowlist 等于约定五 id。
- Drivers: R7, 最小实现
- Alternatives: `scripts/sync-assistant-ae-skills.mjs` 拉 GitHub。
- Why chosen: 关闭 Q1；第一期不引入运行时网络。
- Consequences: 真正对照远程目录仍是后续工作。
- Follow-ups: 需要自动 diff 上游时再加脚本。

### ADR-4 - 固定中文标签

- Decision:
  - ae-ideate → 想法发散
  - ae-doc-structure → 结构化整理
  - ae-doc-humanize → 文案润色
  - ae-imagegen-prompt → 画面提示词
  - ae-review → 质量审查
- Drivers: 评审 P2
- Alternatives: 显示 `/ae-*` 原名
- Why chosen: 面向漫剧创作者。
- Consequences: 测试用这些 aria/name。
- Follow-ups: 无

## Risks

- 用户仍把「质量审查」当成代码审查。
- 多选多个 AE 技能导致指令冲突。
- 既有测试仍查找「生成草稿」菜单项。

## Pre-Mortem

- Failure scenario 1: 下拉仍显示产品技能。
- Failure scenario 2: 点选 AE 技能后绕过确认回填。
- Failure scenario 3: 目录粘贴了 GPL 原文。
- Mitigations: 测试锁定选项；AE 技能 sideEffect=none；目录只写短摘要。

## Global Constraints

- 不读取外部 SKILL.md。
- 不新增 GitHub/模型 fetch。
- 产品写路径仍走现有按钮与确认框。

## Implementation Units

### U1 - 技能类型、目录与注册表

- Goal: 分层注册产品技能与 AE 适配目录。
- Requirements covered: R1, R2, R3, R5, R7
- Acceptance criteria covered: 目录可见性、来源字段、allowlist id
- Depends on: none
- Files: `src/core/services/ai/assistant-skills/types.ts`, `src/core/services/ai/assistant-skills/ae-catalog.ts`, `src/core/services/ai/assistant-skills/registry.ts`, `src/core/services/ai/assistant-skills/index.ts`, `src/core/services/ai/assistant-skills/parse-skill-marker.ts`, `src/__tests__/services/assistant-skills.test.ts`
- Forbidden files: `package.json`, `src-tauri/**`
- Approach: 扩展 `AssistantSkill` 增加 `visibility`、`sourceSkill`、`sourceRepo`、`instruction`。产品技能 always-on；`AE_ASSISTANT_SKILLS` 五个 user-selectable。注册表 `userSelectable()`。`formatSelectedSkillsForPrompt` 注入点选技能的 `instruction`。
- Tests: 列出可见技能五 id；产品技能不在 userSelectable；resolve 未点选的 AE id 为禁用；目录每项含 sourceRepo。
- Validation: `jest src/__tests__/services/assistant-skills.test.ts`
- Rollback signals: 未知 id 或产品技能从 always-on 消失
- Deferred to implementation: 指令摘要具体措辞

### U2 - 提示词与发送路径

- Goal: 未点选时仍带产品技能；点选 AE 技能只改本轮指令，不改写路径。
- Requirements covered: R2, R4, R6, NFR3
- Acceptance criteria covered: 默认澄清协议；点选注入；确认前不 onApply
- Depends on: U1
- Files: `src/features/creative-assistant/creative-assistant-memory.ts`, `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/__tests__/features/creative-assistant/creative-assistant-memory.test.ts`, `src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx`
- Forbidden files: `src/core/ai/providers/**`, `src-tauri/**`
- Approach: `enabledSkills` 使用 always-on ∪ selected。下拉渲染 `userSelectable()`。去掉对点选 `propose-candidate` 的发送分支（草稿仍走独立按钮）。`initialSkillIds` 仅包含本轮实际启用的调用。
- Tests: 下拉无「澄清需求/生成草稿/记忆提案」；有「想法发散」等；点选后出现可关闭标签；生成草稿按钮仍可产生候选且 onApply 未调用。
- Validation: `jest src/__tests__/features/creative-assistant --runInBand`
- Rollback signals: 旧菜单项重新出现或草稿按钮失效
- Deferred to implementation: 多选指令拼接顺序按目录顺序

### U3 - 决策记录

- Goal: 记录技能来源分层，修正「可点选三个内置技能」的旧表述影响面。
- Requirements covered: D1-D3
- Acceptance criteria covered: 决策可检索
- Depends on: U1
- Files: `docs/08-ai-memory/05-decision-log.md`
- Forbidden files: `docs/ae/prds/creative-assistant-skills-and-thinking-2026-08-22.md`（历史 PRD 不改写）
- Approach: 新增 2026-08-22 条目，指向本 PRD。
- Tests: 无
- Validation: 文件含新决策标题
- Rollback signals: 与旧决策冲突且未说明取代关系
- Deferred to implementation: 无

## Consistency Check

- implementationUnitCount: 3
- sourceRequirementsCovered: R1, R2, R3, R4, R5, R6, R7, NFR1, NFR2, NFR3
- sourceRequirementsDeferred: 远程 GitHub diff 脚本
- openQuestionsCount: 0

## Validation Plan

- Unit: assistant-skills Jest
- Integration: creative-assistant Jest
- User flow: 若 Vite 可用则点选一次
- Data / operations: 无新持久化字段
- Observability: 无

## Rollback / Recovery

恢复 `types.ts` 三项可见技能与 Sheet 下拉即可；会话 JSON 无新必填字段。

## Plan Self-Review

- Placeholder scan: 无 TBD/待填
- Consistency check: 3 单元覆盖 R1-R7
- Scope check: 未包含 SKILL.md 加载
- Acceptance coverage: must-have R4/R5 有静态+测试
- Validation gaps: 浏览器与真实模型 unverified
- Alternatives and ADR check: 4 个 ADR
- High-risk pre-mortem check: 已写

## Handoff

实现顺序 U1 → U2 → U3。不要提交 Git，除非用户要求。
