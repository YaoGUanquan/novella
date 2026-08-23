---
type: design
status: implemented
date: 2026-08-23
title: creative-assistant-agent-unification
origin: docs/ae/prds/2026-08-23-creative-assistant-agent-unification.md
format: human-readable-design
sharded: false
---

# Design: Creative Assistant Agent Unification

## Source

- `docs/ae/prds/2026-08-23-creative-assistant-agent-unification.md`

## AI Parse Contract

- canonicalKind: design
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Split Manifest

- mode: unified
- root: docs/ae/designs/creative-assistant-agent-unification-2026-08-23
- files:
  - design.md

## Overview

- Goal: move assistant orchestration behind one UI-free domain module.
- Source requirements: R1-R10, NFR1-NFR4, D1-D4.
- Required dimensions: overview, architecture, api, ui-ux, test-cases, security, non-functional.
- Explicit omitted dimensions: database: explicitly-omitted; no new durable schema or migration. observability: explicitly-omitted; reuse existing logger/event surfaces in the first slice.
- Cross-dimension dependencies: Agent API events drive UI states; adapters own provider, storage, and form boundaries; confirmation events gate durable writes.

## Existing Project Evidence

- mode: inspected

| Evidence category         | Repository-relative inputs                                                                                                                                                                | Sanitized conclusion                                                      | Confidence |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| stack and commands        | `package.json`, `jest.config.cjs`, `tsconfig.json`                                                                                                                                        | React/TypeScript/Vite with Jest and Testing Library                       | verified   |
| structure and conventions | `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`, `src/core/services/ai/text/ai-service.ts`                                                                      | UI currently owns orchestration; configured dialogue exposes async events | verified   |
| reusable assets           | `src/core/services/ai/image/image-generation-service.ts`, `src/features/creative-assistant/creative-assistant-memory.ts`, `src/features/creative-assistant/creative-assistant-session.ts` | Reuse existing provider and persistence contracts through adapters        | verified   |

## Implementation Constraints

- Repository paths: `src/core/services/ai/assistant-agent/`, `src/features/creative-assistant/`, `src/__tests__/features/creative-assistant/`.
- Runtime/build commands: `pnpm test -- --runInBand <focused tests>`, `pnpm exec tsc --noEmit`, `pnpm exec eslint 'src/**/*.{ts,tsx}' --quiet`.
- Environment variables: none added.
- Dependency boundaries: core agent imports AI contracts and shared types only; feature adapters may import the agent and page services; the agent must not import React, pages, or browser storage.
- Feature flags/configuration: none; migration preserves the existing assistant entry points.
- Rollback constraints: keep the existing sheet props and adapters so the orchestration call can be reverted without changing project data format.

## Decisions

### ADR-001 - Stateful UI-free agent

- Decision: expose a `CreativeAssistantAgent` that owns turn lifecycle and domain state while receiving all side effects through injected adapters.
- Drivers: one call seam, testability, and preservation of layer direction.
- Alternatives: pure functions (more state in UI), global singleton (cross-project leakage), dynamic skill runtime (unsafe and out of scope).
- Consequences: feature code must translate project/form data into agent context and render agent events.
- Supersedes: none.

### ADR-002 - Event-based turn contract

- Decision: `sendTurn` and `retryTurn` return an async event stream; cancellation uses an injected or supplied `AbortSignal`.
- Drivers: existing SSE transport and visible timeline/chunk updates.
- Alternatives: promise-only response (loses incremental UI), callback-only transport (harder to compose in tests).
- Consequences: UI needs one event reducer; errors and cancellation are first-class events.
- Supersedes: none.

### ADR-003 - Explicit confirmation gate

- Decision: candidate application, memory save, and project persistence are separate commands that require explicit caller action.
- Drivers: user edits and existing project safety rules.
- Alternatives: automatic writes or per-skill auto-write policy.
- Consequences: Agent state includes pending proposal and confirmation status; adapters report false/failed writes distinctly.
- Supersedes: none.

### ADR-004 - Feature-owned pure UI reducer

