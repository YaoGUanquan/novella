<div align="center">

<img src="public/logo.svg" alt="Novella" width="96" />

# Novella (Novella AI)

桌面端 AI 漫剧创作工作台。导入小说或剧本后，在同一工程里写脚本、定角色、排分镜，并用侧栏助手生成可确认的草稿。

当前版本 `0.0.1`。技术栈：Tauri v2、React 19、TypeScript、Rust、pnpm workspace。

[文档站点](https://agions.github.io/novella/) · [本仓库](https://github.com/YaoGUanquan/novella) · [问题反馈](https://github.com/YaoGUanquan/novella/issues/new)

</div>

---

## 能做什么

日常创作路径在项目编辑页，不依赖宣传里的「一键 4K 成片」。

| 步骤               | 说明                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 新建工程           | 可填标题、概要、画风、画幅；「随机灵感」走已配置对话服务，失败则回退本地样本。                                     |
| 脚本 / 角色 / 分镜 | 正文进入可编辑草稿；AI 结果先预览，确认后才写入工程。                                                              |
| 创作助手           | 各步骤右侧对话。思考过程展示本轮编排步骤，不是供应商思维链。                                                       |
| 角色回填           | 解析成功的草稿先填左侧「待确认角色」（含外观、服饰）；对话里点「保存角色」才落库。「保存本轮记忆」不会填角色表单。 |
| 设置               | 三张连接卡：对话、图片、视频。每张只需地址、API Key、模型 ID。                                                     |

写表单、写工程、保存项目记忆都需要用户确认。

---

## 运行

开发分支是 `develop`。包管理使用 `corepack pnpm`。

```bash
git clone https://github.com/YaoGUanquan/novella.git
cd novella
corepack enable
corepack pnpm install
corepack pnpm dev          # Web / Vite，默认 http://127.0.0.1:1420
corepack pnpm tauri dev    # 桌面 WebView；对话走 Rust HTTPS SSE
```

Windows 上验收桌面对话时，请打开 Tauri 窗口，不要只用浏览器访问开发服务器。

打包：

```bash
corepack pnpm run build:desktop
```

提交前按改动范围检查：

```bash
corepack pnpm check
corepack pnpm test
```

---

## 配置模型

打开应用「设置」：

1. **对话模型**：剧本、助手、新建灵感。Claude / Anthropic 名称走 Anthropic 协议，其余走 OpenAI 兼容。
2. **图片生成**：有 Key 时优先请求配置的 `/images/generations`；否则回退 Seedream / Kling / Vidu。
3. **视频生成**：启用且有 Key 时走远程视频服务。素材必须是公网 `http(s)` URL，不能发 `file://`、Blob 或 base64。

密钥走安全存储，不要写进仓库、日志或文档。未配置对话 Key 时，部分流程会使用 Mock，只适合界面预览。

Web 开发若遇到 CORS 预检失败，可按 [服务连接](docs/developer-guide/service-connections.md) 开启受限 Vite 代理。生产构建不含该代理。

---

## 创作助手怎么用

1. 在角色、脚本、分镜或项目详情打开右侧助手。
2. 可选技能只改提示词，不会执行外部 `SKILL.md`。澄清、生成草稿、记忆提案始终在后台生效。
3. 候选稿默认显示中文摘要；原始 JSON 在「查看原文」。
4. 脚本 / 分镜默认是「填充表单 + 确认弹窗」。角色是预览回填 +「保存角色」。
5. 失败可重试、删单条或清空当前会话；这些操作不删除已确认的项目记忆。

实现入口：`src/features/creative-assistant/`。调用链见 [创作助手](docs/developer-guide/creative-assistant.md)。

---

## 仓库结构（摘要）

```text
src/app、src/pages     入口与页面
src/features           垂直功能（创作助手、角色、分镜、新建工程）
src/core               AI Provider、领域服务、Pipeline
src/infrastructure     Tauri 桥
src-tauri              桌面命令；对话 SSE 在 commands/dialogue.rs
docs/                  用户/开发者指南、AE 方案、AI 记忆库
```

依赖方向：`app/pages` → `features/components` → `core` → `shared`。`shared` 不得导入 `core/services`。

应用内还有 Multi-Agent 工作台（`MasterDirectorAgent`、共享黑板、自定义 Agent）。那是独立编排界面；角色与分镜的侧栏助手走配置对话服务，二者不要混成同一条调用链。Auto-Swarm、模型清单和 GPU 加速数字以源码与测试为准，公开站点不能替代本地实现。

---

## 文档

| 文档                                                    | 用途                 |
| ------------------------------------------------------- | -------------------- |
| [AGENTS.md](AGENTS.md)                                  | 仓库开发契约         |
| [安装](docs/getting-started/installation.md)            | 系统要求             |
| [配置](docs/getting-started/configuration.md)           | 设置页三个连接面     |
| [创作助手](docs/developer-guide/creative-assistant.md)  | 侧栏、技能、回填     |
| [服务连接](docs/developer-guide/service-connections.md) | Web 代理与 Tauri SSE |
| [架构图谱](docs/03-analysis/architecture-graph.md)      | 静态模块关系         |

---

## 许可证

[MIT License](LICENSE) © 2025-2026 Agions
