# Nutrition Engine Design

**Goal:** Replace the fixed "always -15% cut, protein-only" nutrition calculation with a goal-driven engine that supports cut/maintain/bulk, a fourth activity tier, full protein/fat/carbohydrate targets, and a safety floor — while keeping every existing user's displayed numbers unchanged unless they explicitly pick a new goal.

**Non-goals:** This spec does not change the underlying BMR formula (stays Mifflin-St Jeor), does not add body-fat%/Katch-McArdle support, does not touch onboarding fields unrelated to the calculation (allergies, medical flags, dietary restrictions — deferred to a later onboarding-expansion spec), and does not touch the weekly plan generator or ingredient database (deferred to their own specs).

## Data Model (`src/domain/profile.ts`)

```ts
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'veryActive'
export type Goal = 'cut' | 'maintain' | 'bulk'
export type CutIntensity = 'mild' | 'aggressive'

export interface UserProfile {
  age: number
  heightCm: number
  weightKg: number
  calculationSex: CalculationSex
  activityLevel: ActivityLevel
  goal: Goal
  cutIntensity?: CutIntensity // only meaningful when goal === 'cut'; defaults to 'mild'
}
```

`validateProfile` gains no new throwing behavior — `goal`/`cutIntensity` are never invalid inputs, they're normalized (see Migration below), never rejected.

## Calculation (`src/domain/nutrition.ts`)

**Activity multipliers** (BMR × factor = maintenance kcal):
`sedentary 1.2 / light 1.375 / moderate 1.55 / veryActive 1.725`

**Goal multipliers** (maintenance kcal × factor = target kcal, before the safety floor):
| Goal | Intensity | Factor |
|---|---|---|
| cut | mild | 0.85 (−15%) |
| cut | aggressive | 0.75 (−25%) |
| maintain | — | 1.0 |
| bulk | — | 1.10 (+10%) |

`cut`/`mild` is deliberately identical to today's hardcoded `× 0.85`, so an existing profile normalized to `{goal:'cut', cutIntensity:'mild'}` produces byte-identical `targetKcal` to before this change.

**Safety floor:** after applying the goal multiplier, `targetKcal = Math.max(computedTargetKcal, floorKcal)` where `floorKcal = calculationSex === 'male' ? 1500 : 1200`. If the floor overrides the computed value, append a warning: `'계산된 목표가 너무 낮아 안전 최소값으로 조정했습니다. 전문가와 상의하세요.'`

**Protein** (g, rounded): `cut → weightKg × 2.0`, `maintain → weightKg × 1.6` (unchanged), `bulk → weightKg × 1.8`.

**Fat** (g, rounded): `targetKcal × 0.25 / 9` for every goal — a fixed 25% of target calories, inside the standard 20–35% AMDR range.

**Carbohydrate** (g, rounded): remainder after protein and fat are subtracted in kcal terms — `(targetKcal − proteinGrams×4 − fatGrams×9) / 4`, clamped to a minimum of 0. If the unclamped value would be negative, append a warning: `'단백질과 지방 목표가 높아 탄수화물이 매우 낮게 계산되었습니다.'` (this is only reachable at extreme low-weight + aggressive-cut + male-floor edge combinations; the safety floor keeps it from happening in realistic inputs, but the guard exists so the function never returns negative carbs).

**Evidence:** the two existing entries (Mifflin-St Jeor, NIDDK) stay. New entries for the veryActive multiplier, goal multipliers, protein-per-goal ranges, the 25% fat rule, and the safety floor are added during implementation once real citations are located — this spec intentionally does not invent URLs. Until a citation is found for a given rule, that rule ships without a citation entry rather than with a fabricated one.

**`NutritionTarget` output shape:**
```ts
export interface NutritionTarget {
  bmrKcal: number; maintenanceKcal: number; targetKcal: number
  proteinGrams: number; fatGrams: number; carbGrams: number   // fatGrams/carbGrams are new
  evidence: Evidence[]; warnings: string[]
}
```

## UI

**`Onboarding.tsx`:**
- "평소 활동량" `<select>` gains a fourth option: `veryActive` → "매우 활동적 (주 6회 이상 격렬한 운동)".
- New "목표" `<select>`: `cut` → "감량", `maintain` → "유지", `bulk` → "증량". Default state value: `'cut'`.
- New "감량 강도" `<select>`, rendered only when `goal === 'cut'`: `mild` → "완만함", `aggressive` → "공격적". Default state value: `'mild'`.
- Initial `useState<UserProfile>` default gains `goal:'cut', cutIntensity:'mild'` so the form's own default matches today's behavior.

**`TodayScreen.tsx`:**
- The target strip line becomes `유지 {maintenanceKcal} · 목표 {targetKcal} kcal · 단백질 {proteinGrams}g · 지방 {fatGrams}g · 탄수화물 {carbGrams}g`.
- `EvidenceSheet` is unchanged (it already maps over `target.evidence`); it will simply render more rows once new evidence entries exist.

## Migration

Existing persisted `UserProfile` records predate `goal`/`cutIntensity`. Add a normalization step (mirroring the pattern already used in `src/domain/avatar.ts`'s `normalizeAvatarState`) at the point profiles are loaded from storage: if `goal` is missing, default to `'cut'`; if `goal === 'cut'` and `cutIntensity` is missing, default to `'mild'`. This guarantees every pre-existing user sees exactly the same `targetKcal`/`proteinGrams` they saw before this change — only `fatGrams`/`carbGrams` appear as new information, nothing they already saw changes.

## Testing

Keep the existing deterministic test (male/light/80kg/175cm/30yo) passing unchanged by giving it `goal:'cut', cutIntensity:'mild'` — it must still assert `targetKcal=2044`. Add new cases: `veryActive` multiplier, `maintain`, `bulk`, `cut`+`aggressive`, the safety-floor clamp (a low-BMR + aggressive-cut input that would otherwise fall under 1200/1500), and the carb-floor guard. Add an `Onboarding.test.tsx` case confirming the "감량 강도" select only appears when 목표=감량. Add a `TodayScreen` (or existing app-flow) test confirming 지방/탄수화물 render in the target strip.

## Change Surface

Only four files touch these types today (confirmed by grep): `src/domain/profile.ts`, `src/domain/nutrition.ts`, `src/components/Onboarding.tsx`, `src/hooks/useWellnessGame.ts` (stores `UserProfile`/`NutritionTarget` verbatim, no logic changes needed there beyond the normalization step above). `TodayScreen.tsx` and `EvidenceSheet.tsx` are display-only and need only the one line change noted above.
