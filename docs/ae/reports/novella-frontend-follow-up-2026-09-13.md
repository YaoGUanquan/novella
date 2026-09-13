# Novella 前端体验优化跟进报告

日期：2026-09-13  
范围：首页工程大厅、首页分镜预览、全局动效声明、Page Agent 适配评估。

## 本次完成

- 工程大厅改为展示完整 Zustand 工程列表，不再由 `recentProjects()` 截断到 10 条后再搜索。
- 工程状态改为使用真实 `draft`、`processing`、`completed`、`failed` 映射；移除“100% 就绪”、GPU、4K 等未由工程数据证明的静态承诺。
- 工程卡片采用原生按钮承载打开动作，避免 clickable `div` 与内部操作按钮的嵌套语义冲突；编辑/删除按钮具备可访问名称，键盘焦点时快捷栏可见。
- 删除操作改用现有 Radix Dialog，取消默认聚焦、关闭后恢复触发按钮；确认只移除当前 Zustand 列表记录，明确不会删除磁盘文件。删除抛错或无变化时保留弹窗并显示错误，不报告成功。
- 搜索栏在窄屏下占满可用宽度并可清除；加载、空列表、搜索无结果分别呈现。
- 首页预览改用仓库内 `/sample-shot-1.jpg`，弹窗文案明确为静态示例，不伪装成当前工程输出。
- `.studio-card` 与 `.studio-btn-primary` 的局部 transition 明确列出属性； reduced-motion 下禁止 hover 位移/缩放并关闭平滑滚动。

## Page Agent 评估

Page Agent（Alibaba，MIT）定位是运行在网页内的 DOM/页面操作 Agent：通过 `PageController` 读取页面状态，调用 LLM 生成工具动作，再执行点击、输入、等待等页面工具；官方仓库还提供 custom tools、指令和安全权限相关配置。它适合做 Novella 的“页面 Copilot”，例如在当前页面定位控件、填写表单、打开向导或导航到指定工作区。

当前不建议用 Page Agent 替换 Novella 的 `CreativeAssistantAgent`。Novella 助手承担项目级对话、候选稿解析、用户确认、项目记忆、图片生成和 Provider/Tauri 边界；Page Agent 的核心上下文是 DOM 页面状态和页面工具，不能替代这些 typed domain action、项目身份校验、资产落盘、任务生命周期、权限和审计语义。

推荐的适配方式是后续增加一个受限的 Page Agent UI adapter：只在 Web 页面启用；LLM 请求继续通过 Novella 的统一 Provider/代理边界；custom tools 仅暴露白名单的导航、打开面板、聚焦字段和启动“预览”动作；创建、保存、删除、生成、导出、远程任务提交等动作仍由 `CreativeAssistantAgent` 的 typed action 处理，并要求 preview/confirm/idempotency/audit。Tauri 桌面端不应因为引入 Page Agent 而绕过 IPC 和路径校验。

结论：**可以作为页面交互层增强，但不是当前智能助手领域层的更好替代品。** 现在不安装依赖、不直连 Page Agent 的演示 API、不把 API key 放入浏览器构建，也不开放任意 JavaScript 执行。

## 验证证据

| 层级         | 命令/检查                                                                      | 结果                                                              |
| ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| focused test | `pnpm exec jest --runInBand src/__tests__/features/home/project-grid.test.tsx` | 1 suite / 11 tests 通过                                           |
| type check   | `pnpm exec tsc --noEmit`                                                       | 通过                                                              |
| lint         | `pnpm lint`                                                                    | 通过                                                              |
| build        | `pnpm build`                                                                   | 通过；保留既有 Vite dynamic/static import chunk warning           |
| browser      | `http://127.0.0.1:1420/`                                                       | 0 errors、1 warning；本地图片加载；预览 Dialog 可打开；空状态正常 |
| diff         | `git diff --check`                                                             | 待最终执行                                                        |

浏览器截图：

- [首页桌面端](/C:/Users/yaogu/.codex/visualizations/2026/09/13/01a0997e-3e10-7053-a1d5-5869cedca7e6/home-desktop.png)

## 未验证与残余风险

- Tauri WebView、IPC、桌面文件权限和真实工程文件删除未验证；本次明确没有实现磁盘删除。
- 真实 Provider、Page Agent 实例化、多页面扩展、真实模型调用和成本/限流未验证。
- 浏览器脚本注入了临时本地工程 fixture 后的移动端完整截图、删除确认和键盘流仍需单独复测；本地 focused tests 覆盖了这些状态与交互。
- 全局 `*` transition 和其他页面 Framer Motion 仍未完成逐页治理。
