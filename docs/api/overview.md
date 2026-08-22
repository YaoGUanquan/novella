# API 总览

API 文档按模块拆分。新代码优先使用本页列出的入口，旧路径仅在迁移期间保留。

## 导入约定

```ts
import { aiService, imageGenerationService, subtitleService } from '@/core/services';
import { createPipelineEngine } from '@/core/pipeline';
```

类型使用 `import type`，避免把仅用于编译的类型打进运行时 bundle：

```ts
import type { PipelineStep, StepInput, StepOutput } from '@/core/pipeline';
```

## 错误和取消

异步 API 通过 Promise 或 AsyncGenerator 返回结果。调用方应使用 `try/catch` 处理 Provider、文件和 FFmpeg 错误；图像/视频 adapter 等明确支持 `signal` 的请求可通过 `AbortController` 取消。流水线取消使用 `pipeline.cancel()`，不应直接修改内部状态。

## 兼容性说明

`src/core/services/index.ts` 仍导出多个 facade，便于现有调用方平滑迁移。实现拆分后的新模块（例如 `video/subtitle/`）可以直接导入纯函数，但跨模块业务代码建议从 facade 或统一 barrel 导入。

## 创建工程与 AI 上下文

- 创建工程的持久化字段包括 `name`、`description`、可选 `artStyle` 和可选 `aspectRatio`。
- 共享创建弹窗不直接依赖 AI service；由 feature 层注入流式生成回调，保持 `shared -> core` 边界不反向依赖。
- 工程创建后，角色、脚本、分镜和项目详情助手会携带项目名称、简介、正文、视觉画风和目标画幅。
