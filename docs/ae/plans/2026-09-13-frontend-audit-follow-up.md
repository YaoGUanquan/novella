---
type: plan
status: ready
date: 2026-09-13
title: frontend-audit-follow-up
origin: docs/ae/reports/novella-frontend-experience-audit-2026-09-06.md
originFingerprint: frontend-audit-2026-09-06
depth: standard
format: human-readable-plan
sharded: false
---

# Frontend Audit Follow-Up

## AI Parse Contract

canonicalKind: plan
humanEquivalent: true
stableIdsRequired: true
noImplicitScope: true

## Scope And Requirements

- R1: Preserve the existing homepage visual system and routes. Complete the audit's project-card keyboard, responsive, truthful-status and delete-feedback gaps.
- R2: Preserve store-only deletion. Do not add disk deletion or claim durable persistence from a synchronous store update.
- R3: Replace the homepage's remote image with an existing repository bitmap; narrow studio transitions and respect reduced motion.
- R4: Evaluate Page Agent against the actual assistant and provider boundaries; do not install it or delegate destructive actions.
- Assumption: this pass targets the supplied homepage audit, not a redesign of every editor or a provider migration.
- Non-goals: persistent schema changes, global token migration, Tauri commands, real-provider calls, Git delivery.

## Decisions And Failure Modes

Reuse the existing Radix Dialog primitives in the home feature. The existing ConfirmDialog closes immediately without awaiting work and lacks modal focus management; changing it would affect unrelated consumers.
Keep feature mutation state local. The store is synchronous and exposes no loading/error query contract, so do not invent a remote list loader.
Use all existing store projects, sorted by update time, for the searchable project hall; the recentProjects helper truncates at ten and cannot support searching the full hall.
Risks: accidental removal, lost keyboard focus, false persistence claims. Mitigate with cancel-first focus, explicit confirmation, failure retention, focus restoration and bounded success copy.
Rejected: a new UI framework, dependency installation, and replacing typed domain execution with DOM automation.

## Implementation Units

### U1: Project Hall

Depends on: none

- Covers R1/R2. Files: src/features/home/components/ProjectGrid.tsx, HomeView.tsx, Home.module.less; src/**tests**/features/home/project-grid.test.tsx.
- Acceptance: native keyboard-open controls without nested buttons; visible focused actions; search covers all projects; actual status/aspect ratio; distinguish empty/search-empty; cancel does not mutate; confirm removes only selected record; errors remain visible.
- Validation: focused Jest, TypeScript, lint; desktop/mobile browser with synthetic local projects and modal cancellation/confirmation.
- Rollback: undo only task-owned hunks if routes, focus or store semantics regress.
- Forbidden: store persistence, provider and unrelated dirty files. Deferred: storage flush error propagation and real disk deletion.

### U2: Preview And Motion

Depends on: U1

- Covers R3. Files: src/features/home/components/HeroSection.tsx, src/styles/globals.css.
- Acceptance: local bitmap renders offline; preview control is truthful; studio transitions exclude layout properties; reduced-motion checks on homepage.
- Validation: production build, browser asset dimensions, screenshots, computed motion.
- Rollback: task-owned hunks only. Forbidden: theme migration and dependency manifests. Deferred: other routes' Framer Motion audit.

### U3: Assessment And Evidence

Depends on: U1, U2

- Covers R4 and all acceptance evidence. Files: docs/ae/reports/novella-frontend-follow-up-2026-09-13.md; docs/00-process/active/frontend-audit-follow-up-2026-09-13/progress.md.
- Validation: compare official Page Agent source with CreativeAssistantAgent, configured provider transport, candidate confirmation and Tauri boundaries.
- Rollback: correct unsupported claims; no runtime integration. Forbidden: assistant/provider changes.

## Consensus And Review

Requirements confirmed by supplied audit and implementation request. Document self-review: pass; no blocking product decisions within the bounded scope. Single-writer execution preserves existing dirty changes on develop. Page Agent adoption is explicitly deferred pending assessment and permission/transport design.
Exact validation: pnpm exec jest --runInBand src/**tests**/features/home/project-grid.test.tsx; pnpm exec tsc --noEmit; pnpm lint; pnpm build; git diff --check; Playwright desktop/mobile.
Evidence owners: this task owns focused/browser fixtures and results. Tauri, real providers and deployment remain unverified. Browser failure blocks a full frontend acceptance claim, not source-level reporting.
