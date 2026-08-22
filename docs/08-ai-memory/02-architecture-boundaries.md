<!-- ae-codex:init managed -->

# 架构边界

记录长期稳定的模块边界、职责边界、运行边界和集成点。

## 依赖方向

```text
app/pages -> components/features -> core/services/core -> shared/types
frontend -> infrastructure/tauri-bridge -> Tauri commands -> Rust services -> crates
```

- `core` 不应反向依赖 `app`、`pages` 或 UI。
- `shared` 是基础层，不应依赖 `core`、`features`、`app`、`pages` 或 `infrastructure`。
- feature 之间不直接引用对方内部实现，应通过 `core/services` 或 `shared` 协作。
- Rust Tauri command 只做参数校验和路由，业务逻辑放在 `src-tauri/src/services` 或 `crates/*`。
- 新的 AI Provider 应进入现有 Provider strategy/registry 或 image-generation adapter 边界，不应从组件直接调用第三方 API。
- 新建工程的 shared 表单不得直接导入 `core/services`；由 `features/project` 适配层注入 `generateInspiration`，保持依赖方向单向。

## 集成边界

| 能力             | 当前边界                                                                                    | 关键证据                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 对话模型         | strategy -> dispatcher -> text services                                                     | `src/core/ai/providers`、`src/core/services/ai/text/ai-call-dispatcher.ts`                                                                |
| 图像/视频生成    | provider adapter -> image generation service                                                | `src/core/services/ai/image/image-generation`                                                                                             |
| 本地媒体处理     | JS bridge -> Tauri command -> FFmpeg service                                                | `src/infrastructure/tauri-bridge/commands.ts`、`src-tauri/src/commands/video.rs`                                                          |
| 项目持久化       | Tauri file commands / secure storage fallback                                               | `src-tauri/src/commands/file.rs`、`src/core/services/project/secure-storage-service.ts`                                                   |
| 流水线编排       | typed step -> engine -> checkpoint/quality gate                                             | `src/core/pipeline`                                                                                                                       |
| 新建工程 AI 灵感 | create entry -> feature adapter -> configured dialogue -> shared form                       | `src/features/project/components/AICreateProjectModal.tsx`、`src/shared/components/project/CreateProjectModal.tsx`                        |
| 创作助手         | feature sheet -> configured dialogue events -> skills registry -> candidate parse / persist | `src/features/creative-assistant`、`src/core/services/ai/assistant-skills`、`src/pages/project-edit/components/parse-character-drafts.ts` |
| 服务连接         | 设置三卡 -> secureStorage -> dialogue / configured image / remote video                     | `src/core/config/ai-connection-settings.ts`、`src/pages/settings/SettingsPage.tsx`                                                        |

## 安全边界

- 文件路径必须经过 `validate_input_path`、`validate_output_path` 或 `validate_temp_path`。
- API key 由前端 Provider 配置和 secure storage 处理；实际调用前需确认是否会回退到 `localStorage`，不能把密钥写入日志、PR 或文档。
- 外部 API 的新增集成需要单独记录 endpoint、认证方式、超时、重试、轮询、数据留存和错误映射。
