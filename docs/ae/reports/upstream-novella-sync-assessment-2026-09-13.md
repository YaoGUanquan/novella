# 上游 Novella 同步评估

日期：2026-09-13  
上游：`https://github.com/Agions/novella`  
本地分支：`develop`  
本地基线：`939de9e`  
上游引用：`FETCH_HEAD`，最新提交 `3618e31`（2026-09-08）

## 结论

上游从共同基线 `89eeb80` 后包含 11 个提交，主体是跨目录、跨助手、跨 Tauri 和文档体系的大规模重构。不直接 merge `main`，改为按能力拆分吸收。

## 适合吸收的方向

### 插件注册与 Hook 管道

上游提交 `b00ca3f`、`8585ea3`、`e82b2f1` 提供了 `PluginRegistry`、插件启停和剧本、角色、运镜、渲染 Hook 的方向。适合与当前 `CapabilityRegistry`、Pipeline 和 Provider 边界结合，重新实现为类型化、可观测、可声明权限的插件契约。

不直接复制上游实现：当前版本使用大量 `any`，插件异常被吞掉，内置插件写入未经运行时证明的固定能力值，SDK 还依赖应用内部 `@/` alias，不能作为独立包发布。

### A2A

提交 `0dd012a` 的 discovery、消息类型和 Agent 描述符可作为协议建模参考。当前实现只是内存广播：没有 endpoint transport、身份认证、签名、重放保护、schema 校验和真实 ACK 语义，因此暂不合并运行时代码。

### 离线用户手册

提交 `91b80fe` 的离线 Markdown/TXT/PDF 和安装包资源相对独立，可以作为后续单独移植候选。移植前必须审查文档中的 4K、GPU、自动化步骤和跨平台承诺是否有当前运行时证据，并确认 PDF 生成依赖。

## 明确不直接合并

- `c5d9c28` 的 `src/shared -> src/common` 全量重命名：会制造大规模路径冲突，并删除当前 AE、AI memory 和过程证据。
- 助手整体删除/重构：会破坏当前 `CreativeAssistantAgent`、reducer、候选稿确认、图片资产持久化和 turn race 修复。
- 删除 Tauri dialogue/image 命令：会破坏当前 native SSE、图片落盘和受控 IPC 边界。
- `MultiAgentStudio` 改为始终 `createProject`：违反既有工程身份和路由 `projectId` 保存规则。
- `3618e31` 质量重构：依赖前述目录和模块迁移，不能脱离整体架构安全 cherry-pick。

## 吸收策略

1. 先以当前项目代码和已有 `CapabilityRegistry` 为边界，重做插件契约，不复制上游实现。
2. A2A 先补协议设计和安全边界，再决定 Web、Tauri、外部服务传输。
3. 离线手册单独移植，避免把文档删除、目录迁移和运行时代码绑定在一起。
4. 所有上游能力声明保持 `observed`、`inferred`、`unverified` 分级，不把提交存在误写成运行时完成。

## 验证边界

本次使用 `git fetch` 和 `git diff HEAD..FETCH_HEAD` 完成静态差异审查。未执行 merge、cherry-pick、reset、上游代码覆盖、Tauri 运行或真实 Provider 验收。