- Decision: move message, stream, error, candidate, memory, and conversation-reset transitions into a pure reducer under `src/features/creative-assistant/`; keep input controls, menus, dialogs, DOM refs, persistence effects, and transport cancellation in the React integration layer.
- Drivers: deterministic state transitions, fewer interdependent setters, and no React dependency in the core Agent.
- Alternatives: put display state in the core Agent (couples domain and presentation), or retain independent component setters (continues split-brain transitions).
- Consequences: Agent events and explicit UI actions map to one reducer action vocabulary; effects persist reducer snapshots after transitions.
- Supersedes: none.

## API

### EP-001 - Agent construction contract

- Input: `CreativeAssistantAgentDependencies` containing dialogue transport, image generator, session store, clock/id functions, and target adapter.
- Output: an agent instance scoped to one `projectId` and `target`.
- Invariant: no dependency may expose secrets to events or persistence.

### EP-002 - Turn event stream

- Input: `AssistantTurnRequest` with user text, attachments, selected catalog skill IDs, project context, and current target label.
- Output: `AsyncGenerator<AssistantAgentEvent>` containing `started`, `text`, `state`, `image`, `completed`, `cancelled`, or `failed` events.
- Invariant: an explicit image action is required before the image adapter is called.

### EP-003 - Confirmation commands

- Input: proposal/message IDs and explicit command payloads.
- Output: typed `AgentActionResult` with `applied`, `saved`, or `rejected` status.
- Invariant: no command reports success when its adapter returns false or throws.

### EP-004 - UI reducer contract

- Input: `AssistantUIAction<T>` actions for project hydration, message append/patch/remove, turn lifecycle, candidate proposal, memory update, image event, and conversation reset.
- Output: immutable `AssistantUIState<T>`.
- Invariant: reducer actions are synchronous and side-effect free; stale turn actions cannot clear a newer active turn.

## Architecture

`AICreativeAssistantSheet -> CreativeAssistantAgent -> adapters`

- `CreativeAssistantAgent` (core): prompt assembly, skill gating, turn lifecycle, event normalization, candidate/state proposal tracking, image-intent gating, retry/cancel coordination.
- `ConfiguredDialogueAdapter` (feature/infrastructure adapter): wraps `aiService.streamConfiguredDialogueEvents`.
- `ImageGenerationAdapter`: wraps `imageGenerationService.generateImage` and project asset persistence.
- `SessionStoreAdapter`: wraps existing project-scoped session and memory persistence.
- `TargetAdapter<T>`: parses candidate, updates pending form preview, applies confirmed candidate, and persists project data.
- `AICreativeAssistantSheet` (UI): dispatches commands, reduces events, renders messages/timeline/cards, and opens confirmation dialogs.
- `creative-assistant-ui-reducer` (feature): owns deterministic presentation state transitions and stale-turn protection; it imports no React runtime.

The agent does not import `AICreativeAssistantSheet`, `localStorage`, `window`, or page contexts. The feature adapter owns conversion between `ProjectData`/form types and generic agent context.

## UI/UX

### ST-001 - Streaming turn

- Agent emits `started` then zero or more `text`/`state` events and ends with `completed`.
- UI shows the existing running timeline and incremental assistant response.

### ST-002 - Pending candidate

- Candidate parse success creates a pending proposal and no durable write.
- UI exposes preview and an explicit apply/save action.

### ST-003 - Confirmed write

- Apply and memory-save commands show success only after adapter confirmation.
- UI keeps confirmed data separate from pending proposal.

### ST-004 - Failed or cancelled turn

- UI shows a recoverable error/cancel state, retains received text, and keeps confirmed project data unchanged.

### ST-005 - Hydrated or reset conversation

- Project hydration atomically replaces messages, memory, pending candidate, errors, and active turn state.
- New/clear conversation atomically clears transcript-local state without deleting confirmed project memory.

## Security

- Provider keys stay in existing transport/configuration adapters.
- Agent events and persisted messages contain only sanitized text, IDs, state, and asset metadata.
- Attachments are bounded by existing size/count/type checks before entering the adapter.
- No external skill file is fetched, executed, or copied into runtime prompts.

## Non-Functional

