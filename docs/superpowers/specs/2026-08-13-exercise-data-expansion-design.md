# Exercise Data Expansion: Design

## Problem

`src/data/activityTemplates.ts` has 8 activity templates total, and half of them
(`approvedWeekTemplates`) are only ever returned by
`createApprovedTrainingWeek()` when `weekStart === '2026-08-10'` — a one-off,
hardcoded week, not general data. The 3 real rotation templates
(`gym-basic`, `home-basic`, `walk-basic`) cover one environment each with no
sense of exercise style, goal fit, or energy cost.

This mirrors where the nutrition engine was before its rewrite: thin,
hardcoded, no scientific grounding. The goal here is the same kind of pass —
build out real, tagged, cited exercise data — as groundwork for a future
personalized weekly-plan generator (not built in this pass; see Out of Scope).

## Goals

1. Expand `activityTemplates` into a real library organized by **exercise
   style** (cardio / strength / flexibility / HIIT), each tagged with which
   **goal** (cut / maintain / bulk) it fits and which **equipment tier**
   (gym machines / home equipment / bodyweight-only) it needs.
2. Give every template a real **MET value** (Metabolic Equivalent of Task) so
   the app can compute an actual estimated calorie burn from the user's own
   weight, the same way the nutrition engine computes a real BMR from the
   user's own body stats instead of a flat number.
3. Surface that estimated burn on the activity card, with an evidence
   disclosure (mirroring `EvidenceSheet`) citing where the MET values and
   activity guidance come from.

## Out of scope (deferred)

- A generator that automatically assembles a personalized weekly exercise
  plan from this data (goal + equipment + progression). This pass only
  builds the tagged data it would consume.
- `src/domain/weeklyTrainingGuidance.ts` and its hardcoded single-week
  content are untouched.
- Progression/difficulty leveling (beginner → advanced) within a style.

## Data model

Extend `ActivityTemplate` (`src/domain/activity.ts`):

```ts
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'

export interface ActivityTemplate {
  id: string
  environment: ActivityEnvironment   // existing: 'gym' | 'home' | 'walk' — doubles as the equipment tier
  style: ActivityStyle               // new
  goalFit: Goal[]                    // new — from src/domain/profile.ts's existing Goal type
  metValue: number                   // new — Compendium of Physical Activities code's MET value
  title: string
  minutes: number
  intensity: 'easy' | 'moderate' | 'hard'  // 'hard' is new — HIIT needs a level above 'moderate'
  movements: string[]
  equipment: string[]
  safetyNote: string
}
```

### How the new templates reach the user (and what doesn't change)

Traced every current consumer of `activityTemplates` before deciding what to
touch:

- **`gym-basic`/`home-basic`/`walk-basic` are load-bearing IDs**, not just
  naming convention: `generateWeeklyPlan` (`weeklyPlan.ts`) always assigns
  exactly `${environment}-basic` for every planned slot,
  `defaultWellnessState` (`useWellnessGame.ts`) hardcodes
  `selectedActivityId: 'walk-basic'`, and `normalizeWeeklyPlan`'s
  unknown-template fallback hardcodes `'walk-basic'`. These 3 IDs and their
  `environment` stay exactly as they are — only their new fields
  (`style`/`goalFit`/`metValue`) get filled in. This is also why the
  auto-generated weekly plan and the "운동 교체" swap dialog
  (`PlanItemActions.tsx`, which filters `id.endsWith('-basic')`) are
  unaffected by this pass: they only ever surface these 3 templates today,
  and continue to.
- **The Today screen's "다른 운동 선택" button already cycles through every
  template** (`activityTemplates[(index + 1) % length]` in
  `TodayScreen.tsx`), regardless of id. This is the one existing path where
  every newly added template becomes reachable today, without touching the
  generator or the swap dialog.
- The 5 `approvedWeekTemplates` (`gym-upper`, `gym-lower-core`,
  `mixed-hiit-completed`, `recovery-cardio`, `light-cardio-conditional`) are
  referenced by id string from `weeklyTrainingGuidance.ts` and its test.
  Since that file is out of scope, these 5 keep their ids and content;
  new templates are added alongside them, not in place of them.

