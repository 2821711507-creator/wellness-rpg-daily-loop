# Weekly Wellness Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simple Monday-to-Sunday meal and activity planner that generates a usable week from a few preferences, supports safe move/replace actions, and synchronizes completion with the existing Today screen.

**Architecture:** Pure functions in `src/domain/weeklyPlan.ts` own dates, generation, collision checks, replacements, and summaries. React components render either preferences or a generated plan, while `useWellnessGame` remains the single state/persistence boundary. The existing version-1 record gains an optional weekly plan; a narrow sanitizer discards only invalid weekly data so profile, smoothie, game, and avatar progress remain intact.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Vitest, Testing Library, user-event, jsdom, CSS custom properties, Lucide React.

## Global Constraints

- Week boundaries and stored dates use local-time `YYYY-MM-DD` strings; weeks start Monday.
- Meal frequency is 2, 3, or 4 per day; activity frequency is 2 through 5 per week.
- Activity environments remain gym machines, equipment-free home exercise, and walking.
- Generated plans are guidance, not medical prescriptions or calorie-equivalence claims.
- Existing smoothie quantities are copied into planned smoothie meals and are not mutated by later edits.
- Completion rewards remain action-based; no reward depends on weight loss or eating below a calorie target.
- Mobile uses one vertical day column; desktop uses a readable seven-column board without horizontal page overflow.
- Do not add drag-and-drop, GPS, wearables, social sync, server persistence, or recipe generation in this feature.

---

### Task 1: Weekly Plan Domain Model and Local-Date Utilities

**Files:** Create `src/domain/weeklyPlan.ts`, `src/domain/weeklyPlan.test.ts`

**Interfaces:**

```ts
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface WeeklyPlanPreferences {
  mealsPerDay: 2 | 3 | 4
  smoothieSlots: MealSlot[]
  activitiesPerWeek: 2 | 3 | 4 | 5
  activityMix: Record<ActivityEnvironment, number>
}

export interface PlannedMeal {
  id: string
  date: string
  slot: MealSlot
  kind: 'smoothie' | 'regular'
  smoothieItems?: SmoothieItem[]
  completed: boolean
}

export interface PlannedActivity {
  id: string
  date: string
  templateId: string
  completed: boolean
}

export interface WeeklyPlan {
  id: string
  weekStart: string
  preferences: WeeklyPlanPreferences
  meals: PlannedMeal[]
  activities: PlannedActivity[]
}

export function toLocalDateKey(date: Date): string
export function getMonday(date: Date): Date
export function getWeekDateKeys(weekStart: string): string[]
```

- [ ] Write tests proving Sunday resolves to the preceding Monday, Monday remains unchanged, and seven local date keys cross month boundaries without UTC drift.
- [ ] Write compile-time fixtures for every weekly-plan interface and assert copied smoothie arrays do not share item object references.
- [ ] Run `npm test -- src/domain/weeklyPlan.test.ts`; expect a missing-module failure.
- [ ] Implement local-date parsing/formatting with numeric year, month, and day constructors rather than `toISOString()`.
- [ ] Export constants for ordered meal slots and Korean labels so generation and UI use the same source.
- [ ] Run `npm test -- src/domain/weeklyPlan.test.ts`; expect all date/model tests to pass.
- [ ] Commit with `git commit -m "feat: add weekly plan domain model"`.

### Task 2: Deterministic Weekly Plan Generation

**Files:** Modify `src/domain/weeklyPlan.ts`, `src/domain/weeklyPlan.test.ts`; read `src/data/activityTemplates.ts`

**Interfaces:**

```ts
export interface GenerateWeeklyPlanInput {
  weekStart: string
  preferences: WeeklyPlanPreferences
  smoothieItems: SmoothieItem[]
  activityTemplates: ActivityTemplate[]
}

export type PlanGenerationResult =
  | { ok: true; plan: WeeklyPlan }
  | { ok: false; message: string }

export function generateWeeklyPlan(input: GenerateWeeklyPlanInput): PlanGenerationResult
```

