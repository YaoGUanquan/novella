---
type: plan
status: implemented
date: 2026-08-22
title: native-dialogue-transport-and-recovery
origin: docs/ae/prds/native-dialogue-transport-and-recovery-2026-08-22.md
originFingerprint: 2026-08-22-native-dialogue-transport-recovery
depth: deep
format: human-readable-plan
sharded: false
---

# 实施计划：Tauri 原生对话传输与会话恢复

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Units

### U1 - Rust 原生 SSE 命令

- Requirements: R1, R2, AC1, AC2
- Depends on: none
- Files: `src-tauri/Cargo.toml`, `src-tauri/src/commands/dialogue.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`
- Validation: `cargo check --workspace`; unit tests for endpoint and SSE parsing where practical.
- Rollback: remove command registration and reqwest dependency; Web path remains available.

### U2 - Tauri bridge and service selection

- Requirements: R1, R3, AC1, AC2, AC3
- Depends on: U1
- Files: `src/infrastructure/tauri-bridge/commands.ts`, `src/core/services/ai/text/ai-service.ts`
- Validation: TypeScript, focused configured dialogue tests, desktop command compile.
- Rollback: remove native branch and retain Provider/Vite transport.

### U3 - Assistant recovery controls

- Requirements: R4, R5, AC4, AC5
- Depends on: none
- Files: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/features/creative-assistant/creative-assistant-session.ts`, focused feature tests.
- Validation: Jest interaction tests and browser UI smoke.
- Rollback: hide retry/delete controls; persisted project memory remains intact.

### U4 - Durable evidence

- Requirements: R6
- Depends on: U1, U2, U3
- Files: `docs/08-ai-memory/04-known-pitfalls.md`, `docs/08-ai-memory/05-decision-log.md`, process progress note.
- Validation: `git diff --check`, docs review, final gate.

## Cross-cutting risks

- Vendor SSE event schema differs: keep parser protocol-specific and report unverified real service behavior.
- Native command receives key over IPC: no logging or event echo; add review check for secret leakage.
- Tauri build toolchain or crate registry unavailable: mark native compilation unverified rather than claiming root fix.