One small adjacent fix: **`intensity` is binary today.**
`PlanItemActions.tsx`'s swap dialog reads
`template.intensity === 'easy' ? '가볍게' : '보통 강도'`. It can't currently
be reached with a `'hard'` template today (that dialog only shows the 3
`-basic` entries, none of which become `'hard'`), but adding a third
`intensity` value while leaving the label mapping binary is a latent bug
waiting for the next thing that touches this dialog. Fixed alongside this
change since it's a one-line, zero-risk 3-way mapping (`가볍게` / `보통 강도`
/ `고강도`).

`environment` continues to double as the equipment tier the user picked
(gym-machine access / home-equipment / bodyweight-only) — no new field, per
the earlier decision to reuse it rather than add a separate equipment axis.

## Calorie estimate

New pure function in `src/domain/activity.ts`:

```ts
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
```

Standard MET formula: `kcal = MET × weight(kg) × duration(hours)`.

## Evidence

Reuse the existing `Evidence` shape (`{ title, publisher, version, url }`,
currently defined in `src/domain/nutrition.ts`). Two citations, addressing
the earlier "too few / too US-specific" feedback with a genuinely
international second source:

1. **Compendium of Physical Activities** (Ainsworth et al.) — the specific
   source of every `metValue`. This is the standard the exercise-science
   field itself uses to make MET values comparable across studies; WHO's own
   guidelines are anchored to it, so it isn't a national guideline, it's the
   underlying measurement reference.
2. **WHO 2020 Guidelines on Physical Activity and Sedentary Behaviour** — a
   true international body (not a national health agency), used for the
   general safety/recommendation framing shown alongside the estimate.

A new `ActivityEvidenceSheet` component (same `<details>` pattern as
`EvidenceSheet`) renders both, linked from `ActivityCard`.

## UI change

`ActivityCard` gains the estimated burn next to the existing duration badge,
e.g. "30분 · 약 210 kcal", computed from the signed-in profile's `weightKg`.
The evidence disclosure sits below the safety note, collapsed by default —
consistent with how `TodayScreen`'s nutrition target strip already works.
`ActivityCard` currently takes no profile data at all (just `activity`,
`onComplete`, `onSwap`), so it gains a `weightKg: number` prop, passed down
from `TodayScreen`'s existing `state.profile` (already guaranteed non-null
by the time `TodayScreen` renders — `App.tsx` only renders it after
onboarding).

## Data to add

Organized by style (not every style × environment combination is realistic —
e.g. no walk-based strength template):

| Style | gym | home | walk |
|---|---|---|---|
| cardio | 2–3 | 1–2 | 1–2 |
| strength | 2–3 (upper/lower/full) | 2 (bodyweight) | — |
| flexibility | 1 (mat/stretch) | 1–2 | — |
| hiit | 1–2 | 1–2 | — |

Roughly 10–14 *new* templates, added alongside the existing 8 (which keep
their ids and content — see above), each with a `goalFit` covering at least
one of `cut`/`maintain`/`bulk` (strength templates skew toward
`bulk`/`maintain`; higher-MET cardio/HIIT skew toward `cut`). All 8 existing
templates also get the new `style`/`goalFit`/`metValue` fields filled in, so
every template in the array — old and new — is tagged consistently.

## Testing

- `src/domain/activity.test.ts`: `estimateActivityCalories` — known MET ×
  weight × duration cases, rounding behavior.
- `src/data/activityTemplates.test.ts` (new): every template has a
  `metValue > 0`, a non-empty `goalFit`, and `id`s stay unique — a data
  sanity check, not a values-correctness check (MET values themselves are
  looked up from the source, not computed, so nothing to unit-test there
  beyond "did I typo the field").
- `ActivityCard.test.tsx` (new — this component has no test today): renders
  the estimated-kcal text for a given `weightKg`.
- `ActivityEvidenceSheet.test.tsx` (new): renders both citations with working
  links.
- `PlanItemActions.test.tsx`: extend for the 3-way intensity label mapping.