- [ ] Add failing parameterized tests for meal slots: 2 meals produce breakfast/dinner, 3 produce breakfast/lunch/dinner, and 4 add snack on each of seven dates.
- [ ] Add failing tests that selected slots become smoothies, unselected slots remain regular meals, and every smoothie receives a deep copy of the current smoothie combination.
- [ ] Add failing tests for 2–5 activities using the placement priority Monday, Wednesday, Friday, Saturday, Tuesday; assert one activity maximum per date.
- [ ] Add failing ratio tests: `{ gym: 2, home: 1, walk: 1 }` over four sessions yields 2/1/1, ties are deterministic in gym/home/walk order, and zero total mix returns `운동 방식 비율을 하나 이상 선택해 주세요.`.
- [ ] Run the focused test and confirm the new assertions fail for missing behavior.
- [ ] Implement largest-remainder integer allocation for environments, then select the first matching activity template per allocated environment.
- [ ] Generate stable IDs from plan ID, date, kind, and slot/template sequence; do not use random IDs so identical inputs produce identical output.
- [ ] Run `npm test -- src/domain/weeklyPlan.test.ts`; expect generation tests to pass.
- [ ] Commit with `git commit -m "feat: generate weekly wellness plans"`.

### Task 3: Plan Mutations, Fallbacks, and Summary

**Files:** Modify `src/domain/weeklyPlan.ts`, `src/domain/weeklyPlan.test.ts`

**Interfaces:**

```ts
export type PlanMutationResult =
  | { ok: true; plan: WeeklyPlan }
  | { ok: false; message: string }

export interface WeeklySummary {
  plannedMeals: number
  smoothieMeals: number
  plannedActivities: number
  activityCounts: Record<ActivityEnvironment, number>
  completedItems: number
  totalItems: number
}

export function movePlannedMeal(plan: WeeklyPlan, mealId: string, targetDate: string): PlanMutationResult
export function movePlannedActivity(plan: WeeklyPlan, activityId: string, targetDate: string): PlanMutationResult
export function replacePlannedActivity(plan: WeeklyPlan, activityId: string, replacementTemplateId: string, templates: ActivityTemplate[]): PlanMutationResult
export function setPlannedItemCompleted(plan: WeeklyPlan, itemId: string, completed: boolean): WeeklyPlan
export function normalizeWeeklyPlan(plan: WeeklyPlan, templates: ActivityTemplate[]): { plan: WeeklyPlan; warning?: string }
export function calculateWeeklySummary(plan: WeeklyPlan, templates: ActivityTemplate[]): WeeklySummary
```

- [ ] Write failing tests for moving a meal, refusing a duplicate meal slot on the target date, moving an activity, refusing a second activity on one date, and refusing dates outside the plan week.
- [ ] Write failing tests for replacing an activity, rejecting unknown replacements, preserving completion on replacement, and leaving the original plan immutable.
- [ ] Write failing tests for completion counts and environment counts in `calculateWeeklySummary`.
- [ ] Write a failing normalization test where an unknown template becomes `walk-basic` and returns a Korean warning.
- [ ] Run the focused test and confirm mutation/summary cases fail.
- [ ] Implement mutations with copied arrays and unchanged object identity for untouched items where practical.
- [ ] Make missing item IDs return user-readable errors instead of throwing.
- [ ] Run `npm test -- src/domain/weeklyPlan.test.ts`; expect all weekly domain tests to pass.
- [ ] Commit with `git commit -m "feat: add weekly plan editing rules"`.

### Task 4: Preferences Form and Weekly Plan Presentation

**Files:** Create `src/components/PlanPreferencesForm.tsx`, `src/components/WeeklySummary.tsx`, `src/components/PlanItemActions.tsx`, `src/components/DayPlanCard.tsx`, `src/components/WeekBoard.tsx`, `src/components/WeeklyPlanScreen.tsx`, `src/components/WeeklyPlanScreen.test.tsx`; modify `src/styles.css`

**Component Contracts:**

