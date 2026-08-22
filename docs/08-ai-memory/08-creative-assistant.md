<!-- ae-codex:init managed -->

# 创作助手

跨会话仍有效的产品行为。实现以 `src/features/creative-assistant` 为准。

## 职责

- 在角色、脚本、分镜、项目详情提供与当前步骤绑定的侧栏对话。
- 先澄清再给候选稿；写表单和写工程必须用户确认。
- 项目记忆只在用户点「保存本轮记忆」后写入本地；不等于角色表单已保存。

## 稳定约定

- 思考过程 = 智能体编排时间线，忽略 `kind: 'thinking'`。
- AE 可选技能只注入提示词。
- 角色：解析成功即预览回填；「保存角色」才落库。
- 候选稿默认中文摘要；字符串化 JSON 不得作为聊天气泡主视图。
- 桌面走 Rust SSE，Web 走 Provider 或受限 Vite 代理；失败可重试，不删项目记忆。
- `pages` 可导入 `features` 做解析水合；`shared` 不得导入 `core/services`。
