---
type: plan
status: completed
date: 2026-08-23
title: creative-assistant-ui-reducer
origin: docs/ae/prds/2026-08-23-creative-assistant-agent-unification.md
originFingerprint: 2026-08-23-creative-assistant-agent-unification
depth: standard
format: human-readable-plan
sharded: false
---

# Plan: Creative Assistant UI Reducer

## Source

- Requirements: `docs/ae/prds/2026-08-23-creative-assistant-agent-unification.md`
- Design: `docs/ae/designs/creative-assistant-agent-unification-2026-08-23/design.md`, especially ADR-004 and EP-004.

## AI Parse Contract

- canonicalKind: plan
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Scope

Move deterministic assistant presentation state transitions from `AICreativeAssistantSheet` into one feature-owned pure reducer while preserving all visible behavior, Agent/provider boundaries, persistence formats, and explicit confirmation rules.

## Readiness

- Goal: one reducer owns messages, active turn, errors, pending candidate, project memory, and conversation reset/hydration transitions.
- Acceptance criteria: reducer is pure and React-independent; stale turn completion cannot clear a newer turn; project reset is atomic; existing creative-assistant tests remain green.
- Non-goals: moving input/menu/dialog/DOM state, changing visuals, moving network cancellation into reducer, changing storage formats, or adding a global store.
- Affected areas: creative-assistant feature state and tests; no backend or provider contract changes.
- Validation surface: reducer Jest tests, existing assistant component tests, TypeScript, ESLint, production build, browser smoke.
- Open questions: none; the prior Agent architecture and explicit confirmation policy remain authoritative.

## Validation Evidence

| Acceptance criterion                  | Applicable tier        | Expected signal and bounded claim                                                 | Preconditions / owner                          | Status           | Recovery or rollback signal                                                                             |
| ------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Pure deterministic reducer            | Focused automated test | reducer transition tests pass                                                     | local Jest / Codex                             | verified         | five reducer tests pass, including stale and atomic failure cases                                       |
| Existing assistant behavior preserved | Integration or build   | creative-assistant suite, type check, lint, and build pass                        | installed workspace dependencies / Codex       | verified         | 11 suites / 72 tests plus type, lint, and build pass                                                    |
| User-visible flow preserved           | Browser acceptance     | assistant opens, starts a turn, and renders terminal state without console errors | local Vite runtime and browser tooling / Codex | verified-bounded | `/project/new` assistant opens and renders missing-provider terminal state; real Provider not exercised |

## Assumptions

- Current localStorage session and memory shapes remain canonical and do not need migration.
- UI-only input, attachment selection, menus, dialog visibility, and DOM scrolling remain local React state.

## Alternatives Considered

- Recommended: a feature-owned pure reducer consumed with React `useReducer`.
- Alternative: store reducer state inside the core Agent; rejected because it couples domain orchestration to presentation details.
- Alternative: move everything to Zustand; rejected because this sheet is project-scoped, not shared global state, and the repository guidance prefers local state for page-local workflows.

## Decision Drivers

- Preserve core-to-feature dependency direction.
- Make multi-field async transitions atomic and testable.
- Avoid changes to persistence and user-visible confirmation behavior.

## Decisions

### ADR-1 - Reducer remains in feature layer

- Decision: create `src/features/creative-assistant/creative-assistant-ui-reducer.ts`.
- Drivers: types and rendering state already belong to the feature.
- Alternatives: core Agent state or global Zustand store.
- Why chosen: it centralizes UI transitions without adding reverse dependencies or global lifecycle complexity.
- Consequences: the sheet dispatches actions and effects persist the resulting state.
- Follow-ups: a future hook may wrap Agent event consumption, but it is not required for this change.

## Risks

- Async stale events could overwrite or terminate a newer turn.
- Project hydration effects could persist an empty intermediate state.
- Candidate/memory confirmation flags could diverge from rendered messages.

## Pre-Mortem

- Failure scenario 1: retry starts a new turn but old completion clears `generating`; mitigate with turn-ID guarded terminal actions.
- Failure scenario 2: project switch saves previous messages under the new ID; mitigate by preserving existing readiness/project refs and atomic hydrate.
- Failure scenario 3: reset clears confirmed memory; mitigate with separate conversation-reset and project-hydrate actions plus tests.
- Mitigations: reducer unit tests, existing component regressions, explicit persistence effects, browser smoke.

## Global Constraints

- Preserve all existing user changes in the dirty `develop` worktree.
- Do not change Provider, image, Tauri, project persistence, or localStorage formats.
- Do not redesign the assistant surface or alter confirmation semantics.

## Implementation Units

### U1 - Define reducer state and transitions

