# 创作助手

> 角色 / 脚本 / 分镜侧栏对话、技能提示、候选稿回填。以当前源码为准；Auto-Swarm 角色描述见架构总览，不能替代本页调用链。

## 调用链

```text
StepCharacter / StepScript / StepStoryboard / ProjectDetail
  -> AICreativeAssistantSheet
  -> aiService.streamConfiguredDialogue / streamConfiguredDialogueEvents
  -> AICallDispatcher -> ProviderRegistry
  -> Web: Provider / Vite 开发代理
  -> Tauri: src-tauri/src/commands/dialogue.rs HTTPS SSE
```

- UI 入口：`src/features/creative-assistant/`
- 产品技能与 AE 适配技能：`src/core/services/ai/assistant-skills/`
- 角色草稿解析：`src/pages/project-edit/components/parse-character-drafts.ts`
- 外观表单水合：`src/features/character-consistency/appearance-form.ts`

## 技能分层

- 产品技能（澄清、生成草稿、记忆提案）始终在后台启用，不下拉展示。
- 用户可选技能是 AE 仓库的创作向提示适配，只改系统提示，不执行、不拷贝 `SKILL.md`。
- 写表单、写工程、保存项目记忆都必须用户确认。

## 角色回填

1. 模型或「生成可回填草稿」产出 JSON 数组。
2. 解析成功后先回填左侧「待确认角色草稿」（含外观、服饰）。
3. 对话候选稿区点「保存角色」才写入已确认角色。
4. 「保存本轮记忆」只写项目记忆，不会填角色表单。
5. 顶层 `height` / `bodyType` / `features` 会合并进 `appearance`；`thin` 映射为 `slim`；厘米身高无法匹配下拉时改为输入框；中文颜色映射色块。

脚本 / 分镜默认仍是「填充表单 + 确认弹窗」，除非显式打开角色那种预览保存模式。

对话失败时助手可重试原请求、删除单条消息或清空当前会话；这些操作不删除已确认的项目记忆。传输细节见 [服务连接](./service-connections)。

## 展示合同

- 「思考过程」是本轮编排步骤，不是供应商 `reasoning_content`。
- 解析成功的候选稿默认显示中文标签摘要；JSON 在「查看原文」。
- 模型若把 JSON 包成字符串，聊天气泡不得把该字符串当正文展示。
- 助手侧栏深色底配浅色字；用户气泡保持白底深字。

## 验证

```bash
corepack pnpm test -- src/__tests__/features/creative-assistant src/__tests__/features/character-consistency src/__tests__/pages/parse-character-drafts.test.ts src/__tests__/services/assistant-skills.test.ts
```

未验证：真实模型是否主动 `propose-candidate`、浏览器点选验收、真实密钥桌面 SSE。
