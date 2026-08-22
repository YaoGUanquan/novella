---
type: review
status: completed
date: 2026-08-22
scope: settings-provider-routing
---

# Review: Configurable Provider Routing

## Verdict

- specVerdict: APPROVE
- qualityVerdict: APPROVE
- blockingFindings: none

## Findings

No blocking findings remain in the changed paths after the final routing pass.

## Verified

- The settings page exposes only dialogue, image, and video service connections; no Secret, timeout, or JSON mapping fields are rendered.
- Service records persist through secure storage with legacy provider fallback; dialogue supports OpenAI-compatible and Anthropic strategies.
- Configured image and video connections are consumed by `generateImage` and `generateVideo`, while existing provider adapters remain fallback paths.
- Remote video transport keeps `/v1/video/generations` and `/v1/videos` contracts separate, supports model capability routing, uses multipart for Grok, and URL-encodes task IDs.
- Tauri directory selection is explicit; web mode explains that an absolute local path cannot be discovered by a browser.

## Evidence

- `pnpm exec tsc --noEmit` passed.
- Focused Jest suites passed: 25 tests across AI service, model gate, connection settings, configured image/video facade routing, and remote video transport.
- Focused ESLint passed for all touched source and test files.
- `pnpm exec vite build` passed.
- `Invoke-WebRequest http://127.0.0.1:1420/settings` returned HTTP 200.
- Playwright screenshot of `/settings` confirmed three compact service cards and no Secret/timeout/model-map controls.

## Residual Risk

- No authenticated external provider request was performed because no user credentials were supplied.
- Tauri's native directory dialog was not exercised in the browser-only runtime.
- Remote video result downloading remains a caller responsibility; the client facade now submits and polls to a terminal/result URL state, but authenticated external smoke is still unverified.
