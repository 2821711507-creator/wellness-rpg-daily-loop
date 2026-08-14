# Smart Exercise Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make exercise assignment goal-aware (uses `profile.goal`/`goalFit`, which the data already carries but nothing reads), add an experience-aware onboarding question so beginners get equipment-light recommendations, and show plain-language, always-visible usage guides for gym-equipment movements.

**Architecture:** Extend `UserProfile` with `exerciseExperience`. Add `getRotationCandidates`/`pickBestTemplate` to `src/domain/activity.ts` — goal/experience-aware selection logic consumed only by `generateWeeklyPlan` (via an optional `profile` field, so every existing caller that omits it keeps its exact old behavior). Change `ActivityTemplate.movements` from `string[]` to `{label, guideId?}[]`, add a `movementGuides` lookup keyed by guide id, and render guides inline in `ActivityCard`.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library (existing stack — no new dependencies).

## Global Constraints

- Every step is TDD: write the failing test, run it, watch it fail for the right reason, implement, run again, watch it pass.
- `generateWeeklyPlan`'s new `profile` field on `GenerateWeeklyPlanInput` is **optional**. Every existing test call site across the codebase (`weeklyPlan.test.ts`, `weeklyTrainingGuidance.test.ts`, `WeeklyPlanScreen.test.tsx`, `RecordsScreen.test.tsx`, `records.test.ts`, `weeklyPlanValidation.test.ts`, `TodayScreen.test.tsx`) constructs a `GenerateWeeklyPlanInput` without a `profile` and must keep passing unmodified. `pickBestTemplate`'s `goal`/`beginnerFriendly` parameters are likewise optional, defaulting to "no filtering," which reproduces the exact previous `${environment}-basic`-equivalent result (the first array entry for that environment) when omitted.
- `TodayScreen`'s "다른 운동 선택" (`next()`) is **not** touched by this plan — it stays environment-filtered only (already shipped). Do not add goal filtering there; a `cut`-goal user's own assigned `gym-basic` activity (`goalFit: ['maintain','bulk']`) would otherwise not appear in its own swap list.
- Movement usage guides apply only to the ~18 distinct gym-equipment movement types enumerated in Task 3 — not to walking/stretching/plain bodyweight movements.
- No Edge Functions, no Supabase/migration changes.
- Do not touch `src/domain/weeklyTrainingGuidance.ts` or its hardcoded single week.

---

### Task 1: `exerciseExperience` on `UserProfile`

**Files:**
- Modify: `src/domain/profile.ts`
- Modify: `src/domain/profile.test.ts`

**Interfaces:**
- Produces: `ExerciseExperience` (`'beginner'|'experienced'`), `UserProfile.exerciseExperience: ExerciseExperience` (required on the type; `normalizeProfile` defaults legacy/missing values to `'beginner'`). Task 2 (`Onboarding.tsx`) sets this field; Task 4 (`weeklyPlan.ts`) reads it.

- [ ] **Step 1: Write the failing test**

Add to `src/domain/profile.test.ts`, inside the existing `describe('normalizeProfile', ...)` block (after the `'keeps an explicit non-cut goal...'` test, before the `'passes null through...'` test):

```ts
  it('defaults a legacy profile with no exerciseExperience to beginner', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'beginner' })
  })

  it('keeps an explicit exerciseExperience of experienced', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'experienced' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'experienced' })
  })
```

Also update the two pre-existing tests in that `describe` block to expect `exerciseExperience: 'beginner'` in their results (since `normalizeProfile` will now always fill it in):

```ts
  it('defaults a legacy profile with no goal to cut/mild', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })
  })

  it('keeps an explicit non-cut goal without inventing a cutIntensity', () => {
    const result = normalizeProfile({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk' })
    expect(result).toEqual({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'beginner' })
  })
```

`UserProfile` is becoming a required-field type change, so every literal in this file typed as (or passed as) `UserProfile` needs the new field too, or `npm run build` fails. Also update the two `validateProfile` tests in the `describe('validateProfile', ...)` block above — find this exact substring:

```ts
    expect(() => validateProfile({ age: 17, heightCm: 170, weightKg: 70, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild' })).toThrow('성인 사용자만')
    expect(() => validateProfile({ age: 30, heightCm: 0, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild' })).toThrow('키와 체중')
```

Replace it with:

```ts
    expect(() => validateProfile({ age: 17, heightCm: 170, weightKg: 70, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })).toThrow('성인 사용자만')
    expect(() => validateProfile({ age: 30, heightCm: 0, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })).toThrow('키와 체중')
```

- [ ] **Step 2: Run the test file and confirm it fails**

Run: `npx vitest run src/domain/profile.test.ts`
Expected: FAIL — the two updated tests get `exerciseExperience: undefined` (missing from the actual result) where `'beginner'` is expected, and the two new tests fail because `normalizeProfile` doesn't set/preserve the field at all yet.

- [ ] **Step 3: Implement**

Replace the full contents of `src/domain/profile.ts` with:

```ts
export type CalculationSex = 'female' | 'male'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'veryActive'
export type Goal = 'cut' | 'maintain' | 'bulk'
export type CutIntensity = 'mild' | 'aggressive'
export type ExerciseExperience = 'beginner' | 'experienced'

export interface UserProfile { age: number; heightCm: number; weightKg: number; calculationSex: CalculationSex; activityLevel: ActivityLevel; goal: Goal; cutIntensity?: CutIntensity; exerciseExperience: ExerciseExperience }

export function validateProfile(profile: UserProfile): UserProfile {
  if (profile.age < 18) throw new Error('성인 사용자만 자동 계산을 사용할 수 있습니다.')
  if (profile.heightCm <= 0 || profile.weightKg <= 0) throw new Error('키와 체중을 올바르게 입력해 주세요.')
  return profile
}

type LegacyOrCurrentProfile = Omit<UserProfile, 'goal' | 'cutIntensity' | 'exerciseExperience'> & Partial<Pick<UserProfile, 'goal' | 'cutIntensity' | 'exerciseExperience'>>

export function normalizeProfile(value: LegacyOrCurrentProfile | null): UserProfile | null {
  if (value === null) return null
  const goal: Goal = value.goal ?? 'cut'
  const exerciseExperience: ExerciseExperience = value.exerciseExperience ?? 'beginner'
  return { ...value, goal, exerciseExperience, ...(goal === 'cut' ? { cutIntensity: value.cutIntensity ?? 'mild' } : {}) }
}
```

- [ ] **Step 4: Run the test file and confirm it passes**

