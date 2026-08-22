---
type: plan
status: superseded
date: 2026-08-22
title: settings-provider-routing
origin: docs/ae/prds/settings-provider-routing-2026-08-22.md
originFingerprint: settings-provider-routing-2026-08-22
depth: deep
format: human-readable-plan
sharded: false
---

# Plan: Configurable Provider Routing And Working Directory

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Readiness And Decision

- Requirements: `docs/ae/prds/settings-provider-routing-2026-08-22.md` drafted and internally reviewable.
- Git/worktree: existing documentation changes and `pnpm-workspace.yaml` change are preserved; implementation must not reset them.
- Chosen approach: dynamic settings model + secure resolver + provider endpoint override + separate remote video config + Tauri directory UX.

## Approach Comparison

| Approach                                                           | Fit                                                                                       | Trade-off                                                          | Decision |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| Add more fields to the current fixed provider cards                | Small initial diff, but keeps hard-coded provider list and duplicates configuration logic | Does not solve custom model/gateway growth                         | Rejected |
| Replace cards with dynamic connection settings and shared resolver | Reuses model catalog, supports custom URL/model/key, preserves legacy storage             | Touches settings, config, provider strategies, and tests           | Chosen   |
| Browser-direct remote provider calls                               | Simple UI wiring                                                                          | Exposes bearer keys, conflicts with MPT server-side security model | Rejected |

## Decision Drivers

1. User-owned endpoint and credential must be the source for new requests.
2. Existing public service calls and legacy settings must remain compatible.
3. Remote video protocol differences must not be flattened into chat completion assumptions.

## Pre-Mortem

- PF1: custom URL is saved but strategies still call hard-coded endpoints. Signal: mocked fetch URL remains unchanged. Recovery: route every strategy through a shared endpoint helper and add request assertions.
- PF2: secure storage and legacy localStorage disagree after migration. Signal: settings UI shows configured but service rejects missing key. Recovery: define precedence and test round-trip/fallback explicitly.
- PF3: remote gateway settings imply working video generation without task polling. Signal: UI reports success before an upstream task reaches terminal status. Recovery: keep remote generation disabled until transport/task lifecycle is separately implemented and mark it in UI/docs.

## Implementation Units

### U1 - Configuration contracts and persistence resolver

- Covers: R2, R3, R5, NFR1-NFR2.
- Depends on: none.
- Files: `src/core/ai/types/ai-core.ts`, `src/core/config/model-providers.ts`, new `src/core/config/ai-connection-settings.ts`, `src/core/services/project/secure-storage-service.ts` only if helper exposure is required.
- Forbidden files: local video pipeline services.
- Work: define persisted provider connection shape, defaults, safe URL normalization, secure read/write helpers, legacy key/settings fallback, and remote gateway config shape.
- Validation: focused unit tests for precedence, malformed JSON, empty values, and URL normalization.
- Rollback signal: old `api_*_key` and `ai_model_settings_*` values still satisfy configuration gates.

### U2 - Provider routing compatibility

- Covers: R3, NFR2.
- Depends on: U1.
- Files: `src/core/services/ai/text/ai-service.ts`, `src/core/services/ai/text/ai-call-dispatcher.ts`, `src/core/ai/providers/base.ts`, `src/core/ai/providers/openai-compatible-strategy.ts`, `src/core/ai/providers/openai-strategy.ts`, `src/core/ai/providers/anthropic-strategy.ts`, `src/core/ai/providers/google-strategy.ts`, `src/core/ai/providers/baidu-strategy.ts`.
- Forbidden files: provider API keys and environment secrets.
- Work: load connection settings for generic `generate` defaults, pass non-wire endpoint metadata to strategies, normalize OpenAI-compatible URLs, and prevent metadata from entering request bodies.
- Validation: mocked fetch tests for custom/default endpoint, model, auth header, and body redaction.
- Rollback signal: default URL behavior and existing high-level AI method tests remain unchanged.

