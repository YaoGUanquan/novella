<!-- ae-codex:init managed -->

# 已知坑点

## 中文与编码

- Windows/PowerShell 输出可能把合法 UTF-8 中文显示成乱码。
- 修改生成的 Markdown 前，先用显式 UTF-8 读取验证。

## 已观察问题

- 仓库文档和部分源码注释存在历史编码显示异常；本次没有批量重编码，避免无关 diff。
- 外部开发者文档描述的 Auto-Swarm、13 个模型和部分 Rust crate 能力，不能自动视为已实现；以实际导出、调用链和运行验证为准。
- `src/core/services/pipeline/pipeline-types.ts` 明确标记为兼容层；新代码应优先使用 `src/core/pipeline` 的类型和入口。
- `src/infrastructure/tauri-bridge/commands.ts` 仍保留 `readText`/`writeText` 等 deprecated 方法；新项目文件操作优先使用 `readProjectFile`/`saveProjectFile`。
- 本地依赖已安装，可跑 focused Jest；不要沿用「node_modules 不存在因此测试未执行」的旧扫描结论。
- 助手聊天气泡若出现整段 JSON，先检查模型是否把数组包成字符串，以及 `looksLikeStructuredDraft` 是否识别引号包裹；绿色候选稿卡的中文摘要不能代替气泡正文。
- 角色外观下拉只接受 `short|average|tall` 与 `slim|average|athletic|heavy`。模型给 `175`、`thin`、中文颜色时，必须先规范化或改为输入框/色块映射，否则界面显示空白或全黑色块。
- 「保存本轮记忆」不会填写角色表单；角色保存按钮在候选稿区。
- 创作助手深色侧栏里，服饰摘要卡必须浅色字，避免 `slate-400` 叠在 `slate-900` 上看不清。
- 不要在流式 turn 的 `finally` 中无条件 `setGenerating(false)` 或清空 streaming ID；旧请求可能在新请求开始后到达。终态必须经 reducer 的 turn-ID guard。
- 候选解析或图片生成属于当前 turn 的完成回调；若在回调前解除 generating，用户可并发开启下一轮，导致图片/候选结果落到错误轮次。
- `assistant-patched` 适合流式增量和非终态补丁；完成、失败、取消必须走对应 terminal action，避免绕过原子状态转换。
- Grok Imagine 类服务可能用 SSE 返回 `{ type: "image", image_url: "data:image/...;base64,..." }`；不能只解析 OpenAI JSON `data[0].url`，也不能按 Data URL 声明的 MIME 直接决定扩展名，应以解码后魔数为准。
- 生成成功但角色卡仍为 0 张时，先核对项目保存目标 ID 和随后的异步水合：空内存 ID 生成新 UUID、采用路由不匹配的 `currentProject`、只按角色数量比较快照，都会让资产写入错误项目或被旧快照覆盖。
- `convertFileSrc` 或宽泛 Tauri asset protocol 不适合作为任意工作目录图片的长期预览方案；应通过限定 `assets/images/` 的读取命令返回字节并创建临时 Blob URL。
- 助手会话中的图片 `previewUrl` 是运行时派生值。持久化前必须清空；恢复时根据相对路径重新解析，否则重启后 Blob URL 必然失效。

## 外部服务风险

- 真实 API key、请求体、响应体和远程任务 ID 不得进入记忆库或扫描报告。
- 视频生成服务可能需要异步轮询、签名、回调或下载；必须以目标厂商文档为准，不得复用聊天模型的同步假设。
- 已观察：在 Web/Vite 模式下，对话服务的跨域预检可能在实际 SSE `POST` 前被远端拒绝。此时密钥和模型配置未必有问题；先检查浏览器 Network 中的 `OPTIONS`、允许的 Origin/Methods/Headers，再判断认证或模型错误。
- Vite 本地代理仅用于开发调试，且必须固定到启动时指定的 HTTPS 上游、绑定 `127.0.0.1`，不能由页面传入任意目标 URL。打包后的 Tauri 应用不包含 Vite；生产版应通过 Rust 原生 HTTP/SSE transport 和 Tauri IPC 规避浏览器 CORS。
- 原生对话传输已接入 `src-tauri/src/commands/dialogue.rs` 的受控 HTTPS SSE 命令；前端在 Tauri runtime 选择 IPC，在 Web runtime 才使用 Provider/Vite 路径。2026-08-22 已在本机完成 `cargo check --workspace` 和 `pnpm tauri dev` 启动；真实密钥桌面 SSE 仍需用户在 Tauri 窗口内验收，不能用浏览器打开 `http://127.0.0.1:1420` 代替。
- 助手失败消息保留在当前会话，可重试原请求；单条删除和清空会话不影响项目级已确认记忆。
- 创建页的随机灵感必须允许模型返回 Markdown 代码块，但解析失败时要回退本地样本；不能因为 JSON 解析失败清空用户已有标题或概要。
- 共享 UI 组件不能直接导入 AI service；应使用 feature 层适配和回调注入，否则会违反 `shared` 依赖边界。
- 设置页三个连接面才是用户配置入口；不要再按历史「七家 Provider 分卡」改设置 UI。
- 远程视频素材必须是公网 http(s) URL；`file://`、Windows 路径、Blob、base64 会在请求构建层报错，不会静默改写。
- `ProjectData.artStyle` 与 `ProjectData.aspectRatio` 是兼容性可选字段，旧项目可能没有值，助手上下文必须显示“未设置”而不能假设默认已持久化。
- 对话字符串流必须丢弃 thinking 分片；灵感弹窗等 JSON 调用方走 `streamConfiguredDialogue`，助手时间线才走事件流。
- 未发出思考分片时不要编造思维链。写技能（候选稿、记忆）即使被模型标记调用，也只能生成提案。
- `pnpm check` 必须使用跨 shell 的 ESLint 目录参数。Windows PowerShell 会把 package script 中的单引号 glob 当作文件名；仓库基线是 `pnpm exec eslint src --quiet`。
