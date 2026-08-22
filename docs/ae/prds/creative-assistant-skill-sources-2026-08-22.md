---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-skill-sources
format: human-readable-requirements
sharded: false
---

# 创作助手技能来源分层：内置产品行为与 AE 可选技能

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

用户看到下拉里的「澄清需求 / 生成草稿 / 记忆提案」，误以为它们是 [mattpocock/skills](https://github.com/mattpocock/skills) 的工程技能。源码证据表明它们不是：这三项是 Novella 自己的产品能力（`clarify-requirements`、`propose-candidate`、`propose-memory`），只借鉴了「先澄清、确认后才写入」的思想。2026-08-22 决策已明确：不在用户侧运行或注入 `mattpocock/skills`。

期望结果：产品行为深度内置到对话智能体，不再作为下拉选项；用户可选技能改为来自 [YaoGUanquan/codex-ai-agent-engine](https://github.com/YaoGUanquan/codex-ai-agent-engine) 的创作向适配，并保留跟随该仓库更新的目录钉扎。

成功信号：下拉不再出现三项产品技能；普通对话默认澄清与记忆协议；点选 AE 适配技能会改变本轮指令；写表单/记忆仍需确认；不把 GPL `SKILL.md` 或编码 Agent 运行时搬进 MIT 产品。

## Requirements

**来源分层**

- R1. 界面不得把 `mattpocock/skills` 或 Novella 产品技能（澄清需求、生成草稿、记忆提案）作为用户点选技能展示。  
  Acceptance: 助手技能下拉的可选项不含这三项标签，也不含 mattpocock 工程技能名。
- R2. 澄清需求、候选稿提案、记忆提案作为智能体默认能力始终启用：系统提示始终携带创作澄清与状态协议；「生成可回填草稿」按钮仍可触发候选稿；模型仍可用既有 `<novella-skill>` 标记提议产品技能。  
  Acceptance: 未点选任何下拉技能时，请求仍包含澄清规则与状态标记约定；点选 AE 技能不会关闭这三项默认能力。
- R3. 用户点选技能必须来自 AE 仓库的创作向 allowlist，而不是编码工作流全集。第一期可见技能仅限：`ae-ideate`、`ae-doc-structure`、`ae-doc-humanize`、`ae-imagegen-prompt`、`ae-review`。  
  Acceptance: 下拉只列出这五个适配技能的中文标签；点选后请求上下文包含对应 Novella 自有指令片段。

**执行边界**

- R4. 第一期 AE 技能只做提示词转向（改变本轮助手怎么写），不执行 AE `SKILL.md` 工作流、不调用 `ae.mjs`、不访问 Git/SQL/浏览器/MCP。  
  Acceptance: 助手路径无新增对第三方 skill 文件或 `ae.mjs` 的运行时读取；测试断言点选技能只改变 system/user 指令。
- R5. 不得把 GPL-3.0 AE `SKILL.md` 原文复制进 MIT 的 Novella 仓库。目录只保留 skill id、来源仓库、中文标签、Novella 自写的指令摘要和钉扎说明。  
  Acceptance: 源码与测试快照不含 AE skill 文件大段原文；目录项带 `sourceSkill` 与 `sourceRepo`。
- R6. 写副作用规则不变：回填表单和保存项目记忆仍须用户确认。AE 适配技能均为只读。  
  Acceptance: 点选 AE 技能的对话不会在确认前调用 `onApply` 或写入已确认记忆。

**更新路径**

- R7. 产品内维护一份可检查的 AE 技能目录钉扎（来源仓库 URL、allowlist id）。后续可用检查脚本对照上游目录报告新增/消失项，但不自动启用编码类技能。  
  Acceptance: 仓库中有目录元数据；检查脚本或等价测试能识别 allowlist 中的 id，并对未在 allowlist 的上游技能保持忽略。

## Non-Functional Requirements

- NFR1. 继续走已配置对话服务；不新增供应商、密钥路径或联网搜索。  
  Acceptance: 请求与日志不含 API key。
- NFR2. 助手 UI 不直接 `fetch` 第三方模型或 GitHub skill 原文。  
  Acceptance: 组件层无新增对 github.com 或 skill raw URL 的运行时 fetch。
- NFR3. 现有普通对话、取消、重试、删除、图片附件、候选稿按钮和记忆保存保持可用。  
  Acceptance: 创作助手聚焦测试在目录替换后仍覆盖这些路径。

## Must-Haves (Conditional)

- Requirement ID: R4
  Must-have completion condition: 用户点选技能时，应用不会执行外部 SKILL.md、shell、Git 或 AE CLI。
- Requirement ID: R5
  Must-have completion condition: 交付 diff 不含 AE/GPL skill 文件原文粘贴。

## Success Criteria

- 用户能区分：默认智能体行为 vs 可选创作技能。
- 下拉只出现 AE 创作向适配技能，点选后本轮回复风格/结构按该技能变化。
- 产品写路径仍需确认。
- 上游更新路径可检查，而不是运行时热加载任意技能。

## Scope Boundary

### In Scope

- 隐藏三项产品技能的下拉入口，改为始终启用。
- 五个 AE 创作向适配技能的目录、下拉、点选注入与测试。
- 目录钉扎与检查/同步入口（不自动拷贝 skill 正文）。
- 决策记录更新。

### Out Of Scope

- 把 `mattpocock/skills` 文件装进产品或开发代理运行时。
- 在创作助手中运行 `ae-lfg`、`ae-work`、`ae-sql`、`ae-backend`、`ae-tdd`、`ae-debug`、浏览器验收等编码 Agent 技能。
- 运行时从 GitHub 拉取 SKILL.md。
- 嵌套子智能体、MCP、图像/视频实际生成。
- 自动跟随上游启用新技能。

### Constraints

- Novella 为 MIT；上游 AE 为 GPL-3.0-or-later。只映射 id 与自写摘要。
- 延续：确认后才写表单或项目记忆。
- 第一期技能调用仍是受约束标记 + 提示词，不是开放 function-calling 市场。

## Validation Evidence

| Acceptance criterion | Tier                             | Expected signal                                      | Status                             |
| -------------------- | -------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| R1-R3, R6            | Focused automated test           | 下拉选项、始终启用产品技能、点选注入、写确认         | unverified                         |
| R4, R5, NFR2         | Static inspection + focused test | 无 SKILL.md 运行时加载、无 GPL 原文、无 GitHub fetch | unverified                         |
| R7                   | Focused automated test or script | allowlist 与来源元数据可检查                         | unverified                         |
| NFR1, NFR3           | Focused automated test           | 既有助手路径仍通过                                   | unverified                         |
| Browser acceptance   | Browser acceptance               | 下拉只有 AE 适配技能，点选出现可关闭标签             | unverified                         |
| 真实模型遵循新指令   | Authenticated service smoke      | 需用户密钥                                           | not-applicable until user requests |

## Perspective Collision

- Perspectives: critic, pragmatist, innovator, systems.
- Disagreements:
  - Value: 创新视角希望直接运行 AE 全套技能；务实视角认为编码技能不能进漫剧助手。
  - Assumption: 用户说「对应技能」时，批评视角认为是误认产品技能为 mattpocock 文件；系统视角认为用户真正要的是「默认行为隐藏 + 可选技能换源」。
  - Fact: AE 技能是给 Cursor/Codex 开发代理用的 `SKILL.md`，不是 Novella 终端用户运行时。
- Collision insights:
  - 「跟着 AE 仓库更新」与「不执行外部 SKILL.md」同时成立的条件是：更新的是 allowlist/元数据，不是热加载正文。
  - 「深度内置 mattpocock」与「不显示这些技能」同时成立的条件是：只内置澄清/确认思想，不内置工程技能文件。
- Blind spots: 许可证混用、终端用户看到 `/ae-review` 等开发词、提示词过长。
- Thinking preservation zone: 第一期可见技能名单是产品品味选择；后续增删由维护者审 allowlist，不自动全量同步。

## Key Decisions

- D1. 当前下拉三项不是 mattpocock/skills；将其从 UI 移除并改为智能体默认能力。  
  Reason: 与既有决策和源码一致，也符合「不需要显示这些技能」。
- D2. 用户可见技能使用 AE 创作向 allowlist 的 Novella 适配，而不是拷贝或执行 SKILL.md。  
  Reason: 许可证、安全边界和产品受众都不允许把编码 Agent 运行时塞进创作助手。
- D3. 第一期可见技能：想法发散、结构化整理、文案润色、画面提示词、质量审查。  
  Reason: 可在无 Git/浏览器/SQL 的对话里产生用户可见价值；编码类技能明确排除。

## Dependencies And Assumptions

### Dependencies

- 现有技能注册表、`<novella-skill>` 标记、候选稿确认和项目记忆确认路径。
- 上游目录参考：本地 `ae-help` capability catalog 与 GitHub `YaoGUanquan/codex-ai-agent-engine`。

### Assumptions

- 用户授权维护者选择第一期五技能 allowlist，而不是一次上架全部 AE 技能。
- 「跟着仓库更新」第一期等于钉扎 + 检查差异，不等于运行时自动启用新技能。

## Open Questions

### Must Resolve Before Planning

无。D1-D3 关闭来源与第一期名单。

### Deferred To Planning

- Q1. [Affects R7][technical] 检查入口做成 Jest 契约还是 `scripts/` 小脚本。
- Q2. [Affects R3][technical] 未点选时模型可否自行提议 AE 适配技能，或仅能提议产品技能。

## Evidence Notes

- 下拉三项是 Novella 产品技能 -> Evidence: `src/core/services/ai/assistant-skills/types.ts`。
- 不注入 mattpocock/skills -> Evidence: `docs/08-ai-memory/05-decision-log.md` 2026-08-22 条目。
- mattpocock 技能为工程技能（tdd、code-review、implement 等） -> Evidence: `https://api.github.com/repos/mattpocock/skills/contents/skills/engineering?ref=main`。
- AE 技能面向 Codex 工作流且上游 GPL -> Evidence: `ae-help/references/capability-catalog.json`、`https://github.com/YaoGUanquan/codex-ai-agent-engine`。
- 创作助手已有始终澄清规则 -> Evidence: `buildCreativeAssistantSystemPrompt`。

## Consistency Check

- requirementsCount: 7
- nonFunctionalRequirementsCount: 3
- decisionsCount: 3
- openQuestionsCount: 2
