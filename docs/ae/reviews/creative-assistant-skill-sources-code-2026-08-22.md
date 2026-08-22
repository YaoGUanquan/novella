# 代码评审：创作助手技能来源分层

- date: 2026-08-22
- domain: code
- mode: report-only
- spec: docs/ae/prds/creative-assistant-skill-sources-2026-08-22.md
- plan: docs/ae/plans/creative-assistant-skill-sources-2026-08-22.md

## Findings

无 P0/P1。

- [P2] AE 适配指令写在源码里，上游 skill 改名时只能靠人工对照 allowlist。
  Evidence: `src/core/services/ai/assistant-skills/ae-catalog.ts`
  Impact: 与「跟着仓库更新」的长期目标仍有差距。
  Fix: 后续加只读 diff 脚本；第一期按 ADR-3 有意推迟。

## Task Review Contract

- specVerdict: approve
- qualityVerdict: approve
- cannotVerifyFromDiff:
  - 浏览器下拉文案
  - 真实模型是否遵守点选指令
- blockingFindings: []

## Evidence Boundaries

- Proven tier and bounded claim: Jest 27/27 覆盖分层、点选标签、产品技能不在下拉、候选稿仍需确认。
- Blocked or unverified proof and residual risk: 浏览器与真实密钥对话。

## Lane Verdicts

- Reviewer lane: 写保护未绕过；无 SKILL.md 加载。
- Architect lane: always-on / user-selectable 分层与 PRD 一致。
- Overall: COMMENT

## Coverage

- Requirements covered: R1-R7, NFR1-NFR3
- Plan units covered: U1-U3
- Governance checks: 无 GPL 原文、无 GitHub fetch

## Residual Risk

远程上游目录同步未做；多选 AE 技能可能指令互相拉扯。
