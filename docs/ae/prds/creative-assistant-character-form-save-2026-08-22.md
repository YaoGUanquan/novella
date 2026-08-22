---
type: prd
status: implemented
date: 2026-08-22
topic: creative-assistant-character-form-save
format: human-readable-requirements
sharded: false
---

# 角色表单由对话先回填，保存确认内置到助手

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

用户在角色设定里与助手确认了主角「牛来」，并把本轮识别保存为项目记忆，但左侧「创建角色」名称仍为空。当前有三层错位：记忆保存不等于角色表单；可回填草稿要另点「生成可回填草稿」和「填充表单」；草稿解析不含外观/服饰，且 `CharacterDesigner` 不读取 `characters` 草稿。

用户要求：基于对话先补全角色表单（含外观、服饰），再在对话里显示是否保存；点保存才写入当前角色。回填与最终确认应内置到智能体，而不是只靠记忆卡片。

成功信号：对话产生完整角色草稿后，左侧表单能看到姓名等字段；对话里有保存；未点保存时已确认角色列表不变。

## Requirements

- R1. 角色候选稿必须覆盖创建表单所用字段：name、role、description、personality、background、gender、age、features、appearance、clothing。  
  Acceptance: 含外观与服饰的 JSON 解析后这些字段仍在；旧 JSON 缺字段时不抛错，缺省为空。
- R2. 可解析角色候选稿一旦生成，必须先回填到左侧可编辑草稿表单，不得只停在助手里的 JSON 预览。未点保存不得写入已确认角色/工程。  
  Acceptance: 候选解析成功后草稿表单能读到姓名；`onPersist` 被调用前已保存角色列表不变。
- R3. 助手对话区必须提供保存确认（「保存角色」）。用户点击后才把当前草稿写入已确认角色并走现有工程保存。  
  Acceptance: 点击保存才触发 persist；取消或不点则工程角色不变。
- R4. 回填与保存确认作为智能体能力：模型在角色目标且已有确认姓名或用户要求补全表单时，应提出 `propose-candidate`；提出后沿用现有跟进生成草稿。项目记忆保存仍独立，不得冒充角色表单已保存。  
  Acceptance: `propose-candidate` 指令含角色表单补全触发条件；记忆按钮文案不表示已写入角色表单。
- R5. 左侧草稿表单必须展示并允许编辑 AI 回填的角色，包括外观与服饰页。  
  Acceptance: 传入 `characters` 草稿时，名称等字段不再空白；编辑能写回草稿状态。

## Non-Functional Requirements

- NFR1. 脚本/分镜助手默认仍为「生成草稿 → 填充表单 → 确认弹窗」，除非显式打开角色这种预览+对话保存模式。  
  Acceptance: 未传 auto-preview 时既有填充表单测试仍通过。
- NFR2. 不执行 AE SKILL.md，不自动保存工程除非用户点对话里的保存。

## Success Criteria

- 确认「牛来」并生成草稿后，用户能在表单里看到该姓名及外观/服饰，再在对话里点保存。
- 只保存项目记忆时，角色表单可以仍为空。

## Scope Boundary

### In Scope

- 角色步骤的草稿解析、表单回填预览、对话内保存、Designer 草稿水合。
- 助手可选的预览/持久化回调。

### Out Of Scope

- 自动写入已确认角色而不经对话保存。
- 脚本/分镜改为同一套预览保存（可后续复用回调）。
- 生成角色参考图。

## Key Decisions

- D1. 预览回填草稿 ≠ 写入已确认角色。覆盖旧面板 PRD 中「候选不得改表单」对角色草稿预览的部分；已确认角色仍需保存点击。  
  Reason: 用户明确要求先补全表单再在对话确认保存。
- D2. 对话内保存按钮即最终确认，不再为角色预览模式强制再弹「填充表单」。  
  Reason: 用户要求确认内置到智能体。

## Assumptions

- 外观/服饰在正文未写明时允许模型按已确认设定补全为草稿，用户可在保存前改。

## Open Questions

- 无。脚本/分镜是否跟进明确推迟。

## Consistency Check

- requirementCount: 5
- nonFunctionalRequirementCount: 2
- decisionCount: 2
- openQuestionCount: 0
