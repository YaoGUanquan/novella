# API 参考

Novella 的 API 是桌面端内部 TypeScript 模块，不是独立的 HTTP 服务。本页只列出源码中已经导出的稳定入口。

## 入口地图

| 领域      | 推荐入口                                      | 用途                                           |
| --------- | --------------------------------------------- | ---------------------------------------------- |
| 流水线    | `@/core/pipeline`                             | 注册步骤、执行、暂停、恢复和取消工作流         |
| AI 文本   | `@/core/services` 的 `aiService`              | 文本生成、脚本生成、分析、翻译、流式和批量调用 |
| Provider  | `@/core/ai/providers` 的 `providerRegistry`   | 查询或注册文本模型 Provider 策略               |
| 图像/视频 | `@/core/services` 的 `imageGenerationService` | 统一图像、视频生成和视频任务查询               |
| 字幕      | `@/core/services` 的 `subtitleService`        | 生成、解析、导出、调整和翻译字幕               |
| Tauri     | `@/infrastructure/tauri-bridge/commands`      | 文件、视频处理、窗口和桌面能力桥接             |

## 运行约束

- 这些 API 在 Tauri + Vite 应用运行时使用，不能直接当作远程 REST endpoint 调用。
- Provider API Key 由应用的安全存储和配置层提供。不要把密钥写进源码、示例或日志。
- 图像/视频 Provider 的返回结构统一，但具体模型、配额、异步状态和错误码由适配器实现决定。
- `docs:api` 会生成 TypeDoc 输出；本目录的手写页面用于解释入口、约束和常见组合方式。

## 详细页面

- [API 总览](./overview)
- [Pipeline Service](./pipeline-service)
- [AI Service](./ai-service)
- [图像与视频生成](./image-video-generation)
- [Subtitle Service](./subtitle-service)
- [Tauri Bridge](./tauri-bridge)

## 源码位置

- Pipeline：`src/core/pipeline/index.ts`
- AI facade：`src/core/services/ai/text/ai-service.ts`
- Provider registry：`src/core/ai/providers/provider-registry.ts`
- 图像/视频 facade：`src/core/services/ai/image/image-generation-service.ts`
- 图像/视频 adapter：`src/core/services/ai/image/image-generation/adapter.ts`
- 字幕：`src/core/services/video/subtitle-service.ts` 和 `src/core/services/video/subtitle/`
- Tauri bridge：`src/infrastructure/tauri-bridge/commands.ts`
