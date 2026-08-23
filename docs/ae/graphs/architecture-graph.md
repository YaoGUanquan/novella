---
type: graph
status: current-static
date: 2026-08-23
---

# 架构图谱入口

- Mermaid 图谱：`docs/03-analysis/architecture-graph.md`
- 本轮已补充新建工程 AI 灵感与项目上下文传递图，覆盖 feature adapter、shared 表单、configured dialogue 和 project store。
- 本轮已补充创作助手对话与角色回填图：Sheet、技能分层、Web/Tauri 双轨传输、候选稿摘要、预览回填与对话内保存。
- 本轮进一步补充 Agent / feature reducer / React effects 三层状态所有权，以及 turn-ID 陈旧终态防护。
- 本轮补充生成参考图全链路：configured image、Tauri JSON/SSE/Base64 解析、项目 `assets/images` 落盘、相对路径持久化、受控 IPC 读取、角色卡与助手消息预览。
- 图谱同步记录路由项目 ID、跨项目 fallback 拒绝和异步旧快照保护，避免生成资产写入错误工程或被水合覆盖。
- 本轮已补充设置三连接面与图片/视频配置优先路由图；视频请求只接受公网 URL。
- Shallow dependency graph：`docs/ae/graphs/graph.json` 记录 2026-08-23 对 `src/features/creative-assistant` 的完整浅层扫描（17 nodes / 37 relative-import edges），fingerprint `63f72b64ef679b4ffab3beaa09fed1d19ba324156e6dbea8fb9664a3240f8f2e`。
- 图谱限制：未安装依赖时无法声称完整 import 解析；动态 import、生成代码和框架别名可能缺失。