- Goal: add the pure reducer, initial-state factory, and typed actions.
- Requirements covered: R2, R8-R10, NFR1, NFR3-NFR4; ADR-004, EP-004.
- Acceptance criteria covered: atomic stream lifecycle, candidate/memory transitions, reset/hydrate behavior, stale-turn protection.
- Depends on: none.
- Files: `src/features/creative-assistant/creative-assistant-ui-reducer.ts`, `src/__tests__/features/creative-assistant/creative-assistant-ui-reducer.test.ts`.
- Forbidden files: `src/core/services/ai/text/`, `src/core/services/ai/image/`, `src-tauri/`, `package.json`, `pnpm-lock.yaml`.
- Approach: test state transitions first; implement immutable reducer actions with turn-ID guards.
- Tests: focused reducer Jest suite.
- Validation: `pnpm test -- --runInBand src/__tests__/features/creative-assistant/creative-assistant-ui-reducer.test.ts`.
- Rollback signals: action vocabulary requires DOM objects/functions, or reducer tests cannot express existing behavior without effects.
- Deferred to implementation: exact action names may be compressed if two actions have identical semantics.

### U2 - Migrate sheet state to reducer

- Goal: replace interdependent message/generating/error/candidate/memory setters with reducer dispatches.
- Requirements covered: R1, R2, R4-R10, NFR3-NFR4; ADR-004, EP-004.
- Acceptance criteria covered: visible behavior and persistence remain unchanged; all state transitions cross one reducer.
- Depends on: U1.
- Files: `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx`.
- Forbidden files: provider implementations, project page save logic, storage formats, visual token files.
- Approach: use `useReducer`; keep input, attachments, menu/dialog, refs, and effects local; replace state setters incrementally by transition category.
- Tests: existing `AICreativeAssistantSheet.test.tsx` and full creative-assistant suite.
- Validation: focused component test, TypeScript, ESLint.
- Rollback signals: component tests expose observable ordering changes or project persistence effects run before hydration readiness.
- Deferred to implementation: no separate custom hook unless component wiring remains materially duplicated after reducer migration.

### U3 - Review and runtime validation

- Goal: close code and browser gates and record evidence.
- Requirements covered: all scoped requirements and NFRs.
- Acceptance criteria covered: static, integration, and browser evidence are truthful and bounded.
- Depends on: U2.
- Files: `docs/00-process/active/creative-assistant-ui-reducer-2026-08-23/progress.md`; production files only for deterministic review fixes.
- Forbidden files: unrelated worktree changes and generated output outside scoped evidence.
- Approach: run full focused suite, `tsc`, direct ESLint command, build, session-scope review, then local browser smoke.
- Tests: all creative-assistant Jest suites.
- Validation: named commands in Validation Plan.
- Rollback signals: any P0/P1 review finding, build failure attributable to the reducer, console error, or broken assistant interaction.
- Deferred to implementation: real Provider calls remain unverified without credentials.

## Consistency Check

- implementationUnitCount: 3
- sourceRequirementsCovered: R10 and NFR4 directly; R1-R9 and NFR1-NFR3 regression-preserved through the existing implemented Agent path
- sourceRequirementsDeferred: none; provider runtime proof remains a validation gap, not a behavior deferral
- openQuestionsCount: 0

## Validation Plan

- Unit: reducer transition tests and Agent tests.
- Integration: full `src/__tests__/features/creative-assistant` Jest suite.
- User flow: open existing project editor assistant and observe initial/terminal state in browser.
- Data / operations: verify session and memory formats unchanged; no database or remote write added.
- Observability: browser console must contain no new reducer/render errors; real Provider network behavior remains unverified.

## Rollback / Recovery

Delete the reducer and restore the component's prior local state setters; no data migration or storage rollback is required because persisted shapes are unchanged.

## Plan Self-Review

- Placeholder scan: pass; no placeholders or vague implementation-only steps.
- Consistency check: pass; three units are serial and file ownership is explicit.
- Scope check: pass; no Provider, backend, persistence format, or visual redesign work.
- Acceptance coverage: pass; reducer behavior, integration parity, and browser flow are mapped.
- Validation gaps: real authenticated Provider and Tauri desktop calls remain unverified and are not required to prove reducer correctness.
- Alternatives and ADR check: pass; feature reducer selected over core or global state.
- High-risk pre-mortem check: pass; stale events, hydration persistence, and memory reset are addressed.

## Handoff

Execute serially with `ae-work`. Begin with a failing reducer test, then migrate the component without changing rendered labels or persisted data shapes.

## Completion Record

- U1 complete: reducer and focused transition tests added.
- U2 complete: sheet business state migrated; transient controls and effects remain local.
- U3 complete: code review `APPROVE`, browser smoke passed, and final LFG gate passed.
- Gate proof: `docs/ae/gates/20260823T084619Z-lfg-final.json`.
- No schema, Provider, database, or Git operation was introduced by this plan.
