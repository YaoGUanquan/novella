---
type: prd
status: implemented
date: 2026-08-23
topic: creative-assistant-agent-unification
format: human-readable-requirements
sharded: false
---

# Creative Assistant Agent Unification

## AI Parse Contract

- canonicalKind: requirements
- humanEquivalent: true
- stableIdsRequired: true
- noImplicitScope: true

## Problem Frame

The creative assistant currently renders the chat and also coordinates transport, skill selection, memory, candidate parsing, form callbacks, project persistence, and image generation. This makes future behavior changes cross-cutting and makes the UI the de facto agent runtime.

The desired outcome is one replaceable domain agent that owns assistant orchestration while preserving explicit user confirmation for every durable write. The UI remains a presentation and confirmation surface.

## Requirements

**Unified orchestration**

- R1. The assistant must expose one domain-level entry point for a conversation turn and lifecycle operations.  
  Acceptance: feature callers can send, cancel, retry, clear, and start a conversation through the agent without invoking configured dialogue or image services directly.
- R2. The agent must keep conversation and proposal state independent from React rendering.  
  Acceptance: the agent can be exercised by a non-React test using injected adapters and deterministic events.

**Controlled creative actions**

- R3. The agent must inject the product's always-on clarification, candidate, and memory rules and only inject explicitly selected catalog skills.  
  Acceptance: a request contains the enabled skill instructions and no unselected skill instruction.
- R4. A normal turn must produce assistant text and optional structured state without claiming that a form or project was changed.  
  Acceptance: parsing a turn exposes proposals and leaves durable data unchanged.
- R5. Candidate proposals must update a pending preview only; form application and project saving require explicit confirmation.  
  Acceptance: applying a candidate invokes the form adapter once, and saving is not reported as successful when the adapter returns false or throws.
- R6. Project memory must be saved separately from form application.  
  Acceptance: saving memory changes the memory store but never invokes the form adapter.
- R7. Image generation must run only for an explicit visual action and must return a project asset that can be attached to the assistant transcript.  
  Acceptance: descriptive questions do not invoke the image adapter; an explicit generate/modify request does, and the resulting asset is observable in the emitted event.

**Failure and lifecycle**

- R8. Cancellation, transport failure, image failure, and retry must be observable as agent events and must not mutate confirmed project data.  
  Acceptance: a failed or cancelled turn ends in a failed/cancelled state, while confirmed memory and form values remain unchanged.
- R9. Session persistence must be replaceable through an adapter and remain project-scoped.  
  Acceptance: two project IDs never load or save the same agent session.
- R10. Deterministic presentation transitions must be owned by one feature-local pure reducer.  
  Acceptance: messages, active turn, errors, candidate, memory, hydration, and reset transitions cross typed reducer actions; a stale terminal event cannot close a newer turn.

## Non-Functional Requirements

- NFR1. The agent module must not import React, page components, or browser storage APIs directly.  
  Acceptance: dependency-cruiser and TypeScript checks pass with persistence supplied by an adapter.
- NFR2. Provider credentials and raw secrets must remain inside existing transport/configuration adapters.  
  Acceptance: agent events, persisted messages, and logs contain no API key or authorization header.
- NFR3. Existing `AICreativeAssistantSheet` props and visible confirmation semantics remain compatible during migration.  
  Acceptance: the focused creative-assistant test suite remains green and candidate/memory confirmation behavior is unchanged.
- NFR4. Reducer code must not perform browser, storage, network, DOM, or cancellation side effects.  
  Acceptance: these effects remain in the React integration layer and reducer tests run without React rendering.

## Success Criteria

- All assistant actions in the creative-assistant feature cross one agent interface.
- Unit tests prove turn streaming, skill gating, explicit write confirmation, image intent gating, cancellation, and project isolation.
- Reducer tests prove atomic terminal transitions, stale-turn protection, hydration/reset behavior, independent candidate/memory state, and external-image deduplication.
- The existing configured dialogue and image-generation services remain the only provider-facing implementations.

## Scope Boundary

### In Scope

- A core domain agent module and its typed event/state interface.
- Adapters for configured dialogue, image generation, session persistence, and target-form/project actions.
- Migration of the creative assistant sheet to call the agent.
- Migration of interdependent presentation state to a feature-owned pure reducer.
- Focused regression tests and design documentation.

### Out Of Scope

- Dynamically loading or executing `mattpocock/skills` `SKILL.md` files at product runtime.
- Replacing existing AI Provider or image Provider implementations.
- New remote endpoints, database tables, collaboration memory, or automatic form writes.
- Redesigning the assistant visual language beyond the migration required by the new state/events.

### Constraints

- Preserve the repository dependency direction: core cannot import features, pages, or UI.
- Durable writes remain explicit user actions.
- Existing project-scoped local persistence remains recoverable and backward compatible.
- UI reducer terminal actions are turn-ID guarded and cannot perform effects.

## Validation Evidence (Conditional)

- Tier 1 static/type evidence: `pnpm exec tsc --noEmit`, focused Jest tests, and dependency-cruiser.
- Tier 2 component evidence: Testing Library tests for visible assistant states and confirmation actions.
- Browser/Tauri runtime evidence remains unverified until a real configured dialogue/image service is available; mocks do not prove provider compatibility.

## Key Decisions

- D1. Use a stateful, UI-free domain agent with injected adapters.  
  Reason: concentrates orchestration while preserving existing storage and provider seams.
- D2. Keep suggestion and durable write operations separate.  
  Reason: prevents model output from overwriting user edits or confirmed project data.
- D3. Treat external skill repositories as design references only.  
  Reason: the supplied repository contains development-agent workflows, not a safe product runtime contract.
- D4. Keep deterministic assistant UI state in `src/features/creative-assistant`, not in the core Agent or a global store.  
  Reason: presentation state is feature-owned, while core remains UI-free and project-local state does not need global lifecycle.

## Dependencies And Assumptions

### Dependencies

- Existing configured dialogue event stream in `src/core/services/ai/text/ai-service.ts`.
- Existing unified image entry point in `src/core/services/ai/image/image-generation-service.ts`.
- Existing project save and creative-assistant session/memory formats.

### Assumptions

- Existing persisted session and memory formats can be read by adapters without migration in the first slice.
- A target feature can provide parse/apply/persist callbacks for its form-specific candidate type.

## Open Questions

### Must Resolve Before Planning

- None. The user selected the recommended architecture, state ownership, and confirmation policy.

### Resolved During Implementation

- Q1. The shared `AICreativeAssistantSheet` migration covers character, script, storyboard, and project-detail entry points through their common component.
- Q2. Image generation remains behind the injected callback and existing project editor asset flow; the reducer stores transcript metadata only and performs no asset persistence.

## Evidence Notes

- Existing orchestration is concentrated in `src/features/creative-assistant/components/AICreativeAssistantSheet.tsx` and directly calls configured dialogue, memory/session persistence, candidate callbacks, and image callbacks.
- Existing provider seams are `aiService.streamConfiguredDialogueEvents` and `imageGenerationService.generateImage`.
- Existing project rules require explicit confirmation before form/project writes.
- Implementation evidence: `docs/ae/gates/20260823T084619Z-lfg-final.json` records the passing static, test, build, review, and browser gate.

## Consistency Check

- requirementsCount: 10
- nonFunctionalRequirementsCount: 4
- decisionsCount: 4
- openQuestionsCount: 0
