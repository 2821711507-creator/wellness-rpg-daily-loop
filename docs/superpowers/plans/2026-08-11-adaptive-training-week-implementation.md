# Adaptive Training Week Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and display the approved recovery-aware training guide for 2026-08-10 through 2026-08-16.

**Architecture:** A pure domain module supplies exact dated guidance and reconciles it into existing plans. Persistence validation remains backward-compatible. A focused React component presents guidance separately from editable meal/activity items.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, CSS.

## Global Constraints

- Preserve existing meals, planned activities, completion state, records, and profile data.
- Tuesday is completed and no additional HIIT is scheduled.
- Monday remains skipped without make-up work.
- Thursday and Saturday are the only formal strength sessions.
- Sunday allows rest based on leg soreness.
- Do not present the guide as medical treatment.

---

### Task 1: Guidance Domain and Persistence

- [x] Write failing tests for the exact seven-day schedule and idempotent reconciliation.
- [x] Implement `src/domain/weeklyTrainingGuidance.ts` and types.
- [x] Extend `WeeklyPlan` with optional guidance and validate it without rejecting legacy plans.
- [x] Attach guidance during target-week generation and restore.
- [x] Run domain, validation, and hook tests.

### Task 2: Plan Screen Presentation

- [x] Write failing component tests for the weekly focus, seven guide days, exercises, HIIT limit, and flexible-meal note.
- [x] Add `TrainingWeekGuide.tsx` and render it above `WeekBoard`.
- [x] Add responsive, accessible styles with clear completed/recovery/rest/conditional states.
- [x] Run component tests.

### Task 3: Verification

- [x] Run the complete test suite and production build.
- [ ] Measure horizontal overflow at 390px and 1024px when browser access is available. (No browser-control session was available.)
- [x] Run `git diff --check`, review the scoped diff, and commit.
