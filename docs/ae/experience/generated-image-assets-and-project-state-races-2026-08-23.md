---
type: experience
status: current
date: 2026-08-23
scope: repository-specific
---

# 生成图片资产与项目状态竞态经验

## 问题

图片供应商已成功返回结果，但角色页显示生成失败、看不到图片，或生成后重载仍显示 0 张。AI 助手也无法稳定返回、持久化和恢复图片消息。

## 根因链

1. 协议层：Grok Imagine 类响应可通过 SSE 把 Base64 Data URL 放在 `image_url`，旧解析只覆盖常规 JSON URL；Data URL 声明的 MIME 也不一定足以决定真实格式。
2. 项目身份层：编辑页内存项目缺少 ID 时保存逻辑生成新 UUID，资产引用写入了另一个项目文件。
3. 状态水合层：加载器可能采用路由 ID 不匹配的 `currentProject`，且旧快照只按角色数量判断是否需要覆盖，导致本地已更新的角色图片被陈旧磁盘状态替换。
4. 预览层：供应商 URL、Data URL、`convertFileSrc` 和 Blob URL都不是稳定的项目值；会话重启后运行时 URL 必然失效。

## 决策

- configured image service 同时解析 JSON、SSE、`b64_json` 和 Data URL；解码后用 JPEG/PNG/GIF/WebP 魔数确认格式。
- 桌面端把结果落盘到 `<workingDir>/<projectId>/assets/images/`，角色与助手消息只持久化 `assets/images/...`。
- 新增受控 `read_image_asset`，限定工作目录、合法项目 ID 和 `assets/images/` 前缀，校验文件大小与图片魔数后返回字节；前端只创建运行时 Blob URL。
- 保存既有项目以路由 `projectId` 为主；加载器拒绝跨项目 fallback；异步磁盘快照不得覆盖本地已修改角色。
- 工作目录输入即时写入本地配置，避免生成时仍读取旧目录。

## 实施与验证命令

```text
pnpm exec jest --runInBand
pnpm exec tsc --noEmit
pnpm exec eslint src --quiet
pnpm build
cargo check --workspace
cargo test --manifest-path src-tauri/Cargo.toml commands::image --lib
rustfmt --edition 2021 --check src-tauri/src/commands/image.rs
git diff --check
```

结果基线：89 个 Jest suites 通过，1016 个 tests 通过、2 个 skipped；TypeScript、ESLint、Vite build、Cargo workspace、3 个 Rust 图片命令测试和 rustfmt 均通过。Tauri WebView 中角色卡与助手消息显示同一张 1280×720 本地参考图。

## 可复用检查顺序

当出现“API 成功但 UI 失败”时，按以下顺序检查：原始协议事件 -> 解析后的图片字节与魔数 -> 落盘绝对路径 -> 项目 JSON 相对引用 -> 保存目标项目 ID -> store/磁盘水合顺序 -> 会话恢复时预览 URL 重建。不要只检查 HTTP 状态或组件 `<img>`。

## 边界

- 不记录 API Key、完整敏感 prompt、供应商凭据或完整真实响应。
- 浏览器模式只提供临时预览，不能声称完成本地资产持久化。
- 不删除疑似错误 UUID 的项目文件；除非用户明确确认目标和恢复策略。
