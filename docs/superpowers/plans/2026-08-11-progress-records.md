# Progress Records and Weekly Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily weight recording, a 28-day chart emphasizing a seven-day moving average, four-week completion history, weekly XP summaries, and deterministic evidence-labelled insights.

**Architecture:** Pure modules `weight.ts`, `records.ts`, and `insight.ts` own all calculations and safety rules. `useWellnessGame` adds backward-compatible persisted arrays and records completion events exactly once. Focused React components compose the Record screen and consume prepared domain results rather than embedding calculations.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Vitest 4, Testing Library, jsdom, native SVG, CSS custom properties, Lucide React.

## Global Constraints

- Weight is stored in kilograms from 20.0 through 350.0, rounded to one decimal place.
- One weight entry exists per local `YYYY-MM-DD` date; future dates are rejected.
- A rolling average uses the current date and preceding six calendar dates and requires at least four valid entries.
- Weight change never grants XP and is never styled as success or failure.
- Analysis is deterministic and must not diagnose disease, predict a goal date, prescribe supplements/medication, or invent calorie cuts.
- First release uses no generative AI API and labels the analysis method honestly.
- Existing `wellness-rpg:v1` data remains readable; corrupt record arrays reset independently.
- The approved ivory and pale-blue color system remains unchanged.
- All graph information has a text summary and accessible table equivalent.
- Real browser QA remains mandatory before claiming the visual work complete.

---

### Task 1: Weight Entries and Seven-Day Trend

**Files:**
- Create: `src/domain/weight.ts`
- Create: `src/domain/weight.test.ts`

**Interfaces:**

```ts
export interface WeightEntry { id:string; date:string; weightKg:number; recordedAt:string }
export interface TrendPoint { date:string; weightKg:number|null; rollingAverageKg:number|null }
export type WeightMutationResult = { ok:true; entries:WeightEntry[] } | { ok:false; message:string }
export function upsertWeightEntry(entries:WeightEntry[], input:{date:string;weightKg:number;recordedAt:string}, today:string):WeightMutationResult
export function deleteWeightEntry(entries:WeightEntry[], date:string):WeightEntry[]
export function calculateWeightTrend(entries:WeightEntry[], endDate:string, days?:number):TrendPoint[]
export function summarizeWeightTrend(points:TrendPoint[]):{currentAverageKg:number|null;previousAverageKg:number|null;changeKg:number|null;recentRecordDays:number}
```

- [ ] Write a failing test that accepts `72.46`, stores `72.5`, creates ID `weight-2026-08-11`, and leaves the input array unchanged.
- [ ] Write failing tests that reject `19.9`, `350.1`, invalid dates, and dates after `today` with exact Korean messages.
- [ ] Write a failing test that replaces the same date, sorts entries ascending, and preserves other record objects.
- [ ] Write a failing delete test proving only the selected date is removed.
- [ ] Write failing moving-average tests for sparse entries, four-of-seven eligibility, a month boundary, and a 28-day output range.
- [ ] Write a failing summary test for current/previous averages, signed one-decimal change, and recent record count.
- [ ] Run `npm test -- src/domain/weight.test.ts`; expect missing-module or missing-function failures.
- [ ] Implement local-date arithmetic using numeric constructors and reuse `toLocalDateKey`; never use UTC slicing.
- [ ] Implement immutable upsert/delete, a calendar-window average, and one-decimal display rounding.
- [ ] Run the focused test and `npm run build`; expect success.
- [ ] Commit with `git commit -m "feat: add daily weight trend calculations"`.

### Task 2: Completion Events and Weekly Record Summary

**Files:**
- Create: `src/domain/records.ts`
- Create: `src/domain/records.test.ts`

**Interfaces:**

```ts
export interface CompletionEvent {
  id:string; date:string; kind:'planned-meal'|'planned-activity'|'recovery'; plannedItemId?:string; xpEarned:number
}
export interface WeeklyRecordSummary {
  weekStart:string; plannedMeals:number; completedMeals:number; plannedActivities:number;
  completedActivities:number; completionRate:number|null; xpEarned:number; weightDays:number
}
export function appendCompletionEvent(events:CompletionEvent[], event:CompletionEvent):CompletionEvent[]
export function calculateWeeklyRecordSummary(plan:WeeklyPlan|null, events:CompletionEvent[], weights:WeightEntry[], weekStart:string):WeeklyRecordSummary
export function getFourWeekCompletionDays(plans:WeeklyPlan[], events:CompletionEvent[], endDate:string):CompletionDay[]
```

- [ ] Write a failing test that `appendCompletionEvent` adds a new event and ignores an existing event ID without mutation.
- [ ] Write failing summary tests for meal/activity completed counts, `null` when no planned items exist, rounded percentage, weekly XP, and distinct weight days.
- [ ] Write a failing four-week test whose day states distinguish `none`, `incomplete`, and `complete` and include meal completed/total counts plus activity status.
- [ ] Run `npm test -- src/domain/records.test.ts`; confirm expected failures.
- [ ] Implement event deduplication and local week filtering with `getWeekDateKeys`.
- [ ] Accept an array of plans in four-week history even though phase one normally contains one current plan; do not fabricate older plans.
- [ ] Run focused tests and build; expect success.
- [ ] Commit with `git commit -m "feat: summarize wellness completion records"`.

