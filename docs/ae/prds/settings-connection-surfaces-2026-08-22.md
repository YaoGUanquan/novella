---
type: prd
status: implemented
date: 2026-08-22
topic: settings-connection-surfaces
format: human-readable-requirements
sharded: false
---

# PRD: Three Service Connection Surfaces

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem

The settings page exposes internal provider protocol details instead of the three user-facing capabilities the product actually needs. It also exposes configuration that is not consumed by the image/video generation entry points.

## Goals

- Present exactly three connection surfaces: dialogue, image generation, and video generation.
- Keep each surface to the fields a user needs: endpoint URL, API key, and model ID. Dialogue strategy selection stays internal: Claude/Anthropic model or endpoint names use Anthropic, other models use OpenAI-compatible routing.
- Make image and video settings participate in the existing `generateImage` and `generateVideo` facades.
- Keep video transport extensible by model capability and endpoint family, preserving the documented `/v1/video/generations` and `/v1/videos` contracts.
- Preserve legacy provider keys and existing public service signatures.

## Requirements

### R1 - Three compact settings surfaces

The settings page shows one dialogue card, one image card, and one video card. Secret fields, timeout fields, JSON model maps, and per-provider cards are not shown.

Acceptance: the page contains only the three service forms and the existing working-directory form; no `Secret`, timeout, or JSON mapping input is rendered.

### R2 - Dialogue connection

Dialogue configuration stores endpoint URL, API key, and model ID. Existing model/provider calls infer the internal OpenAI-compatible or Anthropic strategy before dispatch.

Acceptance: mocked normal and streaming calls use the saved URL, key, and model; endpoint metadata is absent from the upstream JSON body.

### R3 - Image connection

Image configuration stores endpoint URL, API key, and model ID. When configured, `generateImage` uses this connection through a normalized images-generation request; otherwise existing provider adapters remain the fallback.

Acceptance: a mocked `generateImage` call reaches the saved endpoint with the saved model and bearer key.

### R4 - Video connection and extensibility

Video configuration stores endpoint URL, API key, and selected model. The video facade uses the configured remote transport when enabled. Model capability registration determines endpoint family and request serialization; adding a model does not require changing the settings page.

Acceptance: a mocked `generateVideo` call submits to the configured gateway, supports the documented endpoint families, and returns the remote task/result state through the existing `VideoGenerationResult` shape.

### R5 - Persistence and compatibility

New values use secure storage. Existing provider-specific key/settings records remain readable as fallback and are not deleted.

Acceptance: a refresh/reload restores each service form, and an old `api_*_key` record still authenticates a request when no new service record exists.

### R6 - Directory behavior

The existing directory chooser remains a Tauri-only absolute-path capability; browser mode permits manual editing and explains the limitation.

Acceptance: no browser flow claims to discover an absolute path; Tauri selection writes and reloads the chosen path.

## Non-goals

- No new third-party provider account management.
- No browser-side upload of private media to an upstream provider.
- No change to local FFmpeg, TTS, subtitle, or composition stages.
- No claim of authenticated external smoke without user credentials.

## Decisions

- D1: service-level settings are the primary UI model; provider-specific records remain compatibility inputs.
- D2: protocol-specific details stay in strategies and transport adapters, not in the settings form.
- D3: remote video model capability metadata is code-owned and extensible; the UI stores only the selected model ID.

## Validation

- Focused tests for service persistence and legacy fallback.
- Mocked text normal/streaming, image, and video requests.
- TypeScript, ESLint, Vite build, and `git diff --check`.
- Browser settings render and web directory fallback; Tauri dialog remains unverified without desktop runtime.

## Assumptions and Open Questions

- Assumption: the configured image endpoint accepts an OpenAI-compatible `/images/generations` JSON shape.
- Assumption: remote video result URLs are accessible to the current client or are resolved by a later download boundary.
- Open question: whether the project will later add a server-side proxy to keep provider keys out of browser network requests.

## Consistency Check

- requirementsCount: 6
- nonFunctionalRequirementsCount: 0
- decisionsCount: 3
- openQuestionsCount: 1
