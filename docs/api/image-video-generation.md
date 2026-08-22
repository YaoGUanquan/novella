# 图像与视频生成

统一适配器入口位于 `@/core/services/ai/image/image-generation/adapter`，兼容 facade 位于 `@/core/services` 的 `imageGenerationService`。两者都返回统一结构，具体 Provider 请求由适配器负责。adapter registry 需要在应用启动时注册可用的 adapter；如果当前启动路径未完成注册，应使用兼容 facade 或先完成注册。

## 图像生成

```ts
import { generateImage } from '@/core/services/ai/image/image-generation/adapter';

const image = await generateImage('古风城市夜景，电影构图', {
  model: 'seedream-5.0',
  size: '2K',
  style: 'anime',
  negativePrompt: '模糊，水印',
  maxRetries: 2,
});
```

`ImageGenResponse` 包含 `url`、可选 `base64`、`width`、`height`、`model` 和 `processingTime`。

## 视频生成和轮询

```ts
import { generateVideo, getVideoStatus } from '@/core/services/ai/image/image-generation/adapter';

const task = await generateVideo({
  model: 'seedance-2.0',
  prompt: '角色从窗边转身并走向镜头',
  duration: 5,
  aspectRatio: '16:9',
  referenceImage: 'https://example.invalid/reference.png',
});

if (task.taskId && task.status === 'processing') {
  const status = await getVideoStatus(task.taskId, task.model);
}
```

视频响应 `VideoGenResponse` 包含 `status`（`processing`、`completed`、`failed`）、`taskId`、`url`、`coverUrl`、尺寸和时长。异步任务的轮询间隔和终止条件应由调用方控制。

## 注册和扩展适配器

```ts
import { imageGenRegistry } from '@/core/services/ai/image/image-generation/adapter';

imageGenRegistry.listModels();
imageGenRegistry.register(adapter);
```

适配器实现 `AIImageAdapter`，至少提供 `modelId`、`displayName`、`generateImage` 和 `healthCheck`；支持视频的模型再实现 `generateVideo` 和 `getVideoStatus`。新增模型时同时更新模型联合类型、注册逻辑、凭据配置和 provider 测试。注册前直接调用统一入口会得到 “No adapter registered” 错误。

## 兼容 facade

`imageGenerationService` 还导出 `seedream`、`kling`、`vidu` 和 `seedance` 的 provider 直连函数。新业务优先使用统一 adapter 入口；只有需要兼容旧调用方或特定 provider 参数时才使用这些直连函数。

## Service-level connection settings

系统设置页现在只维护三类连接：`dialogue`、`image` 和 `video`。每类连接保存请求地址、API Key 和模型 ID，数据通过 `secureStorage` 持久化。

- 配置 `image` 连接后，`generateImage(prompt, options)` 会优先发送 OpenAI-compatible `/images/generations` 请求；没有图片服务 Key 时回退到现有 Seedream/Kling/Vidu provider。
- 启用 `video` 连接后，`generateVideo(prompt, options)` 会通过远程视频 transport 创建并轮询任务；模型决定使用 `/v1/video/generations` 或 `/v1/videos`，任务 ID 查询会进行 URL 编码。
- 远程视频支持模型能力扩展，新增模型应在 `src/core/services/ai/video/remote-video-types.ts` 与 serializer 中注册，不需要修改设置页。
- 设置页不暴露 Secret、超时或 JSON 映射字段；这些是 transport 内部实现细节。