### Task 3: Deterministic Evidence-Labelled Insight Engine

**Files:**
- Create: `src/domain/insight.ts`
- Create: `src/domain/insight.test.ts`

**Interfaces:**

```ts
export interface WeeklyInsight {
  status:'insufficient-data'|'ready'; observations:string[]; interpretation:string|null;
  suggestions:string[]; evidenceIds:string[]
}
export interface InsightInput {
  current:WeeklyRecordSummary; previous:WeeklyRecordSummary|null;
  trend:ReturnType<typeof summarizeWeightTrend>; currentWeightKg:number|null
}
export const INSIGHT_EVIDENCE: Evidence[]
export function generateWeeklyInsight(input:InsightInput):WeeklyInsight
```

- [ ] Write a failing test that fewer than four recent weight days returns `insufficient-data`, no interpretation, and a request for more records.
- [ ] Write failing ready-state tests for stable change below `0.2kg`, gradual loss, and gain using neutral nonjudgmental copy.
- [ ] Write a failing safety test that two comparable periods exceeding both roughly 1% body weight and the CDC reference threshold yields the clinician-consultation message without diagnosing a cause.
- [ ] Write failing suggestion tests: below 50% completion suggests making that plan lighter; 80% or more suggests maintaining the routine; output never exceeds two suggestions.
- [ ] Add a forbidden-copy assertion rejecting medication, supplement, diagnosis, goal-date, and fabricated calorie-deficit phrases.
- [ ] Run `npm test -- src/domain/insight.test.ts`; confirm failures.
- [ ] Implement ordered rules with stable Korean templates and evidence IDs for CDC, NIDDK, and self-weighing research.
- [ ] Ensure identical input deeply equals identical output and analysis performs no I/O.
- [ ] Run focused tests and build; expect success.
- [ ] Commit with `git commit -m "feat: add evidence-labelled weekly insights"`.

### Task 4: Backward-Compatible Persistence and Hook Commands

**Files:**
- Create: `src/domain/recordsValidation.ts`
- Create: `src/domain/recordsValidation.test.ts`
- Modify: `src/hooks/useWellnessGame.ts`
- Modify: `src/hooks/useWellnessGame.test.tsx`

**State Contract:**

```ts
interface WellnessState {
  // existing version-1 fields unchanged
  weightEntries?: WeightEntry[]
  completionEvents?: CompletionEvent[]
}
```

- [ ] Write validator tests for valid arrays, invalid weights, duplicate dates, future dates, invalid event kinds, negative XP, and duplicate IDs.
- [ ] Write a hook restore test that defaults missing arrays to `[]` while preserving every existing daily and weekly field.
- [ ] Write partial-recovery tests proving corrupt weights do not erase events and corrupt events do not erase weights, profile, plan, game, or avatar.
- [ ] Write hook tests for `saveWeight`, `deleteWeight`, and mutation status messages.
- [ ] Write a completion test proving first completion appends exactly one event with the quest XP and repeated completion appends none.
- [ ] Run validator/hook tests and confirm expected failures.
- [ ] Implement `parseWeightEntries` and `parseCompletionEvents` as independent validators outside the repository.
- [ ] Extend the hook’s one-time loader to normalize optional arrays independently and combine warnings without replacing valid state.
- [ ] Add `saveWeight(input)`, `deleteWeight(date)`, and record-event logic inside the same state updater that awards XP and completes planned items.
- [ ] Use event IDs `record-{kind}-{plannedItemId-or-date}` and retain events in chronological order.
- [ ] Run focused tests, full tests, and build; expect success.
- [ ] Commit with `git commit -m "feat: persist weight and completion records"`.

### Task 5: Record Screen Components and Responsive Layout

**Files:**
- Create: `src/components/WeightEntryForm.tsx`
- Create: `src/components/WeightTrendChart.tsx`
- Create: `src/components/CompletionCalendar.tsx`
- Create: `src/components/WeeklyRecordSummaryCard.tsx`
- Create: `src/components/WeeklyInsightCard.tsx`
- Create: `src/components/RecordsScreen.tsx`
- Create: `src/components/RecordsScreen.test.tsx`
- Create: `src/records.css`
- Modify: `src/main.tsx`

**Component Contract:**

```ts
interface RecordsScreenProps {
  today:string; entries:WeightEntry[]; plan:WeeklyPlan|null; events:CompletionEvent[];
  onSaveWeight(weightKg:number):WeightMutationResult; onDeleteWeight(date:string):void
}
```

