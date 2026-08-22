# Pipeline Service

Pipeline 统一入口是 `@/core/pipeline`。引擎按添加顺序执行步骤；每个步骤接收 `StepInput`，并返回包含 `stepId`、`status`、`data` 等字段的 `StepOutput`。

## 创建和执行

```ts
import {
  createPipelineEngine,
  PipelineExecutionMode,
  PipelineStepId,
  StepStatus,
} from '@/core/pipeline';
import type { PipelineStep } from '@/core/pipeline';

const pipeline = createPipelineEngine({
  workflowId: 'workflow-001',
  projectId: 'project-001',
  enableCheckpoint: true,
  enableQualityGate: true,
});

const step: PipelineStep = {
  id: 'import-novel',
  name: '导入小说',
  stepId: PipelineStepId.IMPORT,
  mode: PipelineExecutionMode.SEQUENCE,
  retryPolicy: {
    maxRetries: 2,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 5000,
  },
  async execute(input) {
    return {
      stepId: PipelineStepId.IMPORT,
      status: StepStatus.COMPLETED,
      data: input.source,
      startTime: Date.now(),
      retryCount: 0,
    };
  },
};

pipeline.addStep(step);
const output = await pipeline.run({ source: 'novel.txt' });
```

`createPipelineEngine` 的配置字段：

| 字段                | 类型                   | 默认值 | 说明                                     |
| ------------------- | ---------------------- | ------ | ---------------------------------------- |
| `workflowId`        | `string`               | 必填   | 工作流标识，也是 checkpoint 的作用域标识 |
| `projectId`         | `string`               | -      | 关联项目标识                             |
| `enableCheckpoint`  | `boolean`              | `true` | 是否读写步骤 checkpoint                  |
| `enableQualityGate` | `boolean`              | `true` | 是否启用质量门配置                       |
| `middlewares`       | `PipelineMiddleware[]` | -      | 生命周期中间件                           |

## 生命周期

```ts
pipeline.onEvents({
  onStepStart: (stepId) => console.info('start', stepId),
  onStepProgress: (stepId, progress, message) => {},
  onStepComplete: (stepId, output) => {},
  onStepFail: (stepId, error) => {},
});

pipeline.pause();
await pipeline.resume();
pipeline.cancel();
```

`pause()` 仅在运行中返回 `true`；`resume()` 会从已保存的 checkpoint 恢复。`run()` 或 `resume()` 失败时会 reject，同时引擎状态变为 `FAILED`。状态可通过 `getStatus()`、`isRunning()`、`isFinal()` 和 `isFailed()` 查询。

## 上下文和步骤契约

步骤可通过 `getContext(input)` 获取 `PipelineContext`，用 `getVariable`/`setVariable` 共享跨步骤变量，用 `saveCheckpoint` 保存可恢复数据。`StepOutput.data` 应保持可序列化，以便 checkpoint 持久化。

相关类型均从 `@/core/pipeline` 导出：`PipelineStep`、`StepInput`、`StepOutput`、`PipelineContext`、`RetryPolicy`、`QualityGateConfig`、`PipelineResult`。
