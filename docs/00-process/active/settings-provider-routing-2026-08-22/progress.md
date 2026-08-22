---
type: process
status: completed
date: 2026-08-22
task: settings-provider-routing
---

# 可配置 AI 连接与本地工作目录执行记录

## Scope

- 动态 Provider 连接配置：base URL、API Key、模型 ID、可选 Secret。
- 文本 Provider 请求路由使用已保存连接配置。
- 独立远程视频网关配置与基础 endpoint/model contract。
- Tauri 目录选择与 web fallback。

## Evidence

- Requirements: `docs/ae/prds/settings-provider-routing-2026-08-22.md`
- Plan: `docs/ae/plans/settings-provider-routing-2026-08-22.md`
- External reference: `https://image.kkone.vip/1/docs.html`
- Local reference: `D:/codes/ph-MoneyPrinterTurbo/app/services/remote_video.py`
- Recovery artifact: `docs/00-process/active/initial-codebase-scan-2026-08-22/progress.md`

## Checkpoints

- [x] Repository and existing AE memory recovered.
- [x] Settings, storage, provider, Tauri and external reference paths inspected.
- [x] Requirements and implementation plan drafted.
- [x] Document review contract generated: `docs/ae/evidence/artifacts/review-contract/20260822T052943613Z-0a691e03d927.json`.
- [x] Configuration resolver implemented and tested.
- [x] Provider routing implemented and tested, including OpenAI streaming and OpenAI/Anthropic protocol selection.
- [x] Settings UI reduced to dialogue/image/video service cards and served successfully at `/settings`; browser-mode directory fallback verified by runtime contract (desktop dialog remains unverified).
- [x] Image and video facades route through configured service connections; remote transport covers `/v1/video/generations`, `/v1/videos`, multipart Grok submission, model selection, and encoded task IDs.
- [x] Facade routing tests cover configured image and video generation calls.
- [x] Code review and final gate recorded.

## Known Constraints

- No real API key is available; authenticated external smoke remains `unverified`.
- Web browsers cannot reveal a user’s absolute local directory path; absolute path selection is Tauri-only.
- `pnpm-workspace.yaml` now explicitly allows `esbuild` and `unrs-resolver` builds because pnpm 11 blocked them during local setup.
