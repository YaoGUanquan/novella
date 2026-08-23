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
- 创作助手的领域编排位于 `src/core/services/ai/assistant-agent`；消息、活动 turn、错误、候选稿和记忆等展示状态位于 `src/features/creative-assistant/creative-assistant-ui-reducer.ts`。core Agent 不得吸收 React 展示状态，reducer 不得执行网络、存储、DOM 或取消副作用。
- 生成图片的供应商结果属于临时传输值；桌面端必须经 configured image service 和 Tauri 图片命令转换成 `<workingDir>/<projectId>/assets/images/` 文件，项目/会话只保存相对路径。预览通过受控 IPC 读取为 Blob URL。
- 项目路由 ID、store 当前项目和磁盘文件是三个独立状态来源。保存既有项目以路由 ID 为准；加载器不得跨项目 fallback，磁盘水合不得覆盖本地已修改的角色/图片集合。

## 集成边界

| 能力             | 当前边界                                                                                                                      | 关键证据                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 对话模型         | strategy -> dispatcher -> text services                                                                                       | `src/core/ai/providers`、`src/core/services/ai/text/ai-call-dispatcher.ts`                                                                                                                                         |
| 图像/视频生成    | provider adapter -> image generation service                                                                                  | `src/core/services/ai/image/image-generation`                                                                                                                                                                      |
| 本地媒体处理     | JS bridge -> Tauri command -> FFmpeg service                                                                                  | `src/infrastructure/tauri-bridge/commands.ts`、`src-tauri/src/commands/video.rs`                                                                                                                                   |
| 项目持久化       | Tauri file commands / secure storage fallback                                                                                 | `src-tauri/src/commands/file.rs`、`src/core/services/project/secure-storage-service.ts`                                                                                                                            |
| 流水线编排       | typed step -> engine -> checkpoint/quality gate                                                                               | `src/core/pipeline`                                                                                                                                                                                                |
| 新建工程 AI 灵感 | create entry -> feature adapter -> configured dialogue -> shared form                                                         | `src/features/project/components/AICreateProjectModal.tsx`、`src/shared/components/project/CreateProjectModal.tsx`                                                                                                 |
| 创作助手         | feature sheet -> feature reducer / core Agent -> configured dialogue events -> adapters -> candidate parse / explicit persist | `src/features/creative-assistant/creative-assistant-ui-reducer.ts`、`src/core/services/ai/assistant-agent`、`src/core/services/ai/assistant-skills`、`src/pages/project-edit/components/parse-character-drafts.ts` |
| 生成图片资产     | feature -> configured image -> native generate/download -> relative project asset -> native read -> Blob preview              | `src/core/services/ai/image/configured-image-service.ts`、`src/pages/project-edit/components/generated-image-assets.ts`、`src-tauri/src/commands/image.rs`                                                         |
| 服务连接         | 设置三卡 -> secureStorage -> dialogue / configured image / remote video                                                       | `src/core/config/ai-connection-settings.ts`、`src/pages/settings/SettingsPage.tsx`                                                                                                                                 |

## 安全边界

- 文件路径必须经过 `validate_input_path`、`validate_output_path` 或 `validate_temp_path`。
- API key 由前端 Provider 配置和 secure storage 处理；实际调用前需确认是否会回退到 `localStorage`，不能把密钥写入日志、PR 或文档。
- 外部 API 的新增集成需要单独记录 endpoint、认证方式、超时、重试、轮询、数据留存和错误映射。
- 图片资产读取必须限制到当前工作目录、合法项目 ID 和 `assets/images/` 前缀，并校验大小与图片魔数；不得用宽泛 asset protocol 暴露任意文件。
