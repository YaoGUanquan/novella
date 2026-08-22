---
type: graph
status: current-static
date: 2026-08-22
---

# 架构图谱入口

- Mermaid 图谱：`docs/03-analysis/architecture-graph.md`
- 本轮已补充新建工程 AI 灵感与项目上下文传递图，覆盖 feature adapter、shared 表单、configured dialogue 和 project store。
- 本轮已补充创作助手对话与角色回填图：Sheet、技能分层、Web/Tauri 双轨传输、候选稿摘要、预览回填与对话内保存。
- 本轮已补充设置三连接面与图片/视频配置优先路由图；视频请求只接受公网 URL。
- Shallow dependency graph：由 `ae-graph-build --root .` 生成预览，当前扫描上限 500 节点，属于静态关系证据。
- 图谱限制：未安装依赖时无法声称完整 import 解析；动态 import、生成代码和框架别名可能缺失。
