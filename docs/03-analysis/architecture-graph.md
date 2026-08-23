# Novella 架构与调用图谱

## 总体图

```mermaid
flowchart TD
  UI[React pages/components/features]
  Core[core services and domains]
  AI[core/ai providers and text services]
  Media[image-generation adapters and video services]
  Pipeline[core/pipeline PipelineEngine]
  Bridge[infrastructure/tauri-bridge]
  Commands[src-tauri commands]
  RustServices[src-tauri services]
  Crates[Cargo workspace crates]
  FFmpeg[FFmpeg/native media]
  Remote[External AI/video APIs]
  Storage[Project/secure storage]

  UI --> Core
  Core --> AI
  Core --> Media
  Core --> Pipeline
  UI --> Bridge
  Bridge --> Commands
  Commands --> RustServices
  RustServices --> Crates
  RustServices --> FFmpeg
  AI --> Remote
  Media --> Remote
  Commands --> Storage
  Pipeline --> AI
  Pipeline --> Media
  Pipeline --> Bridge
```

## 新建工程 AI 灵感与上下文图

```mermaid
flowchart LR
  CreateEntry[首页 / Hero / 全局新建入口]
  FeatureAdapter[features/project/AICreateProjectModal]
  SharedModal[shared CreateProjectModal]
  Dialogue[aiService.streamConfiguredDialogue]
  Settings[安全配置 dialogue 连接]
  Draft[JSON 灵感草稿]
  LocalFallback[本地灵感兜底]
  Store[Zustand project store]
  Project[ProjectData: name / description / artStyle / aspectRatio]
  Assistants[角色 / 脚本 / 分镜 / 详情 AI 助手]

  CreateEntry --> FeatureAdapter --> SharedModal
  FeatureAdapter --> Dialogue --> Settings
  SharedModal --> Draft
  SharedModal --> LocalFallback
  SharedModal --> Store --> Project
  Project --> Assistants
```

边界说明：shared 弹窗只处理表单、解析和降级；feature 适配层负责把非敏感创作上下文转换为对话消息；连接地址和密钥只在 service/configuration 层读取。

## 创作助手对话与角色回填图

```mermaid
flowchart TD
  Steps[角色 / 脚本 / 分镜 / 详情]
  Sheet[AICreativeAssistantSheet]
  Reducer[feature pure UI reducer]
  Agent[CreativeAssistantAgent]
  Skills[assistant-skills 产品技能 + AE 适配]
  Events[streamConfiguredDialogueEvents]
  Web[Provider / Vite 开发代理]
  Native[Tauri dialogue.rs HTTPS SSE]
  Effects[React effects: session / memory persistence]
  Abort[AbortController / DOM / dialogs]
  Timeline[思考过程编排步骤]
  Memory[项目记忆 需确认]
  Parse[parseCharacterDrafts]
  Preview[中文摘要候选稿]
  Draft[左侧待确认草稿表单]
  Persist[保存角色]

  Steps --> Sheet
  Sheet --> Reducer
  Sheet --> Agent --> Skills
  Agent --> Events
  Events --> Web
  Events --> Native
  Events --> Sheet --> Timeline
  Reducer --> Effects
  Sheet --> Abort
  Reducer --> Memory
  Sheet --> Parse --> Preview
  Parse --> Draft
  Preview --> Persist
  Draft --> Persist
```

边界说明：Agent 负责 UI-free 领域编排；feature reducer 负责消息、活动 turn、错误、候选、记忆和 reset 的确定性转换；React 组件保留网络、取消、DOM、弹窗与持久化副作用。终态按 turn ID 防止旧请求清除新请求。角色解析成功即预览回填；保存角色才写已确认列表。

## 生成参考图、项目资产与预览图

```mermaid
flowchart LR
  Entry[StepCharacter 生成按钮 / 助手图片意图]
  Generate[image-generation-service]
  Configured[configured-image-service]
  NativeGenerate[Tauri generate_configured_image]
  Provider[图片 Provider JSON / SSE / Base64]
  Download[Tauri download_image_asset]
  File[workingDir/projectId/assets/images/*]
  Relative[Character + AssistantMessage: assets/images/...]
  Read[Tauri read_image_asset]
  Blob[运行时 Blob URL]
  Views[角色卡 + AI 助手消息]

  Entry --> Generate --> Configured --> NativeGenerate --> Provider
  Provider --> Download --> File --> Relative --> Read --> Blob --> Views
```