```ts
interface WeeklyPlanScreenProps {
  plan: WeeklyPlan | null
  smoothieItems: SmoothieItem[]
  onGenerate(preferences: WeeklyPlanPreferences): void
  onMoveMeal(id: string, date: string): PlanMutationResult
  onMoveActivity(id: string, date: string): PlanMutationResult
  onReplaceActivity(id: string, templateId: string): PlanMutationResult
  onRegenerate(): void
}
```

- [ ] Write a failing interaction test that selects three meals, marks breakfast and dinner as smoothies, chooses three activities with a nonzero mix, submits, and receives the preferences in `onGenerate`.
- [ ] Write failing render tests that a generated plan shows seven date headings, summary counts, meal kind text, activity environment/duration, and a “계획 다시 만들기” action.
- [ ] Write failing interaction tests that open a date-move dialog, submit a target date, display a collision error with `role="alert"`, close by Escape, and restore focus to the trigger.
- [ ] Write a failing replacement test that lists the existing gym/home/walk alternatives with duration and intensity but makes no calorie-equivalence statement.
- [ ] Run `npm test -- src/components/WeeklyPlanScreen.test.tsx`; expect missing components.
- [ ] Implement native radio groups, checkboxes, buttons, and `<dialog>` or an accessible dialog pattern; label every control in Korean.
- [ ] Render completion with both text and an icon, never color alone. Use 44px minimum interactive targets and visible `:focus-visible` outlines.
- [ ] Extend existing ivory/pale-blue tokens only; reserve the game accent for completion/reward feedback and avoid a different color per day.
- [ ] Add mobile one-column day cards and `@media (min-width: 1024px)` seven equal columns; allow card content to wrap without page-level horizontal scrolling.
- [ ] Disable transitions inside `prefers-reduced-motion: reduce`.
- [ ] Run the focused component test and `npm run build`; expect success.
- [ ] Commit with `git commit -m "feat: add responsive weekly plan screen"`.

### Task 5: Persistence, Validation, and Hook Commands

**Files:** Create `src/domain/weeklyPlanValidation.ts`, `src/domain/weeklyPlanValidation.test.ts`; modify `src/hooks/useWellnessGame.ts`, `src/repositories/localStorageWellnessRepository.test.ts`; create `src/hooks/useWellnessGame.test.tsx`

**State Changes:**

```ts
export interface WellnessState {
  version: 1
  profile: UserProfile | null
  nutritionTarget: NutritionTarget | null
  smoothie: SmoothieItem[]
  selectedActivityId: string
  game: GameState
  avatar: AvatarState
  weeklyPlan?: WeeklyPlan
}
```

- [ ] Write validation tests for a valid plan, malformed nested preference values, invalid date keys, duplicate meal slots, and unknown activity template IDs.
- [ ] Write a hook test that loads a valid existing version-1 daily record without `weeklyPlan` and preserves it unchanged.
- [ ] Write a hook test that loads valid daily fields plus a corrupt weekly plan, retains profile/game/avatar/smoothie, removes only `weeklyPlan`, and exposes a plan-specific warning.
- [ ] Write hook tests for generate, regenerate, move meal, move activity, replace activity, and completion commands.
- [ ] Write a save-failure test using a throwing storage double and assert the most recent in-memory plan remains rendered.
- [ ] Run the focused validation/hook tests and confirm they fail before implementation.
- [ ] Implement `parseWeeklyPlan(value, activityTemplates)` as a narrow runtime validator; do not broaden the repository into domain-aware code.
- [ ] Initialize repository loading once in the hook state initializer so renders do not repeatedly read storage.
- [ ] Add hook commands that call the pure domain functions and store their last mutation message for UI feedback.
- [ ] Keep the existing `wellness-rpg:v1` key and optional-field compatibility; do not erase or rewrite unrelated daily fields during weekly recovery.
- [ ] Run `npm test -- src/domain/weeklyPlanValidation.test.ts src/hooks/useWellnessGame.test.tsx src/repositories/localStorageWellnessRepository.test.ts`; expect success.
- [ ] Commit with `git commit -m "feat: persist and recover weekly plans"`.

