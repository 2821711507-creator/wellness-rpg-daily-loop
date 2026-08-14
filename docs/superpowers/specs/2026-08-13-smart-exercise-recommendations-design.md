# Smart Exercise Recommendations: Design

## Problem

The exercise data expansion (previous spec) added `style`/`goalFit`/`metValue`
tags to every template, but nothing reads `goalFit` yet. `generateWeeklyPlan`
(`src/domain/weeklyPlan.ts`) always assigns the exact same template per
environment (`${environment}-basic`) regardless of the user's own goal, and
`TodayScreen`'s "다른 운동 선택" cycle (`next()`) rotates through an
environment's templates in raw array order with no goal awareness either.
Tagging work with no consumer was flagged as a real gap in the final review
of that prior feature.

Separately, direct user feedback surfaced a second, related problem: several
movements name gym equipment the user doesn't recognize at all ("케틀벨",
"로잉 머신", "바벨") — a plain-language description wouldn't fully fix this,
since the user doesn't have the vocabulary to parse a description that
itself uses equipment names. The real fix has two parts: (a) don't surface
equipment-heavy content to someone with no gym experience in the first
place, and (b) when equipment-heavy content is shown (to an experienced user,
or because no simpler option exists in the same environment), explain how to
actually use it in plain, step-by-step terms.

## Goals

1. **Goal-aware selection.** `generateWeeklyPlan`'s environment→template
   assignment prefers templates whose `goalFit` includes the user's own
   `profile.goal`, instead of always assigning the same fixed template per
   environment. (`TodayScreen`'s manual swap rotation stays environment-only
   — see the note under "Goal-aware selection" below for why.)
2. **Experience-aware selection.** A new onboarding question
   ("운동 기구를 사용해본 적 있으세요?") records whether the user has any
   gym-equipment experience. Beginners are steered toward templates that need
   little or no named equipment; experienced users see the full set.
3. **Plain-language usage guides for gym-equipment movements.** Every
   movement that names a specific piece of gym equipment gets a short,
   beginner-safe description plus a numbered step sequence, shown inline
   (not hidden behind a click) directly under that movement.

## Out of scope (deferred)

- Illustrated/drawn step diagrams — this pass uses simple numbered text
  steps (a pictogram-style numbered list), not custom artwork. The user
  explicitly said the visual treatment can be upgraded later without this
  being a blocker now.
- Usage guides for non-gym movements (walking, stretching, plain bodyweight
  moves like "벽 푸시업") — their names are already self-explanatory; adding
  guides there would be the bulk of the content-writing effort for the least
  benefit. ~19 distinct gym-equipment movement types get guides; everything
  else is unchanged.
- Any change to `weeklyTrainingGuidance.ts`'s hardcoded single week.
- Progression over time (harder exercises as the user's level increases) —
  same exclusion as the prior spec.

## 1. Goal-aware selection

New helper in `src/domain/activity.ts`:

```ts
export function pickBestTemplate(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate {
  const inEnvironment = all.filter(item => item.environment === environment)
  const goalMatches = goal ? inEnvironment.filter(item => item.goalFit.includes(goal)) : inEnvironment
  const pool = goalMatches.length > 0 ? goalMatches : inEnvironment
  if (beginnerFriendly) {
    const simple = pool.filter(item => item.equipment.length <= 1 && item.intensity !== 'hard')
    if (simple.length > 0) return simple[0]
  }
  return pool[0]
}
```

`goal`/`beginnerFriendly` are optional so every existing caller that doesn't
pass a profile keeps its exact current behavior: with no `goal`, `pool` is
just `inEnvironment`, and `pool[0]` is the environment's first array entry —
which is always `gym-basic`/`home-basic`/`walk-basic` per the append-only
ordering guarantee from the prior feature. This means `GenerateWeeklyPlanInput`
can add `profile` as an *optional* field (below) rather than updating every
one of the ~8 existing test call sites across the codebase that construct a
`GenerateWeeklyPlanInput` without one.

`beginnerFriendly` uses `equipment.length <= 1 && intensity !== 'hard'` as the
proxy for "won't overwhelm someone with zero gym experience" — not a new
manually-curated flag. This keeps `gym-basic` (one generic `헬스장 머신`
entry, `moderate`) selectable for a beginner who chose the gym environment,
while filtering out `gym-strength-fullbody` (바벨+랙, `hard`) and
`gym-hiit-circuit` (케틀벨+로잉 머신, `hard`). Falling back to `pool[0]` when
no beginner-friendly option exists in an environment means a beginner who
picks "gym" always gets *something* rather than an empty result — the
guide content (goal 3) is what makes that fallback safe to show.

**`generateWeeklyPlan`** (`src/domain/weeklyPlan.ts`) replaces its
`input.activityTemplates.find(item => item.id === \`${environment}-basic\`) ?? ...`
lookup with `pickBestTemplate(environment, input.activityTemplates, input.profile?.goal, input.profile?.exerciseExperience === 'beginner')`.
`GenerateWeeklyPlanInput` gains an **optional** `profile?: UserProfile` field
(currently the function receives no profile at all) — optional so the
existing test call sites that don't construct one keep working unchanged;
only `useWellnessGame.ts`'s real call site is updated to pass the signed-in
user's actual profile.

**`TodayScreen`'s `next()` stays environment-filtered only** (already
shipped), not goal-filtered. Reasoning found during planning: the current
activity a user is looking at was itself picked by the (now goal-aware)
generator, but a manual "다른 운동 선택" click is the user actively browsing
alternatives *within an environment they already chose* — narrowing that
browse list by goal as well risks silently hiding the very template the
plan just assigned (e.g. `gym-basic`'s `goalFit` is `['maintain','bulk']`,
so a `cut`-goal user's own assigned gym activity wouldn't even appear in its
own swap list). The automatic assignment is where "smart" belongs; manual
browsing stays a full, honest list of what's available in that environment.