- Agent interface remains small enough for feature adapters to implement without React knowledge.
- Event ordering is deterministic for a single turn: `started` precedes output and exactly one terminal event follows.
- Project scope is explicit on every session-store call.

## Test Cases

### TC-001 - Streams a normal turn

- Priority: P0
- Preconditions: fake dialogue adapter emits two text chunks and a state payload.
- Steps: call `sendTurn` with a non-image request.
- Expected result: events contain `started`, both text chunks, parsed state, and `completed`; image adapter is not called.
- Covered IDs: R1, R2, R4, EP-002, ST-001.

### TC-002 - Gates selected skills

- Priority: P1
- Preconditions: one selected catalog skill and one unselected skill.
- Steps: send a turn.
- Expected result: only the selected instruction is present in the dialogue request.
- Covered IDs: R3, EP-002.

### TC-003 - Separates candidate apply from save

- Priority: P0
- Preconditions: target adapter returns a parsed candidate and save result.
- Steps: create proposal, inspect state, apply candidate, then persist.
- Expected result: proposal does not call the adapter; apply calls form update once; save success mirrors the adapter result.
- Covered IDs: R5, EP-003, ST-002, ST-003.

### TC-004 - Saves memory independently

- Priority: P0
- Preconditions: a parsed assistant state and session store spy.
- Steps: save memory.
- Expected result: memory store is called and target form adapter is never called.
- Covered IDs: R6, EP-003, ST-003.

### TC-005 - Gates explicit image actions

- Priority: P0
- Preconditions: image adapter spy and one descriptive question plus one explicit generate request.
- Steps: send both turns.
- Expected result: descriptive question makes zero image calls; explicit request makes one call and emits an image event with asset metadata.
- Covered IDs: R7, EP-002, ST-001.

### TC-006 - Handles cancellation/failure without confirmed mutation

- Priority: P0
- Preconditions: dialogue adapter rejects or observes an aborted signal.
- Steps: cancel/fail a turn after it starts.
- Expected result: exactly one terminal cancelled/failed event is emitted and confirmed form/memory state is unchanged.
- Covered IDs: R8, EP-002, ST-004.

### TC-007 - Isolates projects

- Priority: P1
- Preconditions: session store contains two project IDs.
- Steps: construct agents for each project and load sessions.
- Expected result: each agent reads and writes only its own project key.
- Covered IDs: R9, NFR3, EP-001.

### TC-008 - Reduces streaming lifecycle atomically

- Priority: P0
- Preconditions: empty UI state and two distinct turn IDs.
- Steps: dispatch start/text/complete for the first turn, then start the second and dispatch a stale completion for the first.
- Expected result: message content and terminal status are deterministic, and the stale completion does not clear the second active turn.
- Covered IDs: ADR-004, EP-004, ST-001, ST-004.

### TC-009 - Hydrates and resets without deleting memory

- Priority: P1
- Preconditions: hydrated messages and confirmed project memory.
- Steps: dispatch conversation reset.
- Expected result: messages, candidate, error, and active turn are cleared while memory is preserved.
- Covered IDs: ADR-004, EP-004, ST-005.

### TC-010 - Commits terminal failure and deduplicates external images

- Priority: P1
- Preconditions: one active turn and an external-image event containing duplicate asset IDs.
- Steps: fail the active turn with content/error, then dispatch duplicate image assets.
- Expected result: failure content/error/generating state commit atomically and each asset ID appears at most once.
- Covered IDs: ADR-004, EP-004, ST-004.

## Mapping Tables

### api-error-to-ui-state-mapping

| EP ID  | Error/status                 | ST ID  | UI state  | User-visible behavior                       |
| ------ | ---------------------------- | ------ | --------- | ------------------------------------------- |
| EP-002 | aborted                      | ST-004 | cancelled | retain received text and show retry         |
| EP-002 | transport/provider error     | ST-004 | failed    | show sanitized error and retry              |
| EP-003 | adapter returns false/throws | ST-003 | rejected  | do not show success; keep proposal editable |

### test-case-to-contract-coverage

