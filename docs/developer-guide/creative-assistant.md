# 创作助手

> 角色 / 脚本 / 分镜侧栏对话、技能提示、候选稿回填。以当前源码为准；Auto-Swarm 角色描述见架构总览，不能替代本页调用链。

## 调用链

```text
StepCharacter / StepScript / StepStoryboard / ProjectDetail
  -> AICreativeAssistantSheet
  -> CreativeAssistantAgent (UI-free domain orchestration)
  -> creative-assistant-ui-reducer (deterministic presentation state)
  -> aiService.streamConfiguredDialogue / streamConfiguredDialogueEvents
  -> AICallDispatcher -> ProviderRegistry
  -> Web: Provider / Vite 开发代理
  -> Tauri: src-tauri/src/commands/dialogue.rs HTTPS SSE
```

- UI 入口：`src/features/creative-assistant/`
- 领域 Agent：`src/core/services/ai/assistant-agent/`
- 展示状态 reducer：`src/features/creative-assistant/creative-assistant-ui-reducer.ts`
- 产品技能与 AE 适配技能：`src/core/services/ai/assistant-skills/`
- 角色草稿解析：`src/pages/project-edit/components/parse-character-drafts.ts`
- 外观表单水合：`src/features/character-consistency/appearance-form.ts`

## 角色参考图调用链

```text
StepCharacter / AI 助手图片意图
  -> generateImage
  -> configured-image-service
  -> Tauri generate_configured_image
  -> JSON / SSE / b64_json / Data URL 解析
  -> download_image_asset
  -> <workingDir>/<projectId>/assets/images/*
  -> Character.consistency.referenceImages（assets/images/...）
  -> read_image_asset
  -> Blob URL
  -> 角色卡 + AI 助手图片消息
```

- 桌面端 canonical value 是 `assets/images/...` 相对路径；供应商 URL、Data URL 和 Blob URL 都是派生临时值。
- `read_image_asset` 只允许当前工作目录下指定项目的 `assets/images/`，并校验文件大小与 JPEG/PNG/GIF/WebP 魔数。
- 助手会话保存图片元数据时清除运行时 `previewUrl`，重载后重新读取本地资产。
- Web/Vite 没有工作目录能力时只保留临时预览，不把临时地址伪装成本地相对路径。

## 技能分层

- 产品技能（澄清、生成草稿、记忆提案）始终在后台启用，不下拉展示。
- 用户可选技能是 AE 仓库的创作向提示适配，只改系统提示，不执行、不拷贝 `SKILL.md`。
- 写表单、写工程、保存项目记忆都必须用户确认。

## 状态所有权

- `CreativeAssistantAgent`：负责 turn 生命周期、技能门控、候选/记忆命令和适配器调用，不依赖 React。
- `assistantUIReducer`：负责消息、活动 turn、错误、候选稿、项目记忆、hydrate/reset 和外部图片消息去重。
- `AICreativeAssistantSheet`：负责输入框、附件、菜单/弹窗、DOM/滚动、`AbortController`、网络与本地持久化 effect。
- 终态 action 必须带 `assistantId`。旧 turn 的完成/失败/取消不得关闭新 turn；完成回调结束前保持 generating，避免图片或候选解析期间启动下一轮。

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
pnpm exec tsc --noEmit
pnpm build
```

2026-08-23 已验证：完整 Jest 89 suites / 1016 tests（2 skipped）、TypeScript、目标 ESLint、生产构建、Cargo workspace，以及 Tauri WebView 中角色卡和 AI 助手消息显示同一张 1280×720 本地参考图。

未验证：真实模型是否主动 `propose-candidate`，以及其他供应商/模型对图片 SSE 与 Base64 契约的兼容性。真实密钥和完整响应未写入测试、文档或日志。
