---
type: prd
status: implemented
date: 2026-08-23
topic: generated-image-assets-and-assistant-editing
format: human-readable-requirements
sharded: false
---

# 生成图片资产与 AI 助手调整

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

角色页点击“生成参考图”后只把供应商返回的临时 URL 写入角色数据，界面没有缩略图，远程 URL 过期或被跨域策略拦截后用户无法确认生成结果。AI 助手也只能返回文本，不能在对话中发起图片生成或把结果展示给用户。

## Requirements

- R1. 角色页生成参考图后必须在当前页面显示可见缩略图，并保留加载中、失败和空状态。
- R2. 桌面端生成结果必须主动下载到当前工作目录下的项目资产目录（`<projectId>/assets/images/`），项目数据中的角色引用必须保存为相对路径；生成服务返回的临时 URL 只作为下载源，不得作为桌面项目的永久引用。
- R3. 生成结果必须在 AI 助手对话消息中展示，消息至少包含图片预览、生成提示词和资产相对路径；会话恢复时仍能依据相对路径恢复预览地址。
- R4. 用户可在 AI 助手中用自然语言请求“生成参考图”或“调整当前参考图”；助手调用现有图片生成入口，生成结果回传到对话，并同步到当前角色的参考图集合。
- R5. 远程图片响应必须校验 HTTPS 或受支持的 Data URL、HTTP 成功状态、图片 MIME/魔数和文件大小；路径、项目 ID、文件名必须经过校验，不能写出工作目录。
- R6. 浏览器模式没有可用工作目录时，保留远程 URL 预览并给出可理解的降级状态，不伪造相对路径持久化。

## Non-Goals

- 不新增图片供应商或模型协议；复用现有 `generateImage` 和配置。
- 不实现通用云存储上传或公网 URL 代理。
- 不改变角色候选稿的确认/保存语义；图片资产生成是独立的可见副作用。

## Decisions

- D1. 由 Tauri 原生命令负责下载和落盘，API Key 不进入 WebView 下载请求。
- D2. `Character.consistency.referenceImages` 继续作为兼容字段，但桌面端写入项目相对路径；预览层通过受校验的 `read_image_asset` IPC 读取字节并创建 Blob URL，不开放任意目录 asset protocol。
- D3. 助手通过自然语言意图检测触发图片回调，保留原有对话流；不要求模型实现新的函数调用协议。

## Acceptance Criteria

- 在角色页点击生成后，生成完成即能看到缩略图，刷新项目后仍能看到同一张图。
- 桌面端资产文件存在于项目工作目录下的 `assets/images`，项目 JSON 不包含临时供应商 URL。
- 在助手中输入“生成一张牛来参考图”或“把当前参考图改成侧身”后，助手消息区域出现图片且左侧角色参考图数量增加。
- 非图片响应、下载失败、路径越界、超过大小限制均显示错误，且原有已确认角色数据不被覆盖。

## Validation

- Focused automated tests: payload 解析、图片意图检测、相对路径生成、项目保存/加载竞态、Rust 请求与读取校验。
- Build/type checks: `pnpm exec tsc --noEmit`、`pnpm exec eslint src --quiet`、`pnpm build`、`cargo check --workspace`。
- Desktop acceptance: Tauri WebView 已验证角色卡和助手消息显示同一张 1280×720 本地图片；供应商 API 调用由用户侧成功响应和本地落盘结果共同证实，未记录任何凭据。

## Implementation Result

- Grok `grok-imagine-image` 请求使用 `b64_json` 与 `resolution`，响应兼容 JSON、SSE `image_url` 和 Base64 Data URL。
- 桌面端把生成结果保存到 `<workingDir>/<projectId>/assets/images/`，项目和助手会话只持久化相对路径。
- 修复项目保存误生成 UUID、加载器跨项目 fallback，以及异步旧快照覆盖本地角色/图片状态。
- `read_image_asset` 在 Rust 边界校验项目目录、相对路径、大小和 JPEG/PNG/GIF/WebP 魔数，再由前端创建临时 Blob URL。

## Open Questions

- 无。工作目录未配置时按 R6 降级。