- [ ] Write a failing form test for new entry, prefilled edit mode, decimal input mode, inline range error, saved status, and delete confirmation.
- [ ] Write a failing chart test for 28 dates, separate raw/average SVG paths, raw line gaps, emphasized average path, summary text, and accessible table rows.
- [ ] Write a failing calendar test for 28 day cells and visible `계획 없음`, `미완료`, `완료` text.
- [ ] Write a failing summary-card test for meal, activity, percentage or `계획 없음`, XP, and weight record days.
- [ ] Write insight-card tests for insufficient data, three ordered sections, method disclosure, and evidence links.
- [ ] Run `npm test -- src/components/RecordsScreen.test.tsx`; confirm missing-component failures.
- [ ] Implement the screen in task order: input → trend → weekly summary → calendar → insight.
- [ ] Add the nonjudgmental guidance `체중 기록이 불안하거나 부담스럽다면 측정 빈도를 낮추거나 기록 화면을 사용하지 않아도 괜찮아요.` near the evidence disclosure.
- [ ] Build SVG coordinates only from `TrendPoint[]`; render an always-available visually collapsible HTML table with date, raw weight, and rolling average.
- [ ] Use a single blue scale plus neutral ink; never map gain to red or loss to green.
- [ ] At below 1024px use one column; at 1024px and above use a dominant trend column and narrower summary/insight column.
- [ ] Make all controls at least 44px, allow headers to wrap, apply `min-width:0`, and honor reduced motion.
- [ ] Run component tests and build; expect success.
- [ ] Commit with `git commit -m "feat: add weight and progress records screen"`.

### Task 6: Today, Plan, and Record Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TodayScreen.tsx`
- Modify: `src/AppFlow.test.tsx`
- Modify: `src/styles.css`

**Behavior:** `App` view becomes `'today' | 'plan' | 'records'`; every visible bottom navigation renders Today, Plan, and Record with one `aria-current="page"` item.

- [ ] Add a failing flow test that onboards, opens Record, saves today’s weight, returns to Today, reopens Record, and sees the value.
- [ ] Add a failing reload test proving the weight and current Record view data restore after remount.
- [ ] Add a failing completion flow proving a planned activity updates the Record summary and XP exactly once.
- [ ] Add a failing test that Record shows the injected local date and rejects a future date through the domain boundary.
- [ ] Run `npm test -- src/AppFlow.test.tsx`; confirm failures are navigation/record behavior.
- [ ] Extract a small `BottomNavigation` component only if needed to prevent three copies; do not add a router dependency.
- [ ] Enable Record buttons in Today and Plan views, pass the same injected `now` clock, and derive the current week from local dates.
- [ ] Keep Friends and More outside this feature; Friends stays disabled.
- [ ] Run flow tests, full tests, and build; expect success.
- [ ] Commit with `git commit -m "feat: connect progress records to daily navigation"`.

### Task 7: Verification, Safety Review, and Visual QA

**Files:** Modify only files required by verified failures.

- [ ] Run `npm test`; expect all test files and assertions to pass with zero warnings.
- [ ] Run `npm run build`; expect TypeScript and Vite production build success.
- [ ] Run `rg -n 'T[B]D|TO[D]O|FIX[M]E' src docs/superpowers/plans/2026-08-11-progress-records.md`; expect no matches.
- [ ] Search user-visible analysis copy for diagnosis, medication, supplement, goal-date promises, punitive language, and invented calorie cuts; expect none.
- [ ] Start the local app and complete onboarding, weight create/edit/delete, navigation, activity completion, reload, and evidence disclosure with keyboard controls.
- [ ] At 390×844 measure `document.documentElement.scrollWidth - document.documentElement.clientWidth`; require `0` on Today, Plan, and Record.
- [ ] Repeat the overflow measurement at 1024px and 1440px and require `0`.
- [ ] Capture Record screenshots at 390px and 1440px; inspect chart labels, table disclosure, calendar density, focus, contrast, and visual hierarchy with a fresh-eyes judge.
- [ ] Verify weight gain and loss use the same neutral color treatment and completion uses text plus icon.
- [ ] Enable reduced motion and confirm chart/content remains understandable without animation.
- [ ] Corrupt only each new storage array in turn and verify unrelated profile, game, avatar, plan, and the other record array survive.
- [ ] Run final tests/build after any QA fixes and confirm `git status --short` contains only intentional changes.
- [ ] Commit verified QA corrections with `git commit -m "fix: polish progress records experience"` when corrections exist.

## Final Acceptance Criteria

- [ ] Users can safely create, edit, and delete one weight record per local day.
- [ ] The 28-day chart visually prioritizes a correctly calculated seven-day average and has an equivalent accessible table.
- [ ] Completion history, weekly rate, XP, and weight-day counts agree with persisted events and plan data.
- [ ] Insights are deterministic, evidence-labelled, data-limited, neutral, and never medical diagnosis.
- [ ] Existing version-1 users retain their profile, plan, game rewards, smoothie, and avatar after the upgrade.
- [ ] Today, Plan, and Record navigation and reload flows pass integration tests.
- [ ] Automated checks pass and actual browser QA confirms zero horizontal overflow at all required widths.
