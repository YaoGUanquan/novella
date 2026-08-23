<!-- ae-codex:init managed -->

# 创作助手

跨会话仍有效的产品行为。实现以 `src/features/creative-assistant` 为准。

## 职责

- 在角色、脚本、分镜、项目详情提供与当前步骤绑定的侧栏对话。
- 先澄清再给候选稿；写表单和写工程必须用户确认。
- 项目记忆只在用户点「保存本轮记忆」后写入本地；不等于角色表单已保存。

## 稳定约定

- 领域编排由 `src/core/services/ai/assistant-agent` 统一封装；展示状态由 feature 内纯 reducer 管理，二者都不直接执行 React DOM 操作。
- reducer 管消息、活动 turn、错误、候选稿、项目记忆和 hydrate/reset；组件保留输入、附件、菜单/弹窗、refs、取消、网络与持久化副作用。
- 完成/失败/取消必须携带 turn ID 并原子提交；旧 turn 不能结束新 turn，候选解析/图片生成完成前不能提前解除 generating。
- 思考过程 = 智能体编排时间线，忽略 `kind: 'thinking'`。
- AE 可选技能只注入提示词。
- 角色：解析成功即预览回填；「保存角色」才落库。
- 候选稿默认中文摘要；字符串化 JSON 不得作为聊天气泡主视图。
- 桌面走 Rust SSE，Web 走 Provider 或受限 Vite 代理；失败可重试，不删项目记忆。
- `pages` 可导入 `features` 做解析水合；`shared` 不得导入 `core/services`。
- 角色步骤可从生成按钮或助手自然语言意图触发图片生成；结果必须同时进入角色参考图集合和助手图片消息。
- 桌面端图片只持久化 `assets/images/...` 相对路径。供应商 URL/Data URL 和 Blob `previewUrl` 均为临时派生值；会话恢复后通过 `read_image_asset` 重新生成预览。
- 保存既有项目必须使用路由项目 ID；加载器不得用其他项目的 store 快照 fallback，也不得让异步旧快照覆盖本地已修改角色。

## 验证基线

- 2026-08-23：完整 Jest 89 suites / 1016 tests（2 skipped）、TypeScript、目标 ESLint、生产构建、Cargo workspace，以及 Tauri WebView 角色卡/助手消息本地图片预览通过。
- 未验证：其他供应商图片 SSE/Base64 变体；真实凭据和完整响应不进入记忆库。