### Task 6: Navigation and Today-to-Week Completion Sync

**Files:** Modify `src/App.tsx`, `src/components/TodayScreen.tsx`, `src/hooks/useWellnessGame.ts`, `src/AppFlow.test.tsx`, `src/styles.css`

**Behavior:**

- `App` owns a local view value `'today' | 'plan'`; this navigation choice does not require persistence.
- When a weekly plan exists for the current week, Today shows that date’s meals and activity.
- Completing the existing activity quest also marks today’s planned activity complete.
- Completing a planned smoothie meal uses the existing meal quest reward path once and marks that meal complete.

- [ ] Add a failing app-flow test that onboards, opens the enabled “계획” tab, generates a week, and sees seven dates.
- [ ] Add a failing test that returns to Today, completes today’s planned activity, revisits Plan, and sees its completed text and updated summary.
- [ ] Add a failing reload test that remounts the app and restores the generated plan and completion state from local storage.
- [ ] Add a failing test that a week from a previous Monday does not replace today’s normal selected activity.
- [ ] Run `npm test -- src/AppFlow.test.tsx`; expect new flows to fail.
- [ ] Replace the disabled Plan preview and bottom-nav button with real navigation controls using `aria-current="page"`.
- [ ] Pass a date-key function into hook commands or compute the date at command time; never synchronize via UTC date slicing.
- [ ] Derive today’s planned items from state rather than duplicating them in a second React state value.
- [ ] Reuse `completeQuest` event IDs based on quest kind and local date so revisiting screens cannot award duplicate XP/coins.
- [ ] Show completion confirmation in the existing quiet visual language; do not turn the planning screen into a separate game board.
- [ ] Run `npm test -- src/AppFlow.test.tsx && npm run build`; expect success.
- [ ] Commit with `git commit -m "feat: connect weekly plan to daily loop"`.

### Task 7: Full Verification and Visual QA

**Files:** Modify only files required by failures found during verification.

- [ ] Run `npm test`; expect zero failing tests.
- [ ] Run `npm run build`; expect TypeScript and Vite builds to succeed.
- [ ] Run `rg -n 'T[B]D|TO[D]O|FIX[M]E' src docs/superpowers/plans/2026-08-10-weekly-wellness-plan.md`; expect no placeholder matches.
- [ ] Start `npm run dev -- --host 127.0.0.1` and inspect at 390×844 and 1440×1000.
- [ ] At 390px, verify one day column, no horizontal page overflow, 44px controls, visible focus, usable dialogs, and readable meal/activity details.
- [ ] At 1440px, verify seven day columns fit, summary is visually primary, repeated cards remain legible, and the pale-blue/ivory palette stays cohesive.
- [ ] Navigate using keyboard only: Today → Plan → preferences → generate → move dialog → replace dialog → Today.
- [ ] Enable reduced motion and verify dialog/card changes have no required motion.
- [ ] Corrupt only the stored `weeklyPlan` value in browser storage, reload, and verify profile, game rewards, smoothie, and avatar remain.
- [ ] Review all generated guidance copy to ensure it does not promise calorie equivalence or medical outcomes.
- [ ] Run `git status --short` and confirm only intentional changes remain.
- [ ] If QA required fixes, rerun full test/build and commit with `git commit -m "fix: polish weekly plan experience"`.

## Final Acceptance Criteria

- [ ] A new user can create a useful seven-day plan in one short form.
- [ ] Meal and activity counts exactly match selected preferences.
- [ ] Move and replace actions are immutable, collision-safe, keyboard accessible, and persisted.
- [ ] Today and Plan show the same completion state and never double-award rewards.
- [ ] Invalid weekly data never destroys valid daily progress.
- [ ] Both mobile and desktop retain the approved light ivory and pale-blue design system.
- [ ] Automated tests and production build pass, and visual QA has been completed at both target widths.
