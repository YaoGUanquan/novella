# 服务连接

> 设置页三个连接面：对话、图片、视频。以 `src/core/config/ai-connection-settings.ts` 与当前设置页为准。

## 用户可见表面

系统偏好只展示三张卡：对话模型、图片生成、视频生成。每张卡只有地址、API Key、模型 ID。策略选择、超时、Secret、JSON 映射不出现在页面上。

- 对话：Claude/Anthropic 模型或 endpoint 走 Anthropic 协议，其余走 OpenAI 兼容。
- 图片：有 Key 时 `generateImage` 优先走配置的 `/images/generations`；否则回退 Seedream/Kling/Vidu。
- 视频：启用且有 Key 时走 `src/core/services/ai/video/remote-video-service.ts`；模型族决定 `/v1/video/generations` 或 `/v1/videos`。本地 `file://`、Blob、base64 不得当作公网 URL 发送。

密钥经 `secureStorage` 读写，不得写入日志、事件、测试快照或文档。

## 对话传输

```text
Web 开发: Provider 直连，或 VITE_NOVELLA_DIALOGUE_PROXY=true
           + NOVELLA_DIALOGUE_PROXY_TARGET=https://上游
           -> Vite /__novella_dialogue_proxy（仅 127.0.0.1，目标不可由页面指定）
Tauri:     start_configured_dialogue / cancel_configured_dialogue
           -> novella://dialogue/* 事件
```

生产构建不包含 Vite 代理。桌面 CSP 允许 `connect-src https:`，自定义 HTTPS 对话地址才能发出。

## 验证

```bash
corepack pnpm test -- src/__tests__/services/ai-connection-settings.test.ts src/__tests__/services/configured-dialogue-stream.test.ts src/__tests__/services/configured-generation-routing.test.ts src/__tests__/services/remote-video-service.test.ts
```

未验证：真实付费图片/视频生成、真实密钥桌面 SSE。
