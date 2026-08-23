# 生成图片资产与 AI 助手调整进度

## 2026-08-23 完成状态

- 已确认 Grok SSE 的 `image_url` 为 Base64 Data URL，桌面端按真实 JPEG/PNG/GIF/WebP 魔数识别并落盘。
- 已定位“生成成功但原项目仍为 0 张”的根因：编辑页保存未使用路由 `projectId`，为空时生成了新 UUID；同时加载器会采用不匹配路由的 `currentProject`，且 hydration key 只比较角色数量。
- 保存现在优先写入当前路由项目；异步旧快照不会覆盖本地角色修改；加载器禁止跨项目 fallback，并以角色内容参与 hydration 判定。
- 项目图片通过受校验的 Tauri `read_image_asset` 命令读取为 Blob 预览，不开放宽泛 asset protocol 文件范围。
- 已恢复原项目 `d4dbe068-498e-4ff9-a42f-c143950d508b` 的既有图片引用；原 JSON 备份位于 AppData 同目录的 `*.before-image-reference-fix-20260823.json.bak`。

## 验证证据

- `pnpm exec jest --runInBand`：89 suites passed；1016 passed，2 skipped。
- `pnpm exec tsc --noEmit`：通过。
- `pnpm exec eslint src --quiet`：通过。
- `pnpm build`：通过。
- `cargo check --workspace`：通过。
- `cargo test --manifest-path src-tauri/Cargo.toml commands::image --lib`：3 passed。
- Tauri WebView：角色卡与 AI 助手消息均显示同一张 1280×720 本地图片，消息显示相对路径 `assets/images/character_1787459361452_0-1787477916392.jpg`。

## 已知非阻塞项

- 已把 `package.json` 的 ESLint 脚本改为 `pnpm exec eslint src --quiet`，消除 Windows PowerShell 对单引号 glob 的兼容问题；需在最终提交前重新执行 `pnpm check`。

## 文档与治理同步

- README、开发者指南、PRD、计划、`AGENTS.md`、AE 宪章、AI 记忆索引/注册表/边界/流程/坑点/决策和架构图谱已同步图片资产合同。
- 可复用根因与验证方法写入 `docs/ae/experience/generated-image-assets-and-project-state-races-2026-08-23.md`。
