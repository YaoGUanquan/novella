# AI 辅助创作与远程视频素材链路进度

## Checkpoint 1: Recovery and scope

- Branch: `develop`
- Worktree: already dirty with prior user/agent changes; preserved.
- Requirements: `docs/ae/prds/ai-assisted-creative-and-video-materials-2026-08-22.md`
- Plan: `docs/ae/plans/ai-assisted-creative-and-video-materials-2026-08-22.md`
- Document review: `docs/ae/reviews/ai-assisted-creative-and-video-materials-2026-08-22.md`, APPROVE.

## Evidence captured

- `generateVideo` currently forwards only `referenceImage`.
- Grok request currently creates `FormData` without `input_reference` files.
- Local project assets do not have a generic public upload adapter.
- Project detail/editor contain placeholder or in-memory script/character/stoyboard flows.

## Git/worktree gate

- No reset, checkout, commit, push, dependency install, or secret output performed.
- Existing modified and untracked files are out of scope unless listed in the implementation plan.

## Next checkpoint

- Completed U1: remote-video request building now validates public media URLs, deduplicates references, maps V3/MiniMax fields, and builds Grok multipart `input_reference` files.
- Completed U2: project detail exposes a content-driven AI script draft and explicit confirmation; project editor replaces fixed example shots with dialog-AI storyboard drafts and character reference-image controls.
- Validation passed:
  - `pnpm test -- --runInBand src/__tests__/services/remote-video-service.test.ts src/__tests__/services/configured-generation-routing.test.ts`
  - `pnpm exec tsc --noEmit`
  - `pnpm exec eslint "src/**/*.{ts,tsx}" --quiet`
  - `pnpm run build`
- Browser evidence: local UI at `http://127.0.0.1:1421` rendered project detail and editor with zero console errors. The isolated browser profile had no AI key, so the configured-model generation path remains unverified; it correctly showed the existing configuration gate.

## Checkpoint 3: SSE 流式创作草稿

- 用户指出此前 U2 仍是一次性 `aiService.generate`，不满足实时对话填充要求；本检查点将脚本、角色和分镜入口统一改为 `aiService.streamGenerate`。
- OpenAI SSE 使用 `choices[].delta.content`；Anthropic 新增原生 `content_block_delta` SSE 解析。`AbortSignal` 以不可枚举 transport metadata 传入 `fetch`，不会进入 JSON 请求正文。
- 项目详情的脚本草稿、编辑页的角色草稿和分镜草稿均按 chunk 更新可见回复；仅在流结束后的结构化草稿确认动作才保存工程。
- 取消时保留已收到的草稿回复；错误与取消不覆盖已确认的脚本、角色或分镜。
- 保存确认路径改为返回成功状态，避免 Tauri 保存失败后仍提示“已写入项目”。

## Validation

- Red: `pnpm test -- --runInBand src/__tests__/services/anthropic-stream.test.ts` initially failed because `anthropicStrategy.stream` did not exist.
- Green: `pnpm test -- --runInBand src/__tests__/services/anthropic-stream.test.ts src/__tests__/services/remote-video-service.test.ts src/__tests__/services/configured-generation-routing.test.ts` passed: 3 suites / 10 tests.
- `pnpm exec tsc --noEmit` passed.
- Scoped ESLint passed for the touched provider, service, page, component, context and test files.
- `pnpm run build` passed; the existing HomePage static/dynamic import warning remains non-blocking.
- Browser: `http://127.0.0.1:1421/project/edit/prj-1787381424095` rendered the role SSE entry and no console errors; project detail rendered the script creative-requirement field. The isolated profile did not contain the user project body or saved key, so no authenticated streaming request was sent.

## Checkpoint 4: AI 创作助手侧栏回填

- 三个创作入口改为上下文专属的悬浮图标与右侧 Sheet：脚本、角色设定、分镜草稿。
- Sheet 维护多轮 SSE 对话、停止、候选稿原文、复制和确认回填；只有确认弹窗的“确认填充”才调用目标表单的 apply 回调。
- 脚本回填为可编辑的 `scriptDraft`，角色和分镜回填为各自可编辑的本地草稿；既有确认保存动作继续负责持久化工程。
- 格式无法解析的候选稿仍保留原文供复制或继续对话，不会显示“填充表单”或修改表单数据。

## Checkpoint 4 Validation

- Focused tests: `pnpm test -- --runInBand src/__tests__/features/creative-assistant/AICreativeAssistantSheet.test.tsx src/__tests__/services/anthropic-stream.test.ts` passed: 2 suites / 5 tests.
- TypeScript: `pnpm exec tsc --noEmit` passed.
- Scoped ESLint passed for the shared component, three target pages and focused test.
- Build: `pnpm run build` passed; the existing HomePage static/dynamic import warning remains non-blocking.
- Browser: the角色入口 opened the Sheet at `http://127.0.0.1:1421/project/edit/prj-1787381424095`, desktop console errors were empty; at 390px the Sheet was 390px wide and `scrollWidth === clientWidth === 390`.
- Unverified: no authenticated provider request was sent; the test project did not complete its existing step transition to the分镜编辑器, so the分镜入口 is covered by TypeScript/build and component integration rather than a separate live browser interaction.