Run: `npx vitest run src/domain/profile.test.ts`
Expected: PASS — all 6 tests (2 pre-existing updated + 2 new + `validateProfile`'s 1 + the `null`-passthrough test).

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: **Some failures expected and OK at this point** — any test file that constructs a literal `UserProfile` object (e.g. `App.test.tsx`, `TodayScreen.test.tsx`, `Onboarding.test.tsx`, `useWellnessGame.test.tsx`) will now be missing the newly-required `exerciseExperience` field on that TypeScript type, but since Vitest doesn't type-check (only `tsc -b` does), these will only fail if the missing field is actually read at runtime — which nothing does yet in this task. Confirm via `npm run build` instead:

Run: `npm run build`
Expected: **FAILS** with `tsc` errors listing every `UserProfile` object literal missing `exerciseExperience` (e.g. in `App.test.tsx`, `Onboarding.tsx`'s own initial state, `TodayScreen.test.tsx`). This is expected and matches how the prior exercise-data-expansion plan's Task 1 also left the build red until Task 2 landed the data — Task 2 (next) adds the field everywhere it's missing. Do not attempt to fix these call sites in this task.

- [ ] **Step 6: Commit**

```bash
git add src/domain/profile.ts src/domain/profile.test.ts
git commit -m "feat: add exerciseExperience to UserProfile"
```

---

### Task 2: Onboarding question for exercise experience

**Files:**
- Modify: `src/components/Onboarding.tsx`
- Modify: `src/components/Onboarding.test.tsx`
- Modify: `src/components/TodayScreen.test.tsx` (fixture only — see Step 5)
- Modify: `src/App.test.tsx` (fixture only — see Step 5)
- Modify: `src/hooks/useWellnessGame.test.tsx` (fixture only — see Step 5)

**Interfaces:**
- Consumes: `UserProfile.exerciseExperience` (Task 1).
- Produces: nothing new consumed by later tasks — this task only makes the build compile again by supplying `exerciseExperience` everywhere a `UserProfile` literal is constructed, and lets a real user set the value through the UI.

- [ ] **Step 1: Write the failing test**

Add to `src/components/Onboarding.test.tsx`, as a new test in the existing `describe('Onboarding', ...)` block:

```ts
  it('defaults exercise experience to beginner and lets it be changed to experienced', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete}/>)
    expect(screen.getByLabelText('운동 기구를 사용해본 적 있으세요?')).toHaveValue('beginner')
    await userEvent.selectOptions(screen.getByLabelText('운동 기구를 사용해본 적 있으세요?'), '네, 있어요')
    await userEvent.click(screen.getByRole('button', { name:'시작하기' }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ exerciseExperience:'experienced' }))
  })
```

- [ ] **Step 2: Run the test file and confirm it fails**

Run: `npx vitest run src/components/Onboarding.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: 운동 기구를 사용해본 적 있으세요?` (the select doesn't exist yet).

- [ ] **Step 3: Add the select to `Onboarding.tsx`**

In `src/components/Onboarding.tsx`, find this exact substring:

```
export function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>({ age: 30, heightCm: 170, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild' })
```

Replace it with:

```
export function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile>({ age: 30, heightCm: 170, weightKg: 70, calculationSex: 'female', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'beginner' })
```

Then find this exact substring (the goal select, immediately followed by the conditional cut-intensity select and the submit button):

```
<label>목표<select value={profile.goal} onChange={setGoal}><option value="cut">감량</option><option value="maintain">유지</option><option value="bulk">증량</option></select></label>{profile.goal === 'cut' && <label>감량 강도<select value={profile.cutIntensity} onChange={e => setProfile({ ...profile, cutIntensity: e.target.value as NonNullable<UserProfile['cutIntensity']> })}><option value="mild">완만함</option><option value="aggressive">공격적</option></select></label>}<button type="submit">시작하기</button>
```

Replace it with:

```
<label>목표<select value={profile.goal} onChange={setGoal}><option value="cut">감량</option><option value="maintain">유지</option><option value="bulk">증량</option></select></label>{profile.goal === 'cut' && <label>감량 강도<select value={profile.cutIntensity} onChange={e => setProfile({ ...profile, cutIntensity: e.target.value as NonNullable<UserProfile['cutIntensity']> })}><option value="mild">완만함</option><option value="aggressive">공격적</option></select></label>}<label>운동 기구를 사용해본 적 있으세요?<select value={profile.exerciseExperience} onChange={e => setProfile({ ...profile, exerciseExperience: e.target.value as UserProfile['exerciseExperience'] })}><option value="beginner">처음이에요</option><option value="experienced">네, 있어요</option></select></label><button type="submit">시작하기</button>
```

- [ ] **Step 4: Run the test file and confirm it passes**

Run: `npx vitest run src/components/Onboarding.test.tsx`
Expected: PASS — all 4 tests (3 pre-existing + 1 new).

- [ ] **Step 5: Fix every other `UserProfile` literal so the build compiles**

`UserProfile.exerciseExperience` is now a required field (Task 1), so every
object literal in the codebase that is typed as, or passed as an argument
to a function parameter typed as, `UserProfile` needs it added, or
`npm run build` fails with a `tsc` error at that literal. This was verified
exhaustively before writing this plan (`grep -rn "calculationSex:" src`) —
the complete list, beyond `Onboarding.tsx` (Step 3) and the two files fixed
in Step 3/4 of Task 1 (`profile.test.ts`), is:

In `src/App.test.tsx`, find:
```
const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild' }
```
Replace with:
```
const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild', exerciseExperience:'experienced' }
```

In `src/components/TodayScreen.test.tsx`, find:
```
const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild' }
```
Replace with:
```
const PROFILE: UserProfile = { age:30, heightCm:170, weightKg:65, calculationSex:'female', activityLevel:'light', goal:'cut', cutIntensity:'mild', exerciseExperience:'experienced' }
```

In `src/domain/nutrition.test.ts`, all 6 calls pass a `UserProfile` literal
directly to `calculateNutritionTarget(input: UserProfile)`. Find each of
these exact substrings and replace with the paired replacement (only the
added trailing field differs from the original):

```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild' })
```
→
```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'mild', exerciseExperience: 'experienced' })
```

```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'veryActive', goal: 'maintain' })
```
→
```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'veryActive', goal: 'maintain', exerciseExperience: 'experienced' })
```

```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'moderate', goal: 'bulk' })
```
→
```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'moderate', goal: 'bulk', exerciseExperience: 'experienced' })
```

```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'aggressive' })
```
→
```
    const result = calculateNutritionTarget({ age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
```

This exact substring appears twice more, with different `age`/`heightCm`/`weightKg`:

```
    const result = calculateNutritionTarget({ age: 60, heightCm: 150, weightKg: 45, calculationSex: 'female', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive' })
```
→
```
    const result = calculateNutritionTarget({ age: 60, heightCm: 150, weightKg: 45, calculationSex: 'female', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
```

```
    const result = calculateNutritionTarget({ age: 80, heightCm: 140, weightKg: 300, calculationSex: 'male', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive' })
```
→
```
    const result = calculateNutritionTarget({ age: 80, heightCm: 140, weightKg: 300, calculationSex: 'male', activityLevel: 'sedentary', goal: 'cut', cutIntensity: 'aggressive', exerciseExperience: 'experienced' })
```

In `src/hooks/useWellnessGame.test.tsx`, the test `'defaults a legacy profile
with no goal to cut/mild on restore'` deliberately constructs its *input*
fixture with `as unknown as WellnessState` — that cast intentionally bypasses
the type check to simulate old, pre-this-feature stored data, so **do not**
add `exerciseExperience` to that input literal. Its *expected output*
assertion, however, is a plain runtime equality check that will now fail
(not a compile error) because `normalizeProfile` fills in the new default.
Find this exact substring:

```
    expect(result.current.state.profile).toEqual({ age:30, heightCm:175, weightKg:80, calculationSex:'male', activityLevel:'light', goal:'cut', cutIntensity:'mild' })
```

Replace it with:

```
    expect(result.current.state.profile).toEqual({ age:30, heightCm:175, weightKg:80, calculationSex:'male', activityLevel:'light', goal:'cut', cutIntensity:'mild', exerciseExperience:'beginner' })
```

- [ ] **Step 6: Run the build and confirm it succeeds**

Run: `npm run build`
Expected: succeeds with no `tsc` errors. If it still reports a missing
`exerciseExperience` somewhere not listed above, apply the identical fix
(add `exerciseExperience: 'experienced'` to that literal, or `'beginner'`
if it's an *expected normalizeProfile output* like the `useWellnessGame.test.tsx`
case above) and re-run until clean — every other location was verified
exhaustively before this plan was written, so this should not happen.

- [ ] **Step 7: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — every test, with 1 new test compared to before this task (Onboarding gained one test; Task 1's 2 net-new profile tests were already counted in Task 1's own verification).

- [ ] **Step 8: Commit**

```bash
git add src/components/Onboarding.tsx src/components/Onboarding.test.tsx src/App.test.tsx src/components/TodayScreen.test.tsx src/domain/nutrition.test.ts src/hooks/useWellnessGame.test.tsx
git commit -m "feat: add exercise-experience question to onboarding"
```

---

### Task 3: Movement usage guides for gym-equipment movements

**Files:**
- Create: `src/data/movementGuides.ts`
- Create: `src/data/movementGuides.test.ts`
- Modify: `src/domain/activity.ts`
- Modify: `src/domain/activity.test.ts`
- Modify: `src/data/activityTemplates.ts`
- Modify: `src/data/activityTemplates.test.ts`
- Modify: `src/components/ActivityCard.tsx`
- Modify: `src/components/ActivityCard.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `MovementGuide` (`{description: string; steps: string[]}`), `movementGuides: Record<string, MovementGuide>` (18 entries, ids listed in Step 1). `ActivityTemplate.movements` changes from `string[]` to `{label: string; guideId?: string}[]`. Task 4 does not touch `movements` or `movementGuides` at all — no interface overlap.

- [ ] **Step 1: Write the failing test for `movementGuides`**

Create `src/data/movementGuides.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { movementGuides } from './movementGuides'

const EXPECTED_IDS = ['leg-press', 'chest-press', 'seated-row', 'leg-curl', 'shoulder-press', 'lat-pulldown', 'bicep-curl', 'tricep-pushdown', 'leg-extension', 'calf-raise', 'barbell-squat', 'bench-press', 'barbell-row', 'overhead-press', 'kettlebell-swing', 'rowing-machine', 'stair-mill', 'stationary-bike']

describe('movementGuides', () => {
  it('has exactly the expected gym-equipment movement ids', () => {
    expect(Object.keys(movementGuides).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('gives every guide a real description and at least 2 steps', () => {
    for (const id of EXPECTED_IDS) {
      expect(movementGuides[id].description.length).toBeGreaterThan(0)
      expect(movementGuides[id].steps.length).toBeGreaterThanOrEqual(2)
      for (const step of movementGuides[id].steps) expect(step.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/data/movementGuides.test.ts`
Expected: FAIL — `Failed to resolve import "./movementGuides"` (the file doesn't exist yet).

- [ ] **Step 3: Create `movementGuides.ts`**

Create `src/data/movementGuides.ts`:

```ts
export interface MovementGuide { description: string; steps: string[] }

export const movementGuides: Record<string, MovementGuide> = {
  'leg-press': { description: '등을 기대고 앉아 다리로 발판을 밀어내는 머신이에요.', steps: ['등을 기대고 앉아요', '두 발로 발판을 천천히 밀어요', '무릎을 다 펴지 않고 천천히 되돌아와요'] },
  'chest-press': { description: '앉아서 손잡이를 앞으로 미는 가슴 운동 머신이에요.', steps: ['등을 기대고 앉아 손잡이를 잡아요', '숨을 내쉬며 앞으로 밀어요', '천천히 제자리로 돌아와요'] },
  'seated-row': { description: '앉아서 손잡이를 몸 쪽으로 당기는 등 운동 머신이에요.', steps: ['발판에 발을 대고 손잡이를 잡아요', '팔꿈치를 몸 뒤로 당겨요', '천천히 팔을 펴며 되돌아와요'] },
  'leg-curl': { description: '엎드리거나 앉아서 다리를 구부리는 뒷허벅지 운동 머신이에요.', steps: ['패드에 다리를 걸쳐요', '무릎을 구부려 발을 엉덩이 쪽으로 당겨요', '천천히 다리를 펴며 되돌아와요'] },
  'shoulder-press': { description: '앉아서 손잡이를 머리 위로 미는 어깨 운동 머신이에요.', steps: ['손잡이를 어깨 높이에서 잡아요', '팔을 머리 위로 곧게 밀어요', '천천히 어깨 높이로 되돌아와요'] },
  'lat-pulldown': { description: '위쪽 바를 아래로 당기는 등 운동 머신이에요.', steps: ['의자에 앉아 바를 넓게 잡아요', '바를 가슴 쪽으로 당겨요', '천천히 팔을 펴며 되돌아와요'] },
  'bicep-curl': { description: '팔꿈치를 구부려 무게를 들어 올리는 팔 운동이에요.', steps: ['양손에 무게를 들고 팔을 펴요', '팔꿈치를 구부려 어깨 쪽으로 들어요', '천천히 팔을 펴며 되돌아와요'] },
  'tricep-pushdown': { description: '케이블 바를 아래로 미는 팔 뒤쪽 운동이에요.', steps: ['바를 가슴 높이에서 잡아요', '팔꿈치를 고정한 채 바를 아래로 밀어요', '천천히 되돌아와요'] },
  'leg-extension': { description: '앉아서 다리를 펴는 앞허벅지 운동 머신이에요.', steps: ['패드에 발목을 걸쳐요', '무릎을 펴며 다리를 들어올려요', '천천히 다리를 구부리며 되돌아와요'] },
  'calf-raise': { description: '발끝으로 서서 종아리를 들어 올리는 운동이에요.', steps: ['발판에 발끝을 올려요', '뒤꿈치를 최대한 들어 올려요', '천천히 뒤꿈치를 내려요'] },
  'barbell-squat': { description: '봉(바벨)을 어깨에 메고 앉았다 일어나는 운동이에요.', steps: ['바벨을 어깨 뒤쪽에 올려요', '엉덩이를 뒤로 빼며 앉아요', '다리 힘으로 천천히 일어나요'] },
  'bench-press': { description: '누워서 봉을 가슴 위로 미는 가슴 운동이에요.', steps: ['벤치에 누워 바벨을 잡아요', '바벨을 가슴 쪽으로 천천히 내려요', '가슴 힘으로 다시 밀어 올려요'] },
  'barbell-row': { description: '상체를 숙이고 봉을 몸 쪽으로 당기는 등 운동이에요.', steps: ['무릎을 살짝 굽히고 상체를 숙여요', '바벨을 배 쪽으로 당겨요', '천천히 팔을 펴며 되돌아와요'] },
  'overhead-press': { description: '봉이나 덤벨을 머리 위로 미는 어깨 운동이에요.', steps: ['무게를 어깨 높이에서 잡아요', '팔을 머리 위로 곧게 밀어요', '천천히 어깨 높이로 되돌아와요'] },
  'kettlebell-swing': { description: '손잡이 달린 무게(케틀벨)를 다리 사이로 흔들었다 앞으로 올리는 운동이에요.', steps: ['두 손으로 케틀벨을 잡아요', '다리 사이로 살짝 내려요', '엉덩이 힘으로 앞으로 밀어 올려요'] },
  'rowing-machine': { description: '손잡이를 당기고 미는 전신 유산소 머신이에요.', steps: ['발판에 발을 고정하고 손잡이를 잡아요', '다리를 밀며 손잡이를 몸 쪽으로 당겨요', '팔을 펴고 다리를 굽히며 되돌아와요'] },
  'stair-mill': { description: '계단을 계속 오르는 유산소 머신이에요.', steps: ['손잡이를 가볍게 잡아요', '한 발씩 계단을 밟고 올라가요', '일정한 속도를 유지해요'] },
  'stationary-bike': { description: '제자리에서 페달을 밟는 자전거 운동이에요.', steps: ['안장에 앉아 발을 페달에 올려요', '일정한 속도로 페달을 밟아요', '숨을 편하게 쉬며 유지해요'] },
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/data/movementGuides.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the `movements` shape change**

Replace the full contents of `src/domain/activity.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { estimateActivityCalories, getAlternatives } from './activity'
import { activityTemplates } from '../data/activityTemplates'

describe('activity templates', () => {
  it('keeps templates honest about their environment', () => {
    expect(activityTemplates.find(item => item.environment === 'gym')?.movements.every(item => item.label.includes('머신'))).toBe(true)
    expect(activityTemplates.find(item => item.environment === 'home')?.equipment).toEqual([])
  })
  it('offers home and walk alternatives', () => {
    const gym = activityTemplates.find(item => item.environment === 'gym')!
    expect(getAlternatives(gym, activityTemplates).map(item => item.environment)).toEqual(['home', 'walk'])
  })
})

describe('estimateActivityCalories', () => {
  const base = { id: 'x', environment: 'home' as const, style: 'cardio' as const, goalFit: ['cut' as const], intensity: 'moderate' as const, movements: [], equipment: [], safetyNote: '' }

  it('computes MET × weight(kg) × duration(hours), rounded', () => {
    expect(estimateActivityCalories({ ...base, title: 't', minutes: 30, metValue: 5 }, 70)).toBe(175)
  })

  it('rounds to the nearest whole calorie', () => {
    // 3.5 * 68 * (35/60) = 138.8333...
    expect(estimateActivityCalories({ ...base, title: 't', minutes: 35, metValue: 3.5 }, 68)).toBe(139)
  })

  it('scales linearly with duration', () => {
    const perMinute = estimateActivityCalories({ ...base, title: 't', minutes: 60, metValue: 4 }, 70)
    const half = estimateActivityCalories({ ...base, title: 't', minutes: 30, metValue: 4 }, 70)
    expect(half).toBe(Math.round(perMinute / 2))
  })
})
```

(The only change from the current file: `item.includes('머신')` → `item.label.includes('머신')` in the first test. Everything else is unchanged.)

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: FAIL — `TypeError: item.label.includes is not a function` (or similar), since `activity.ts`'s type hasn't changed yet and `activityTemplates.ts`'s data still has `movements` as `string[]`.

- [ ] **Step 7: Update the type in `activity.ts`**

Replace the full contents of `src/domain/activity.ts` with:

```ts
export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'
export interface ActivityMovement { label: string; guideId?: string }
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; style: ActivityStyle; goalFit: ('cut'|'maintain'|'bulk')[]; metValue: number; title: string; minutes: number; intensity: 'easy'|'moderate'|'hard'; movements: ActivityMovement[]; equipment: string[]; safetyNote: string }

export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}

/** Standard MET formula: kcal = MET × weight(kg) × duration(hours). See
 * `ActivityEvidenceSheet` for the cited source of `metValue`. */
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
```

Note: `movements: []` in the `activity.test.ts` fixture's `base` object (Step 5) already satisfies `ActivityMovement[]` with zero elements, so that file needs no further changes beyond what Step 5 already wrote.

- [ ] **Step 8: Run `activity.test.ts` again — still expected to fail**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: FAIL — same error as Step 6. The type changed but `activityTemplates.ts`'s actual data (Step 9) still has `movements` as plain strings at runtime, so `item.label` is still `undefined` on real data.

- [ ] **Step 9: Transform `activityTemplates.ts`'s data**

Replace the full contents of `src/data/activityTemplates.ts` with:

```ts
import type { ActivityTemplate } from '../domain/activity'

const safetyNote = '날카로운 통증이나 이상 증상이 있으면 중단하세요.'

const basicTemplates:ActivityTemplate[] = [
  { id:'gym-basic', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:3.5, title:'머신 전신 탐험', minutes:35, intensity:'moderate', movements:[{label:'레그 프레스 머신 2×8–12',guideId:'leg-press'}, {label:'체스트 프레스 머신 2×8–12',guideId:'chest-press'}, {label:'시티드 로우 머신 2×8–12',guideId:'seated-row'}, {label:'레그 컬 머신 2×8–12',guideId:'leg-curl'}, {label:'숄더 프레스 머신 2×8–12',guideId:'shoulder-press'}], equipment:['헬스장 머신'], safetyNote },
  { id:'home-basic', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'집에서 기본 루프', minutes:20, intensity:'easy', movements:[{label:'의자 스쿼트 2×8–12'}, {label:'벽 푸시업 2×8–12'}, {label:'글루트 브리지 2×8–12'}, {label:'버드독 2×8–12'}], equipment:[], safetyNote },
  { id:'walk-basic', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.3, title:'동네 산보 퀘스트', minutes:30, intensity:'easy', movements:[{label:'편하게 5분'}, {label:'빠르게 20분'}, {label:'천천히 5분'}], equipment:[], safetyNote },
]

const approvedWeekTemplates:ActivityTemplate[] = [
  { id:'mixed-hiit-completed', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'유산소 + 가벼운 근력 + HIIT', minutes:45, intensity:'moderate', movements:[{label:'유산소 30분'}, {label:'가벼운 근력 운동'}, {label:'저녁 식사 후 HIIT'}], equipment:[], safetyNote },
  { id:'recovery-cardio', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:4.0, title:'회복 걷기·자전거', minutes:40, intensity:'easy', movements:[{label:'빠른 걷기 또는 자전거 30~40분'}, {label:'전신 스트레칭 10분'}], equipment:[], safetyNote },
  { id:'gym-upper', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'상체 근력 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:[{label:'머신 체스트 프레스 3×8–12',guideId:'chest-press'}, {label:'랫 풀다운 3×8–12',guideId:'lat-pulldown'}, {label:'시티드 로우 3×8–12',guideId:'seated-row'}, {label:'숄더 프레스 3×8–12',guideId:'shoulder-press'}, {label:'바이셉 컬 3×8–12',guideId:'bicep-curl'}, {label:'트라이셉 푸시다운 3×8–12',guideId:'tricep-pushdown'}, {label:'가벼운 유산소 15~20분'}], equipment:['헬스장 머신'], safetyNote },
  { id:'gym-lower-core', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'하체·코어 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:[{label:'레그 프레스 3×8–12',guideId:'leg-press'}, {label:'레그 익스텐션 3×8–12',guideId:'leg-extension'}, {label:'레그 컬 3×8–12',guideId:'leg-curl'}, {label:'글루트 브리지 또는 힙 스러스트 3×8–12'}, {label:'카프 레이즈 3×8–12',guideId:'calf-raise'}, {label:'크런치 또는 플랭크 3세트'}, {label:'가벼운 유산소 15~20분'}], equipment:['헬스장 머신'], safetyNote },
  { id:'light-cardio-conditional', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.5, title:'가벼운 유산소 또는 휴식', minutes:45, intensity:'easy', movements:[{label:'회복 상태 확인'}, {label:'괜찮으면 가벼운 유산소 30~45분'}, {label:'다리가 많이 뻐근하거나 아프면 휴식'}], equipment:[], safetyNote },
]

const newTemplates:ActivityTemplate[] = [
  { id:'gym-cardio-bike', environment:'gym', style:'cardio', goalFit:['cut'], metValue:6.8, title:'실내 사이클 인터벌', minutes:25, intensity:'moderate', movements:[{label:'가볍게 페달링 5분',guideId:'stationary-bike'}, {label:'중강도 페달링 15분'}, {label:'쿨다운 5분'}], equipment:['실내 사이클'], safetyNote },
  { id:'gym-cardio-stairs', environment:'gym', style:'cardio', goalFit:['cut'], metValue:9.0, title:'스텝밀 등반', minutes:20, intensity:'hard', movements:[{label:'천천히 3분',guideId:'stair-mill'}, {label:'빠른 스텝 14분'}, {label:'쿨다운 3분'}], equipment:['스텝밀 머신'], safetyNote },
  { id:'home-cardio-jumprope', environment:'home', style:'cardio', goalFit:['cut'], metValue:8.8, title:'줄넘기 인터벌', minutes:15, intensity:'moderate', movements:[{label:'기본 줄넘기 1분 ×10세트'}, {label:'세트 사이 30초 휴식'}], equipment:['줄넘기'], safetyNote },
  { id:'walk-cardio-jog', environment:'walk', style:'cardio', goalFit:['cut'], metValue:7.0, title:'가벼운 조깅', minutes:25, intensity:'moderate', movements:[{label:'걷기 워밍업 5분'}, {label:'가벼운 조깅 15분'}, {label:'걷기 쿨다운 5분'}], equipment:[], safetyNote },
  { id:'gym-strength-fullbody', environment:'gym', style:'strength', goalFit:['bulk'], metValue:6.0, title:'프리웨이트 전신', minutes:50, intensity:'hard', movements:[{label:'바벨 스쿼트 4×6–8',guideId:'barbell-squat'}, {label:'벤치 프레스 4×6–8',guideId:'bench-press'}, {label:'바벨 로우 4×6–8',guideId:'barbell-row'}, {label:'오버헤드 프레스 3×8–10',guideId:'overhead-press'}], equipment:['바벨', '랙'], safetyNote },
  { id:'home-strength-bodyweight', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'맨몸 근력 서킷', minutes:25, intensity:'moderate', movements:[{label:'푸시업 3×10–15'}, {label:'스쿼트 3×15'}, {label:'플랭크 3×30초'}, {label:'런지 3×10(양쪽)'}], equipment:[], safetyNote },
  { id:'gym-flex-mat', environment:'gym', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'매트 스트레칭·모빌리티', minutes:20, intensity:'easy', movements:[{label:'고양이-소 스트레칭 1분'}, {label:'골반 개방 스트레칭 5분'}, {label:'전신 정적 스트레칭 10분'}], equipment:['매트'], safetyNote },
  { id:'home-flex-yoga', environment:'home', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'홈 요가 루틴', minutes:20, intensity:'easy', movements:[{label:'태양경배자세 5분'}, {label:'전굴·후굴 스트레칭 10분'}, {label:'호흡과 함께 정리 5분'}], equipment:['매트'], safetyNote },
  { id:'gym-hiit-circuit', environment:'gym', style:'hiit', goalFit:['cut'], metValue:8.0, title:'서킷 HIIT', minutes:25, intensity:'hard', movements:[{label:'케틀벨 스윙 40초/휴식 20초 ×8',guideId:'kettlebell-swing'}, {label:'로잉 머신 40초/휴식 20초 ×4',guideId:'rowing-machine'}], equipment:['케틀벨', '로잉 머신'], safetyNote },
  { id:'home-hiit-tabata', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'타바타 4분 라운드', minutes:16, intensity:'hard', movements:[{label:'버피 20초/휴식 10초 ×8'}, {label:'마운틴 클라이머 20초/휴식 10초 ×8'}], equipment:[], safetyNote },
]

export const activityTemplates:ActivityTemplate[] = [...basicTemplates, ...approvedWeekTemplates, ...newTemplates]
```

This transform touches only the `movements` field of every entry (string → `{label, guideId?}`), following the exact assignment table below. No `id`/`environment`/`title`/`minutes`/`intensity`/`equipment`/`safetyNote`/`style`/`goalFit`/`metValue` value changed on any of the 18 templates.

| Movement label contains | guideId |
|---|---|
| 레그 프레스 | `leg-press` |
| 체스트 프레스 | `chest-press` |
| 시티드 로우 | `seated-row` |
| 레그 컬 | `leg-curl` |
| 숄더 프레스 | `shoulder-press` |
| 랫 풀다운 | `lat-pulldown` |
| 바이셉 컬 | `bicep-curl` |
| 트라이셉 푸시다운 | `tricep-pushdown` |
| 레그 익스텐션 | `leg-extension` |
| 카프 레이즈 | `calf-raise` |
| 바벨 스쿼트 | `barbell-squat` |
| 벤치 프레스 | `bench-press` |
| 바벨 로우 | `barbell-row` |
| 오버헤드 프레스 | `overhead-press` |
| 케틀벨 스윙 | `kettlebell-swing` |
| 로잉 머신 | `rowing-machine` |
| 페달링 (first occurrence only) | `stationary-bike` |
| 스텝밀 / "천천히 3분" (first occurrence only) | `stair-mill` |

- [ ] **Step 10: Run `activity.test.ts` and confirm it passes**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: PASS — all 5 tests.

- [ ] **Step 11: Write new tests in `activityTemplates.test.ts` for the shape change**

Add to `src/data/activityTemplates.test.ts`, inside the existing `describe('activityTemplates', ...)` block:

```ts
  it('tags every gym-basic movement with its matching movement guide', () => {
    const gymBasic = activityTemplates.find(item => item.id === 'gym-basic')!
    expect(gymBasic.movements).toEqual([
      { label:'레그 프레스 머신 2×8–12', guideId:'leg-press' },
      { label:'체스트 프레스 머신 2×8–12', guideId:'chest-press' },
      { label:'시티드 로우 머신 2×8–12', guideId:'seated-row' },
      { label:'레그 컬 머신 2×8–12', guideId:'leg-curl' },
      { label:'숄더 프레스 머신 2×8–12', guideId:'shoulder-press' },
    ])
  })

  it('leaves non-equipment movements without a guideId', () => {
    const walkBasic = activityTemplates.find(item => item.id === 'walk-basic')!
    expect(walkBasic.movements).toEqual([
      { label:'편하게 5분' }, { label:'빠르게 20분' }, { label:'천천히 5분' },
    ])
  })
```

- [ ] **Step 12: Run it and confirm it passes**

Run: `npx vitest run src/data/activityTemplates.test.ts`
Expected: PASS — all 6 tests (4 pre-existing + 2 new).

- [ ] **Step 13: Write the failing test for `ActivityCard`'s guide rendering**

Replace the full contents of `src/components/ActivityCard.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityTemplate } from '../domain/activity'
import { movementGuides } from '../data/movementGuides'
import { ActivityCard } from './ActivityCard'

const ACTIVITY: ActivityTemplate = { id:'test-activity', environment:'home', style:'cardio', goalFit:['cut'], metValue:5, title:'테스트 운동', minutes:30, intensity:'moderate', movements:[{label:'동작 1'}, {label:'동작 2'}], equipment:[], safetyNote:'안전 문구' }

describe('ActivityCard', () => {
  it('shows the duration and the estimated calorie burn for the given weight', () => {
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    // 5 MET * 70kg * (30/60)h = 175 kcal
    expect(screen.getByText('30분 · 약 175 kcal')).toBeInTheDocument()
  })

  it('recomputes the estimate for a different weight', () => {
    render(<ActivityCard activity={ACTIVITY} weightKg={56} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    // 5 MET * 56kg * (30/60)h = 140 kcal
    expect(screen.getByText('30분 · 약 140 kcal')).toBeInTheDocument()
  })

  it('offers the evidence disclosure', async () => {
    const user = userEvent.setup()
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    await user.click(screen.getByText('계산 근거 보기'))

    expect(screen.getByText(/kcal = MET × 체중\(kg\) × \(분\/60\)/)).toBeInTheDocument()
  })

  it('still calls onComplete and onSwap', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onSwap = vi.fn()
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={onComplete} onSwap={onSwap}/>)

    await user.click(screen.getByRole('button', { name:'운동 완료' }))
    await user.click(screen.getByRole('button', { name:'다른 운동 선택' }))

    expect(onComplete).toHaveBeenCalled()
    expect(onSwap).toHaveBeenCalled()
  })

  it('renders a plain movement with no guide content', () => {
    render(<ActivityCard activity={ACTIVITY} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    expect(screen.getByText('동작 1')).toBeInTheDocument()
    expect(screen.queryByText(movementGuides['leg-press'].description)).not.toBeInTheDocument()
  })

  it('shows a movement guide inline for equipment movements, with no click required', () => {
    const activityWithGuide: ActivityTemplate = { ...ACTIVITY, movements: [{ label: '레그 프레스 머신 2×8–12', guideId: 'leg-press' }] }
    render(<ActivityCard activity={activityWithGuide} weightKg={70} onComplete={vi.fn()} onSwap={vi.fn()}/>)

    expect(screen.getByText('레그 프레스 머신 2×8–12')).toBeInTheDocument()
    expect(screen.getByText(movementGuides['leg-press'].description)).toBeInTheDocument()
    expect(screen.getByText(movementGuides['leg-press'].steps[0])).toBeInTheDocument()
    expect(screen.getByText(movementGuides['leg-press'].steps[1])).toBeInTheDocument()
    expect(screen.getByText(movementGuides['leg-press'].steps[2])).toBeInTheDocument()
  })
})
```

- [ ] **Step 14: Run it and confirm it fails**

Run: `npx vitest run src/components/ActivityCard.test.tsx`
Expected: FAIL — `ACTIVITY.movements` is now an array of objects but `ActivityCard.tsx` still does `<li key={item}>{item}</li>` (renders `[object Object]`), so `screen.getByText('동작 1')` and every guide-related assertion fail to find their text.

- [ ] **Step 15: Update `ActivityCard.tsx`**

Replace the full contents of `src/components/ActivityCard.tsx` with:

```tsx
import { Dumbbell, Footprints, House } from 'lucide-react'
import { estimateActivityCalories, type ActivityTemplate } from '../domain/activity'
import { movementGuides } from '../data/movementGuides'
import { ActivityEvidenceSheet } from './ActivityEvidenceSheet'

const icons = { gym: Dumbbell, home: House, walk: Footprints }
export function ActivityCard({ activity, weightKg, onComplete, onSwap }: { activity: ActivityTemplate; weightKg: number; onComplete: () => void; onSwap: () => void }) {
  const Icon = icons[activity.environment]
  const kcal = estimateActivityCalories(activity, weightKg)
  return <section className="panel activity-card"><header><div className="activity-icon"><Icon aria-hidden="true" /></div><div><p className="eyebrow">오늘의 운동</p><h2>{activity.title}</h2></div><strong className="card-badge">{activity.minutes}분 · 약 {kcal} kcal</strong></header><ul>{activity.movements.map(item => <li key={item.label}>{item.label}{item.guideId && movementGuides[item.guideId] && <div className="movement-guide"><p>{movementGuides[item.guideId].description}</p><ol>{movementGuides[item.guideId].steps.map((step, index) => <li key={index}><span className="step-badge">{index + 1}</span>{step}</li>)}</ol></div>}</li>)}</ul><p className="safety-note">{activity.safetyNote}</p><ActivityEvidenceSheet/><div className="actions"><button onClick={onComplete}>운동 완료</button><button className="secondary" onClick={onSwap}>다른 운동 선택</button></div></section>
}
```

- [ ] **Step 16: Run it and confirm it passes**

Run: `npx vitest run src/components/ActivityCard.test.tsx`
Expected: PASS — all 6 tests.

- [ ] **Step 17: Add CSS for the guide steps**

In `src/styles.css`, find this exact line (the `.card-badge` rule):

```
.card-badge{padding:6px 12px;border-radius:999px;font-size:.85rem;font-weight:800;white-space:nowrap;background:var(--accent-soft);color:var(--accent-strong)}
```

Add immediately after it:

```
.movement-guide{margin-top:6px;padding:10px;border-radius:10px;background:var(--soft);font-size:.82rem;color:var(--muted)}
.movement-guide p{margin:0 0 6px;color:var(--ink)}
.movement-guide ol{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.movement-guide li{display:flex;align-items:center;gap:8px}
.step-badge{flex:0 0 auto;width:18px;height:18px;display:grid;place-items:center;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:.7rem;font-weight:800}
```

(No test covers CSS in this codebase's existing conventions — confirmed by grep before writing this plan — so this step has no test step.)

- [ ] **Step 18: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — every test file.

- [ ] **Step 19: Run the build**

Run: `npm run build`
Expected: succeeds — confirms the `ActivityMovement` type is used consistently everywhere `movements` is read or constructed.

- [ ] **Step 20: Commit**

```bash
git add src/data/movementGuides.ts src/data/movementGuides.test.ts src/domain/activity.ts src/domain/activity.test.ts src/data/activityTemplates.ts src/data/activityTemplates.test.ts src/components/ActivityCard.tsx src/components/ActivityCard.test.tsx src/styles.css
git commit -m "feat: add plain-language usage guides for gym-equipment movements"
```

---

### Task 4: Goal/experience-aware weekly-plan generation

**Files:**
- Modify: `src/domain/activity.ts`
- Modify: `src/domain/activity.test.ts`
- Modify: `src/domain/weeklyPlan.ts`
- Modify: `src/domain/weeklyPlan.test.ts`
- Modify: `src/hooks/useWellnessGame.ts`

**Interfaces:**
- Consumes: `UserProfile` (`src/domain/profile.ts`, Task 1), `ActivityTemplate`/`ActivityEnvironment` (Task 3 — unaffected by this task, only `movements`' shape changed there and this task doesn't touch `movements`).
- Produces: `getRotationCandidates(environment, all, goal?, beginnerFriendly?): ActivityTemplate[]`, `pickBestTemplate(environment, all, goal?, beginnerFriendly?): ActivityTemplate` (both in `src/domain/activity.ts`). `GenerateWeeklyPlanInput.profile?: UserProfile` (optional).

- [ ] **Step 1: Write the failing tests for `pickBestTemplate`/`getRotationCandidates`**

First, in `src/domain/activity.test.ts`, find this exact substring (the top import line):

```ts
import { estimateActivityCalories, getAlternatives } from './activity'
```

Replace it with:

```ts
import { estimateActivityCalories, getAlternatives, getRotationCandidates, pickBestTemplate } from './activity'
```

Then add this new `describe` block at the end of the file (after the existing `describe('estimateActivityCalories', ...)` block):

```ts
describe('pickBestTemplate / getRotationCandidates', () => {
  it('prefers a goal match over the environment default', () => {
    const bulkPick = pickBestTemplate('gym', activityTemplates, 'bulk')
    expect(bulkPick.goalFit).toContain('bulk')
  })

  it('falls back to the environment default when no template fits the goal', () => {
    // No 'walk' template's goalFit includes 'bulk', so this must fall back
    // to the first walk-environment entry (walk-basic) rather than throwing
    // or returning something from a different environment.
    const pick = pickBestTemplate('walk', activityTemplates, 'bulk')
    expect(pick.id).toBe('walk-basic')
  })

  it('keeps the exact old behavior when no goal is given', () => {
    expect(pickBestTemplate('gym', activityTemplates).id).toBe('gym-basic')
    expect(pickBestTemplate('home', activityTemplates).id).toBe('home-basic')
    expect(pickBestTemplate('walk', activityTemplates).id).toBe('walk-basic')
  })

  it('prefers an equipment-light, non-hard template for beginners', () => {
    const pick = pickBestTemplate('gym', activityTemplates, 'bulk', true)
    // gym-strength-fullbody fits 'bulk' but needs 2 pieces of equipment and is 'hard';
    // gym-basic fits 'bulk' via goalFit ['maintain','bulk'], needs 1 generic
    // equipment entry, and is 'moderate' -- the beginner-friendly pick.
    expect(pick.id).toBe('gym-basic')
  })

  it('experienced users see the unfiltered goal-matched pool (may include hard/multi-equipment templates)', () => {
    const pick = pickBestTemplate('gym', activityTemplates, 'bulk', false)
    expect(pick.goalFit).toContain('bulk')
  })

  it('getRotationCandidates never returns an empty list for a real environment', () => {
    for (const environment of ['gym', 'home', 'walk'] as const) {
      for (const goal of ['cut', 'maintain', 'bulk'] as const) {
        for (const beginnerFriendly of [true, false]) {
          expect(getRotationCandidates(environment, activityTemplates, goal, beginnerFriendly).length).toBeGreaterThan(0)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: FAIL — `pickBestTemplate`/`getRotationCandidates` are not exported from `./activity` yet (import resolution error).

- [ ] **Step 3: Implement `getRotationCandidates`/`pickBestTemplate`**

In `src/domain/activity.ts`, find this exact substring:

```
export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}
```

Add immediately after it (before the `estimateActivityCalories` function):

```

/** Filters `all` to one environment, preferring templates whose `goalFit`
 * includes `goal` (falls back to the full environment when nothing fits,
 * so this never throws away every candidate). When `beginnerFriendly` is
 * true, further narrows to templates needing at most 1 named equipment
 * item and not `hard` intensity -- unless that would empty the list, in
 * which case the goal-matched (or environment) pool is returned as-is.
 * Omitting `goal`/`beginnerFriendly` reproduces the exact previous
 * behavior: the first array entry for that environment (always
 * `${environment}-basic`, per the append-only ordering guarantee). */
export function getRotationCandidates(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate[] {
  const inEnvironment = all.filter(item => item.environment === environment)
  const goalMatches = goal ? inEnvironment.filter(item => item.goalFit.includes(goal)) : inEnvironment
  const pool = goalMatches.length > 0 ? goalMatches : inEnvironment
  if (!beginnerFriendly) return pool
  const simple = pool.filter(item => item.equipment.length <= 1 && item.intensity !== 'hard')
  return simple.length > 0 ? simple : pool
}

export function pickBestTemplate(environment: ActivityEnvironment, all: ActivityTemplate[], goal?: 'cut'|'maintain'|'bulk', beginnerFriendly?: boolean): ActivityTemplate {
  return getRotationCandidates(environment, all, goal, beginnerFriendly)[0]
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: PASS — all 11 tests (5 pre-existing + 6 new).

- [ ] **Step 5: Write the failing tests for `generateWeeklyPlan`'s profile-aware assignment**

Add to `src/domain/weeklyPlan.test.ts`, inside the existing `describe('weekly plan generation', ...)` block (after the `'generates stable identifiers for identical inputs'` test):

```ts
  it('assigns a goal-matching template when a profile is given', () => {
    const bulkProfile: UserProfile = { age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'experienced' }
    const result = generate({ ...basePreferences, activityMix: { gym: 1, home: 0, walk: 0 }, activitiesPerWeek: 1 }, bulkProfile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const template = activityTemplates.find(item => item.id === result.plan.activities[0].templateId)!
    expect(template.goalFit).toContain('bulk')
  })

  it('assigns an equipment-light template for a beginner profile', () => {
    const beginnerBulkProfile: UserProfile = { age: 30, heightCm: 175, weightKg: 80, calculationSex: 'male', activityLevel: 'light', goal: 'bulk', exerciseExperience: 'beginner' }
    const result = generate({ ...basePreferences, activityMix: { gym: 1, home: 0, walk: 0 }, activitiesPerWeek: 1 }, beginnerBulkProfile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.activities[0].templateId).toBe('gym-basic')
  })

  it('keeps the exact previous assignment when no profile is given', () => {
    const result = generate({ ...basePreferences, activityMix: { gym: 1, home: 0, walk: 0 }, activitiesPerWeek: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.activities[0].templateId).toBe('gym-basic')
  })
```

Then update the `generate` helper just above `describe('weekly plan generation', ...)`'s body to accept an optional profile — find this exact substring:

```ts
  const generate = (preferences: WeeklyPlanPreferences = basePreferences) =>
    generateWeeklyPlan({ weekStart: '2026-08-10', preferences, smoothieItems, activityTemplates })
```

Replace it with:

```ts
  const generate = (preferences: WeeklyPlanPreferences = basePreferences, profile?: UserProfile) =>
    generateWeeklyPlan({ weekStart: '2026-08-10', preferences, smoothieItems, activityTemplates, profile })
```

And add the import at the top of the file (alongside the existing imports):

```ts
import type { UserProfile } from './profile'
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/domain/weeklyPlan.test.ts`
Expected: FAIL — `generateWeeklyPlan` doesn't accept a `profile` field on its input yet (TypeScript would normally catch this, but since Vitest doesn't type-check, the extra `profile` property is silently ignored at runtime and every new test fails on its actual assertion instead — e.g. the goal-matching test finds `gym-basic` was assigned instead of a `bulk`-fit template).

- [ ] **Step 7: Update `weeklyPlan.ts`**

In `src/domain/weeklyPlan.ts`, find this exact substring:

```
import type { ActivityEnvironment, ActivityTemplate } from './activity'
import type { SmoothieItem } from './smoothie'
import type { WeeklyTrainingGuidance } from './weeklyTrainingGuidance'
```

Replace it with:

```
import { pickBestTemplate, type ActivityEnvironment, type ActivityTemplate } from './activity'
import type { SmoothieItem } from './smoothie'
import type { UserProfile } from './profile'
import type { WeeklyTrainingGuidance } from './weeklyTrainingGuidance'
```

Then find this exact substring:

```
export interface GenerateWeeklyPlanInput {
  weekStart: string
  preferences: WeeklyPlanPreferences
  smoothieItems: SmoothieItem[]
  activityTemplates: ActivityTemplate[]
}
```

Replace it with:

```
export interface GenerateWeeklyPlanInput {
  weekStart: string
  preferences: WeeklyPlanPreferences
  smoothieItems: SmoothieItem[]
  activityTemplates: ActivityTemplate[]
  profile?: UserProfile
}
```

Then find this exact substring:

```
  const activities = environments.map((environment, index) => {
    const template = input.activityTemplates.find(item => item.id === `${environment}-basic`) ?? input.activityTemplates.find(item => item.environment === environment)
    if (!template) throw new Error(`${environment} 운동 템플릿이 없습니다.`)
    const date = dates[ACTIVITY_DAY_PRIORITY[index]]
```

Replace it with:

```
  const activities = environments.map((environment, index) => {
    const template = pickBestTemplate(environment, input.activityTemplates, input.profile?.goal, input.profile?.exerciseExperience === 'beginner')
    const date = dates[ACTIVITY_DAY_PRIORITY[index]]
```

(The `if (!template) throw ...` guard is removed: `pickBestTemplate` always returns a real `ActivityTemplate` — `getRotationCandidates`'s pool can never be empty for a real environment, per the test added in Task 4 Step 1 proving this for every goal/beginner combination.)

- [ ] **Step 8: Run it and confirm it passes**

Run: `npx vitest run src/domain/weeklyPlan.test.ts`
Expected: PASS — all tests in the file (3 new + every pre-existing one, since omitting `profile` reproduces the exact old assignment).

- [ ] **Step 9: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — every test file, including `weeklyTrainingGuidance.test.ts`, `WeeklyPlanScreen.test.tsx`, `RecordsScreen.test.tsx`, `records.test.ts`, `weeklyPlanValidation.test.ts`, and `TodayScreen.test.tsx`, none of which pass a `profile` into `generateWeeklyPlan` and so are unaffected.

- [ ] **Step 10: Wire the real profile into `useWellnessGame.ts`**

In `src/hooks/useWellnessGame.ts`, find this exact substring:

```
    const result = generateWeeklyPlan({ weekStart: toLocalDateKey(getMonday(now())), preferences, smoothieItems: state.smoothie, activityTemplates })
```

Replace it with:

```
    const result = generateWeeklyPlan({ weekStart: toLocalDateKey(getMonday(now())), preferences, smoothieItems: state.smoothie, activityTemplates, profile: state.profile ?? undefined })
```

(`state.profile` is `UserProfile | null`; `?? undefined` converts `null` to `undefined` so it matches `profile?: UserProfile`'s optional-but-not-nullable type. This keeps the pre-existing `useWellnessGame.test.tsx` tests — which call `generatePlan` without ever onboarding first, so `state.profile` is `null` — working unchanged, since `undefined` triggers the exact old fallback behavior.)

- [ ] **Step 11: Run the full test suite and the build**

Run: `npm test -- --run`
Expected: PASS — every test file, same total count as Step 9 (this step only changes production code, not test expectations).

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 12: Commit**

```bash
git add src/domain/activity.ts src/domain/activity.test.ts src/domain/weeklyPlan.ts src/domain/weeklyPlan.test.ts src/hooks/useWellnessGame.ts
git commit -m "feat: make weekly-plan generation goal- and experience-aware"
```

---

## Final check (whole-plan reviewer or controller, after all 4 tasks)

Run the full suite and the build once more:

Run: `npm test -- --run`
Expected: PASS — total test count grew by:
- Task 1: +2 net new (2 new tests; 2 pre-existing tests updated, not added)
- Task 2: +1 (Onboarding)
- Task 3: +2 (`movementGuides.test.ts`, new file) +2 (`activityTemplates.test.ts`) +2 (`ActivityCard.test.tsx`)
- Task 4: +6 (`activity.test.ts`) +3 (`weeklyPlan.test.ts`)

Run: `npm run build`
Expected: succeeds.

Manually verify in a running dev server (`npm run dev`): onboard as a `bulk`-goal, `experienced` user and generate a weekly plan with `activityMix: {gym:1}` — confirm the assigned gym activity is NOT `gym-basic` (should be `gym-strength-fullbody`, the only `bulk`-fit, non-beginner-restricted gym template). Then check the "오늘" screen's activity card for a movement that names gym equipment (e.g. "바벨 스쿼트") — confirm its plain-language description and numbered steps render immediately, with no click needed.
