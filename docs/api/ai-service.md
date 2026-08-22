# AI Service

## 文本生成 facade

`aiService` 从 `@/core/services` 导出。通用生成的参数是 prompt 加选项对象，不是 OpenAI 风格的 `messages` 对象：

```ts
const text = await aiService.generate('请把下面内容改写成旁白：...', {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 1200,
});
```

选项字段：`model`、`provider`、`temperature`、`max_tokens` 和可选的 `AbortSignal` `signal`。模型不存在或 Provider 调用失败时 Promise 会 reject。当前文本 facade 的 `signal` 仅保留在兼容签名中，取消语义应以具体 Provider 实现为准；不要把它当作通用取消保证。

## 流式和批量

```ts
for await (const chunk of aiService.streamGenerate('生成三句标题', {
  provider: 'openai',
  model: 'gpt-4o',
})) {
  process.stdout.write(chunk);
}

const results = await aiService.batchGenerate(['提示一', '提示二'], {
  provider: 'openai',
  model: 'gpt-4o',
  concurrency: 2,
  onProgress: (completed, total) => {},
});
```

流式生成返回 `AsyncGenerator<string>`；批量生成按输入顺序返回 `string[]`。

配置对话助手调用 `aiService.streamConfiguredDialogue(messages, { signal })`。桌面 Tauri runtime 会优先使用 Rust 原生 HTTPS SSE 与 `novella://dialogue/*` IPC 事件；浏览器开发模式使用受限 Vite 代理（需显式配置），未开启代理时才直连 endpoint。真实服务的 CORS、认证和供应商 SSE 事件格式仍需在目标环境手动验收。

## 已配置对话服务 SSE

`aiService.streamConfiguredDialogue` 使用系统偏好设置中启用的 `dialogue` 连接，返回 `AsyncGenerator<string>`：

```ts
for await (const chunk of aiService.streamConfiguredDialogue(
  [
    { role: 'system', content: '只返回严格 JSON。' },
    { role: 'user', content: '生成一个漫剧工程标题和剧情概要。' },
  ],
  { signal: abortController.signal, temperature: 0.9, max_tokens: 500 }
)) {
  draft += chunk;
}
```

约束：

- 服务从安全配置读取协议、地址、模型和密钥；调用方不得把 API Key、请求地址或连接配置放进 `messages`。
- `signal` 可用于取消流式请求；配置未启用、协议不支持或认证缺失时会 reject。
- HTTP 错误和传输错误统一映射为可观察的配置化对话错误，错误信息只保留状态和主机名等脱敏信息。
- 创建工程的 AI 灵感通过 `src/features/project/components/AICreateProjectModal.tsx` 调用该接口，严格解析 `{ name, description }`；解析失败回退本地样本。

## 创建工程 AI 灵感契约

创建页的 feature 适配层接收以下非敏感上下文：

```ts
type InspirationContext = {
  projectName: string;
  description: string;
  artStyle: string;
  aspectRatio: '16:9' | '9:16';
};
```

模型输出应为 JSON：`{"name":"工程标题","description":"剧情概要"}`。结果只回填表单，不自动创建工程；用户仍可编辑后确认创建。

## 高层业务方法

- `generateScript(model, settings, params)`：生成并解析脚本，返回 `Script`。
- `analyzeVideo(model, settings, videoInfo)`：根据视频元数据生成 `Partial<VideoAnalysis>`。
- `optimizeScript(model, settings, script, optimization)`：`shorten`、`lengthen`、`simplify` 或 `professional`。
- `translateScript(model, settings, script, targetLanguage)`：翻译脚本。

`model`、`settings` 使用 `AIModel` 和 `AIModelSettings` 类型；这些类型从 AI facade 或 `@/shared/types/ai-core` 导出。

## 模型和 Mock

```ts
const models = aiService.getAllModels();
const recommended = aiService.getRecommendedModels('textGeneration');
const domestic = aiService.getDomesticModels();

aiService.setMockMode(true);
const usingMock = aiService.isMockMode();
```

测试需要请求级 mock 时，可使用 `setMockConfig(requestId, config)` 和 `clearMockConfig(requestId)`。Mock 模式只用于本地开发和测试，生产环境应显式关闭。

## Provider registry

```ts
import { providerRegistry } from '@/core/ai/providers';

providerRegistry.getAllNames();
const strategy = providerRegistry.get('openai');
```

Provider strategy 需要实现 `AIProviderStrategy`：`name`、`call(apiKey, config, requestId?)`，并可选实现 `supportsStreaming` 和 `stream`。注册新策略前应补充配置、错误映射和测试；API Key 由配置/安全存储层注入，不要在 strategy 中硬编码。
