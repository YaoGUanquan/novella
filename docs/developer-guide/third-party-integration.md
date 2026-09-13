# 第三方能力接入

Novella 的第三方 AI、图像和视频能力应通过统一能力契约接入。业务层只依赖 operation、provider、model、统一结果和统一错误，不直接依赖供应商原始 JSON 或 URL。

## 接入边界

```text
feature -> domain service -> capability registry/adapter -> provider endpoint
```

禁止 React 组件直接调用第三方 API。供应商差异放在 adapter 的 request mapper、response parser、stream parser、task lifecycle 和 error mapper 中。

## 注册能力

在 `src/core/services/ai/capability-registry.ts` 注册 `operation + providerId + modelId`。注册项必须声明版本、协议和 endpoint 引用。未知能力必须返回明确的 `Unsupported capability`，不得静默回退到另一个模型。

```ts
capabilityRegistry.register({
  operation: 'video',
  providerId: 'my-provider',
  modelId: 'my-video-model',
  version: '1',
  protocol: 'json',
  endpointRef: 'configured-gateway',
});
```

## 长任务要求

提交任务时生成 `GenerationExecutionContext`，冻结 provider、model、协议、endpoint、请求版本、超时、重试和幂等键。查询、取消、下载只能使用任务上下文，不能重新读取当前设置推导路由。

## 统一错误与结果

使用 `ProviderError` 分类认证失败、限流、参数错误、不可用、超时、取消、资产校验失败和不支持。日志只记录 requestId、operation、provider、耗时和错误类别，不记录 API key、Bearer token 或完整敏感 prompt。

## 图片/视频资产

远程 URL、Data URL、Blob URL 仅作为传输输入或临时结果。持久化前必须经过文件类型、大小、路径和响应校验，并保存受控相对路径或后续 Resource 引用。

## 最低测试清单

- capability 注册、查找和未知能力错误。
- request mapper、response parser、stream/task lifecycle 和错误映射。
- 长任务在设置变更后仍使用创建时上下文。
- 超时、取消、限流、供应商 5xx 和重复提交。
- 真实供应商测试使用脱敏凭据和独立授权；默认只运行 mock/contract 测试。