### U3 - Settings page redesign

- Covers: R1, R2, R4, R5, R8.
- Depends on: U1.
- Files: `src/pages/settings/SettingsPage.tsx`, optionally `src/core/config/model-providers.ts` for display metadata, focused settings component tests.
- Forbidden files: unrelated editor pages.
- Work: replace fixed top-two cards with dynamic connection cards; add base URL/model/secret fields and save/test states; add dedicated remote video gateway section with default `https://api.kkone.vip` as editable example, never as a required credential.
- Validation: render test, persistence reload test, and browser acceptance for editing/saving fields without exposing secrets.
- Rollback signal: legacy setting keys remain readable and the page can be reverted without changing provider strategy contracts.

### U4 - Working directory selection UX

- Covers: R7-R8.
- Depends on: none.
- Files: `src/pages/settings/SettingsPage.tsx`, `src/infrastructure/tauri-bridge/commands.ts`, `src/infrastructure/tauri-bridge/commands-types.ts` only if a dedicated directory method improves typing.
- Work: use a named directory-selection method, persist selected absolute path, handle array/null result, and show explicit web-mode fallback.
- Validation: mocked Tauri dialog test and browser observation in web mode; desktop smoke remains unverified without Tauri runtime.
- Rollback signal: manual path edit continues to work.

### U5 - Remote video transport contract (bounded)

- Covers: R5-R6, NFR3.
- Depends on: U1.
- Files: new `src/core/services/ai/video/remote-video-service.ts`, new `src/core/services/ai/video/remote-video-types.ts`, focused transport tests, optional export from `src/core/services/index.ts`.
- Work: define model capability/endpoint mapping and request serialization for configured gateway; support create/status URL construction and sanitized errors. Do not claim full queue/download orchestration unless an existing Novella task boundary is available.
- Validation: mocked axios/fetch tests for `/v1/video/generations`, `/v1/videos`, URL-encoded task IDs, and no key in error payloads.
- Rollback signal: remote video feature remains disabled when gateway config is absent; local generation functions are untouched.

### U6 - Review, browser verification, and evidence

- Covers: all requirements.
- Depends on: U1-U5.
- Files: `docs/ae/reviews/`, `docs/ae/gates/`, `docs/00-process/active/settings-provider-routing-2026-08-22/progress.md`.
- Work: run focused tests, typecheck, lint where practical, browser settings flow, and AE code review; record real-service smoke as unverified unless user supplies credentials.
- Validation: `pnpm exec jest ...`, `pnpm exec tsc --noEmit`, `pnpm exec eslint ...`, `git diff --check`, browser URL checks.
- Rollback signal: any regression in existing AI or local video tests stops delivery and preserves the previous configuration read path.

## Validation Evidence Matrix

| Acceptance | Tier                   | Expected signal                                             | Preconditions                | Status     | Recovery                                   |
| ---------- | ---------------------- | ----------------------------------------------------------- | ---------------------------- | ---------- | ------------------------------------------ |
| R2/R3      | Focused automated test | secure/legacy round-trip and provider request contract pass | installed deps               | unverified | preserve fallback and disable custom route |
| R5/R6      | Static + focused test  | remote model endpoint mapping serializes expected fields    | external contract fixtures   | unverified | keep remote gateway disabled               |
| R7/R8      | Browser acceptance     | save path and web fallback visible                          | running Vite; Tauri optional | unverified | manual path input                          |
| NFR2       | Integration/build      | existing public service tests and TypeScript compile pass   | package deps                 | unverified | revert only routing unit                   |

## Plan Self-Review

- Every R/NFR maps to a unit or validation row.
- No unit changes local video pipeline behavior.
- Custom URLs and keys have explicit persisted source precedence.
- Remote video is bounded to configuration and transport contract; full async task orchestration is not silently claimed.
- Browser and real authenticated service evidence remain distinct and initially unverified.
