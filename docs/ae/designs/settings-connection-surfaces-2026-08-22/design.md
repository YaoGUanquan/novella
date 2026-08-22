---
type: design
status: drafted
date: 2026-08-22
topic: settings-connection-surfaces
origin: docs/ae/prds/settings-connection-surfaces-2026-08-22.md
originFingerprint: settings-connection-surfaces-2026-08-22
---

# Design: Three Service Connection Surfaces

## Overview

The UI owns three service records: `dialogue`, `image`, and `video`. A shared secure-storage resolver reads these records first, then legacy provider records. Existing facades remain public and choose the configured adapter at runtime. Dialogue strategy selection is inferred from model/address naming; it is not a UI field.

## Stable Contracts

### ADR-001 - Service-level primary configuration

The settings page does not expose per-provider protocol internals. Strategy and transport modules translate service records into provider-specific wire requests.

### ADR-002 - Capability-driven remote video

Remote video models register a model name, endpoint family, and serializer. The video facade calls the registry; adding a model is isolated to the registry/serializer module.

### T-001 - Service connection record

`{ kind: 'dialogue' | 'image' | 'video', baseUrl: string, apiKey: string, model: string, protocol?: 'openai' | 'anthropic', enabled: boolean }`.

### EP-001 - Dialogue dispatch

Existing `aiService` and dispatcher signatures remain unchanged. The resolver supplies `apiKey`, `baseURL`, and `model` before strategy dispatch.

### EP-002 - Image generation

Existing `generateImage(prompt, options)` remains unchanged. A configured image record uses `POST {baseUrl}/images/generations` with `model`, `prompt`, `size`, `n`, and optional quality fields.

### EP-003 - Video generation

Existing `generateVideo(prompt, options)` remains unchanged. A configured video record submits to `/v1/video/generations` or `/v1/videos` based on model capability and polls status using URL-encoded task IDs.

### ST-001 - Empty service record

The form renders empty key and model fields and does not activate a service route.

### ST-002 - Configured service

The form shows configured status without revealing the key, and the corresponding facade uses the record.

### ST-003 - Invalid endpoint

Save is rejected with a field-level message; no request is sent.

### TC-001 - Persistence precedence

New service record wins over legacy provider key; malformed new JSON falls back safely.

### TC-002 - Wire contract redaction

Text request body excludes endpoint metadata; auth headers contain the key without logging it.

### TC-003 - Image facade routing

Configured image endpoint receives the configured model and prompt; absent configuration falls back to existing adapter.

### TC-004 - Video capability routing

v1 and v2/v3 endpoint families serialize their distinct fields and poll encoded task IDs.

## Security and Boundaries

- Keys are stored through `secureStorage`; UI status never prints their values.
- Browser execution still sends keys to the configured endpoint because this is a desktop-oriented client; a server proxy remains an explicit future decision.
- Private local file paths are not accepted as remote media URLs.

## Mapping

| Requirement | Design                | Tests               |
| ----------- | --------------------- | ------------------- |
| R1          | T-001, ST-001         | TC-001              |
| R2          | EP-001, ADR-001       | TC-002              |
| R3          | EP-002                | TC-003              |
| R4          | ADR-002, EP-003       | TC-004              |
| R5          | T-001                 | TC-001              |
| R6          | Existing Tauri bridge | Browser/Tauri smoke |

## Explicit Omissions

- Database: explicitly omitted; settings use existing secure storage.
- Observability: explicitly omitted; no new production worker is added in this slice.
- Deployment: explicitly omitted; this is a client and transport refactor.