边界说明：供应商 URL/Data URL 和 Blob URL 都是临时派生值；桌面项目只持久化相对路径。Rust 下载/读取边界校验工作目录、项目 ID、固定 `assets/images/` 前缀、大小和图片魔数。保存以路由项目 ID 为准；加载不得跨项目 fallback 或让陈旧磁盘快照覆盖本地角色资产。

## AI 请求图

```mermaid
flowchart LR
  Request[AIRequestConfig / ChatCompletionRequest]
  Dispatcher[AICallDispatcher]
  Registry[ProviderRegistry]
  Strategy[ProviderStrategy]
  Compat[OpenAICompatibleStrategy]
  Text[Text services / novel parser]
  Remote[Provider endpoint]
  Fallback[Fallback or Mock]

  Text --> Request
  Request --> Dispatcher
  Dispatcher --> Registry
  Registry --> Strategy
  Strategy --> Compat
  Strategy --> Remote
  Dispatcher --> Fallback
```

## 设置与素材生成图

```mermaid
flowchart TD
  Settings[SettingsPage 三张连接卡]
  Store[ai-connection-settings / secureStorage]
  Dialogue[configured dialogue]
  ImageCfg[configured-image-service]
  ImageAsset[项目 assets/images 相对资产]
  VideoCfg[remote-video-service]
  LegacyImg[Seedream / Kling / Vidu 回退]
  PublicURL[仅公网 http(s) 素材]

  Settings --> Store
  Store --> Dialogue
  Store --> ImageCfg
  Store --> VideoCfg
  ImageCfg -->|无图片 Key| LegacyImg
  ImageCfg --> ImageAsset
  VideoCfg --> PublicURL
```

边界说明：设置页不暴露协议细节。本地路径、Blob、base64 在视频请求构建层阻断。默认 vendor URL 以源码配置为准，不视为已确认的产品合作关系。

## 视频生成与本地渲染图

```mermaid
flowchart LR
  Storyboard[Storyboard / video feature]
  GenService[image-generation-service]
  Adapter[provider adapter]
  Cloud[Cloud image/video generation]
  Asset[Asset library / project state]
  Export[Video export feature]
  Bridge[TauriService]
  Cmd[video commands]
  Validate[Path validator]
  FFMPEG[FFmpeg services and crates/media]

  Storyboard --> GenService
  GenService --> VideoCfg[configured remote video]
  GenService --> Adapter --> Cloud
  VideoCfg --> Cloud
  Cloud --> Asset
  Asset --> Export --> Bridge --> Cmd --> Validate --> FFMPEG
```

## Pipeline 状态图

```mermaid
stateDiagram-v2
  [*] --> IDLE
  IDLE --> RUNNING: run(input)
  RUNNING --> PAUSED: pause()
  PAUSED --> RUNNING: resume()
  RUNNING --> COMPLETED: all steps pass
  RUNNING --> FAILED: error or quality gate fail
  RUNNING --> CANCELLED: cancel()
  FAILED --> RUNNING: resume from checkpoint
  COMPLETED --> [*]
  CANCELLED --> [*]
```

## Rust crate 关系

```mermaid
graph TD
  Tauri[src-tauri]
  IPC[crates/ipc]
  Core[crates/core]
  AI[crates/ai]
  Media[crates/media]
  Plugin[crates/plugin]
  Updater[crates/updater]

  Tauri --> IPC
  Tauri --> Core
  Tauri --> AI
  Tauri --> Media
  Tauri --> Plugin
  Tauri --> Updater
  IPC --> Core
  IPC --> AI
  IPC --> Media
```

## 图谱边界

这是基于源码、配置、导出入口和调用点的静态关系图。2026-08-23 使用 `ae-graph-build --root src/features/creative-assistant --limit 10000 --edge-limit 10000` 扫描 17 个 feature 文件和 37 条浅层相对 import，确认 Sheet 导入 reducer、session/memory、展示组件与类型。路径别名、动态 import 和框架解析仍可能缺失；完整依赖约束以 ESLint/dependency-cruiser 和实际构建为准。