| TC ID  | Scenario               | Covered IDs                  | Verification signal                               |
| ------ | ---------------------- | ---------------------------- | ------------------------------------------------- |
| TC-001 | normal streaming       | R1,R2,R4,EP-002,ST-001       | ordered event list                                |
| TC-002 | skill gating           | R3,EP-002                    | captured request content                          |
| TC-003 | candidate confirmation | R5,EP-003,ST-002,ST-003      | adapter call counts/results                       |
| TC-004 | memory save            | R6,EP-003,ST-003             | session-store calls                               |
| TC-005 | image intent           | R7,EP-002,ST-001             | image adapter call and event                      |
| TC-006 | cancellation/failure   | R8,EP-002,ST-004             | terminal event and unchanged state                |
| TC-007 | project isolation      | R9,NFR3,EP-001               | distinct store keys                               |
| TC-008 | reducer lifecycle      | ADR-004,EP-004,ST-001,ST-004 | deterministic state and stale-turn protection     |
| TC-009 | hydrate/reset          | ADR-004,EP-004,ST-005        | transcript cleared, memory retained               |
| TC-010 | failure/image dedup    | ADR-004,EP-004,ST-004        | terminal state is atomic and image IDs are unique |

### Test Coverage Matrix

| TC ID  | Scenario                         | Design method                     | Covered IDs                  | Automatable verification signal                             |
| ------ | -------------------------------- | --------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| TC-001 | normal streaming                 | state-transition                  | EP-002,ST-001                | event order and payload                                     |
| TC-002 | skill gating                     | decision-table                    | R3,EP-002                    | request contains allowlisted instruction only               |
| TC-003 | candidate confirmation           | state-transition                  | R5,EP-003,ST-002,ST-003      | adapter call counts                                         |
| TC-004 | memory save                      | decision-table                    | R6,EP-003                    | form adapter call count is zero                             |
| TC-005 | image intent                     | equivalence-class                 | R7,EP-002                    | explicit vs descriptive input calls                         |
| TC-006 | cancellation/failure             | error-guessing                    | R8,ST-004                    | terminal event and unchanged confirmed state                |
| TC-007 | project isolation                | equivalence-class                 | R9,EP-001                    | project-specific store keys                                 |
| TC-008 | reducer lifecycle                | state-transition                  | ADR-004,EP-004,ST-001,ST-004 | active turn remains the newer ID                            |
| TC-009 | hydrate/reset                    | state-transition                  | ADR-004,EP-004,ST-005        | memory identity/value is preserved                          |
| TC-010 | terminal failure and image dedup | state-transition + boundary-value | ADR-004,EP-004,ST-004        | failure state is atomic; duplicate batch yields one message |

### ui-component-to-api-endpoint-mapping

| Component/route            | ST ID                | EP ID         | Data dependency                             |
| -------------------------- | -------------------- | ------------- | ------------------------------------------- |
| `AICreativeAssistantSheet` | ST-001               | EP-001,EP-002 | agent event stream and message state        |
| `AICreativeAssistantSheet` | ST-002,ST-003        | EP-003        | pending candidate/memory and adapter result |
| `AICreativeAssistantSheet` | ST-004               | EP-002,EP-003 | sanitized error and retry state             |
| `AICreativeAssistantSheet` | ST-001,ST-004,ST-005 | EP-004        | reducer state and actions                   |

## Consistency Check

- requiredDimensionsCovered: overview, architecture, api, ui-ux, test-cases, security, non-functional
- omittedDimensionsJustified: database explicitly omitted; observability explicitly omitted
- stableIdsUnique: yes
- mappingTablesComplete: yes
- sourceScopePreserved: yes
- reviewStatus: implemented and approved; final gate `docs/ae/gates/20260823T084619Z-lfg-final.json`

## Implementation Evidence

- Reducer: `src/features/creative-assistant/creative-assistant-ui-reducer.ts`.
- React integration: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`.
- Tests: `src/__tests__/features/creative-assistant/creative-assistant-ui-reducer.test.ts` and the complete creative-assistant suite.
- Verified: TypeScript, scoped ESLint, 11 suites / 72 tests, production build, browser assistant failure-state smoke, and `git diff --check`.
- Unverified: authenticated Provider behavior and direct inspection of the separately launched Tauri desktop window.