## 2. Experience-aware onboarding

Add to `src/domain/profile.ts`:

```ts
export type ExerciseExperience = 'beginner' | 'experienced'
```

`UserProfile` gains `exerciseExperience: ExerciseExperience` (required, like
`goal`). `normalizeProfile` defaults missing/legacy values to `'beginner'`
— the safer default, since showing simpler content to someone who's
actually experienced costs them one extra tap ("다른 운동 선택"), while
showing equipment-heavy content to a true beginner is the exact problem
this feature exists to fix.

`Onboarding.tsx` gains one more `<select>`, placed next to the existing
활동량/목표 selects: "운동 기구를 사용해본 적 있으세요?" with options
`처음이에요` (beginner) / `네, 있어요` (experienced). Same pattern as the
existing `goal` select — plain `setProfile` update, no conditional fields.

## 3. Plain-language usage guides

New file `src/data/movementGuides.ts`:

```ts
export interface MovementGuide { description: string; steps: string[] }
export const movementGuides: Record<string, MovementGuide> = {
  'leg-press': { description: '등을 기대고 앉아 다리로 발판을 밀어내는 머신이에요.', steps: ['등을 기대고 앉아요', '두 발로 발판을 천천히 밀어요', '무릎을 다 펴지 않고 천천히 되돌아와요'] },
  // ...and one entry each for the other ~18 distinct gym-equipment movement
  // types used across activityTemplates.ts (체스트 프레스, 시티드 로우, 레그
  // 컬, 숄더 프레스, 랫 풀다운, 바이셉 컬, 트라이셉 푸시다운, 레그 익스텐션,
  // 글루트 브리지/힙 스러스트, 카프 레이즈, 바벨 스쿼트, 벤치 프레스, 바벨
  // 로우, 오버헤드 프레스, 케틀벨 스윙, 로잉 머신, 스텝밀, 실내 사이클).
}
```

`ActivityTemplate.movements` changes from `string[]` to
`{ label: string; guideId?: string }[]` — every existing movement string
becomes `{ label: '<same text>' }`, and the ~19 distinct gym-equipment
movement types across the data additionally get a `guideId` pointing into
`movementGuides`. This is a mechanical, one-time transform of the existing
data (no wording changes to `label`); the guide content is new.

`ActivityCard.tsx` renders each movement's guide inline when present, right
under that movement's `<li>` — not behind a `<details>` toggle, matching the
explicit "숨겨진 버튼 안 누르고 바로 보이게" requirement:

```tsx
<li>{item.label}{item.guideId && movementGuides[item.guideId] && <ol className="movement-guide">{movementGuides[item.guideId].steps.map((step, i) => <li key={i}><span className="step-badge">{i+1}</span>{step}</li>)}</ol>}</li>
```

(The guide's own `description` renders as a leading line above the numbered
`<ol>` — omitted from the snippet above for brevity, included in the
implementation plan's exact code.)

## Testing

- `src/domain/activity.test.ts`: `pickBestTemplate` — goal match found in
  environment, goal match not found (falls back to environment-only),
  beginner filter excludes `hard`/multi-equipment templates, beginner
  fallback when no simple option exists in an environment, experienced
  users see the unfiltered pool.
- `src/domain/profile.test.ts`: `normalizeProfile` defaults missing
  `exerciseExperience` to `'beginner'`.
- `src/domain/weeklyPlan.test.ts`: `generateWeeklyPlan` accepts an optional
  `profile` and assigns per goal/experience when one is given, falling back
  to its exact previous `${environment}-basic` behavior when it's omitted
  (existing tests need no changes) — add new tests proving a `bulk`-goal
  profile gets a different gym template than a `cut`-goal profile when both
  fit, and a `beginner`-experience profile gets the equipment-light option.
- `src/components/TodayScreen.test.tsx`: unchanged (goal filtering doesn't
  reach the swap rotation — see the "Goal-aware selection" note above).
- `src/components/Onboarding.test.tsx`: new select renders and updates
  `profile.exerciseExperience`.
- `src/components/ActivityCard.test.tsx`: a movement with a `guideId` shows
  its description and numbered steps inline (not requiring a click); a
  movement without one renders exactly as before.
- `src/data/activityTemplates.test.ts`: extend the "unchanged" pin for the
  3 basic templates to account for the `movements` shape change (still
  string content, now nested under `.label`).
