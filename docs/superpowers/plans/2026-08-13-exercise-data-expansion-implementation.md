# Exercise Data Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the exercise/activity data (`src/data/activityTemplates.ts`) into a tagged library (style, goal fit, MET-based calorie cost) and surface a real estimated-calorie-burn number on the Today screen's activity card, with cited evidence — the exercise-side counterpart to the nutrition engine's Mifflin-St Jeor work.

**Architecture:** Add three new fields to `ActivityTemplate` (`style`, `goalFit`, `metValue`) and a pure `estimateActivityCalories(activity, weightKg)` function in `src/domain/activity.ts`. Tag all 8 existing templates with the new fields (ids/content unchanged — several are load-bearing elsewhere) and append 10 new templates. Add a small `ActivityEvidenceSheet` component (same `<details>` pattern as the nutrition engine's `EvidenceSheet`) citing the Compendium of Physical Activities and the WHO 2020 physical activity guidelines. Wire both into `ActivityCard` via a new `weightKg` prop sourced from `TodayScreen`'s already-loaded profile.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library (existing stack — no new dependencies).

## Global Constraints

- Every step is TDD: write the failing test, run it, watch it fail for the right reason, implement, run again, watch it pass.
- `gym-basic`, `home-basic`, `walk-basic` keep their exact `id`, `environment`, `title`, `minutes`, `movements`, `equipment`, and `safetyNote` — only new fields are added to them. They are read by exact id in `weeklyPlan.ts`'s `generateWeeklyPlan` and `normalizeWeeklyPlan`, and `useWellnessGame.ts`'s `defaultWellnessState`.
- `mixed-hiit-completed`, `recovery-cardio`, `gym-upper`, `gym-lower-core`, `light-cardio-conditional` (the `approvedWeekTemplates`) likewise keep their exact `id` and content — only new fields are added. They are read by exact id from `weeklyTrainingGuidance.ts`'s `reconcileApprovedTrainingWeek`.
- New templates are appended after the existing 8, never inserted before or between them — `src/domain/activity.test.ts`'s existing `.find(item => item.environment === 'gym')` (first-match) assertion depends on `gym-basic` staying the first `gym` entry in the array, and the same for `home`.
- No Edge Functions, no Supabase/migration changes — this is pure client-side domain/data/UI work.
- Out of scope, do not touch: `src/domain/weeklyTrainingGuidance.ts` (the hardcoded single-week guide), any personalized weekly-plan generator, `PlanItemActions.tsx`'s swap dialog (it only ever shows the 3 `-basic` templates, which stay `easy`/`moderate` — never `hard` — so its binary intensity label is a known, accepted, unreachable-with-real-data gap; leave a one-line comment, do not refactor the component for testability).

---

### Task 1: Extend `ActivityTemplate` with style/goalFit/metValue, add the calorie estimator

**Files:**
- Modify: `src/domain/activity.ts`
- Modify: `src/domain/activity.test.ts`
- Modify: `src/components/PlanItemActions.tsx` (one-line comment only, see Step 7)

**Interfaces:**
- Produces: `ActivityStyle` (`'cardio'|'strength'|'flexibility'|'hiit'`), the extended `ActivityTemplate` (adds `style: ActivityStyle`, `goalFit: ('cut'|'maintain'|'bulk')[]`, `metValue: number`; widens `intensity` to `'easy'|'moderate'|'hard'`), and `estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number`. Task 2 (the data file) and Task 3 (`ActivityCard`) both import these from `src/domain/activity.ts`.
- Consumes: nothing new — `goalFit`'s values match `src/domain/profile.ts`'s existing `Goal` union (`'cut'|'maintain'|'bulk'`) by value, but `activity.ts` spells the union inline rather than importing `Goal`, matching how `intensity` is already written (see the note after Step 3).

- [ ] **Step 1: Write the failing test for `estimateActivityCalories`**

Replace the full contents of `src/domain/activity.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { estimateActivityCalories, getAlternatives } from './activity'
import { activityTemplates } from '../data/activityTemplates'

describe('activity templates', () => {
  it('keeps templates honest about their environment', () => {
    expect(activityTemplates.find(item => item.environment === 'gym')?.movements.every(item => item.includes('머신'))).toBe(true)
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

- [ ] **Step 2: Run the test file and confirm it fails**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: FAIL — `estimateActivityCalories` is not exported from `./activity` yet, so the import fails (Vite/esbuild reports it as a resolution error, not a type error, since Vitest's transform doesn't type-check).

- [ ] **Step 3: Extend the type and add the function**

Replace the full contents of `src/domain/activity.ts` with:

```ts
export type ActivityEnvironment = 'gym' | 'home' | 'walk'
export type ActivityStyle = 'cardio' | 'strength' | 'flexibility' | 'hiit'
export interface ActivityTemplate { id: string; environment: ActivityEnvironment; style: ActivityStyle; goalFit: ('cut'|'maintain'|'bulk')[]; metValue: number; title: string; minutes: number; intensity: 'easy'|'moderate'|'hard'; movements: string[]; equipment: string[]; safetyNote: string }

export function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]) {
  return all.filter(item => item.id.endsWith('-basic') && item.id !== activity.id)
}

/** Standard MET formula: kcal = MET × weight(kg) × duration(hours). See
 * `ActivityEvidenceSheet` for the cited source of `metValue`. */
export function estimateActivityCalories(activity: ActivityTemplate, weightKg: number): number {
  return Math.round(activity.metValue * weightKg * (activity.minutes / 60))
}
```

Note: `goalFit` is typed as `('cut'|'maintain'|'bulk')[]` directly (matching `src/domain/profile.ts`'s `Goal` union) rather than importing `Goal`, to keep `activity.ts` free of a dependency on `profile.ts` — the same style already used by `intensity`'s inline union.

- [ ] **Step 4: Run the test file and confirm all 5 tests now pass**

Run: `npx vitest run src/domain/activity.test.ts`
Expected: PASS — all 5 tests (the 2 pre-existing `describe('activity templates', ...)` tests, unaffected since they only read `environment`/`movements`/`equipment` from the not-yet-touched `activityTemplates.ts`, plus the 3 new `estimateActivityCalories` tests, which are pure and self-contained).

- [ ] **Step 5: Run the full test suite to confirm nothing else broke**

Run: `npm test -- --run`
Expected: PASS — same count as before this task plus the 3 new tests (widening `intensity`'s type to include `'hard'` is backward compatible; no existing template uses `'hard'` yet, and no other file's type usage narrows `intensity` to reject a third value).

- [ ] **Step 6: Add the accepted-gap comment to `PlanItemActions.tsx`**

In `src/components/PlanItemActions.tsx`, find this exact substring (inside the `replace` fieldset's `.map`):

```
<span>{template.title} · {template.minutes}분 · {template.intensity === 'easy' ? '가볍게' : '보통 강도'}</span>
```

Replace it with (comment only — logic unchanged):

```
{/* Binary label: only ever reachable with the 3 `-basic` templates below,
    all `easy`/`moderate` — never `hard`. A real `hard` template here would
    print "보통 강도", but this component imports `activityTemplates`
    directly (no injectable list), so that branch can't be driven by a
    test without a DI refactor. See docs/superpowers/specs/2026-08-13-exercise-data-expansion-design.md. */}
<span>{template.title} · {template.minutes}분 · {template.intensity === 'easy' ? '가볍게' : '보통 강도'}</span>
```

- [ ] **Step 7: Run the full test suite again**

Run: `npm test -- --run`
Expected: PASS — a JSX comment has no runtime effect.

- [ ] **Step 8: Commit**

```bash
git add src/domain/activity.ts src/domain/activity.test.ts src/components/PlanItemActions.tsx
git commit -m "feat: add exercise style/goal/MET tags and a calorie estimator"
```

---

### Task 2: Tag existing templates and add 10 new ones

**Files:**
- Modify: `src/data/activityTemplates.ts`
- Create: `src/data/activityTemplates.test.ts`

**Interfaces:**
- Consumes: `ActivityTemplate`, `ActivityStyle` from `src/domain/activity.ts` (Task 1).
- Produces: `activityTemplates: ActivityTemplate[]`, now 18 entries (8 existing + 10 new), each with `style`/`goalFit`/`metValue` filled in. Task 3 (`ActivityCard`/`TodayScreen`) doesn't import anything new from here — it already imports `activityTemplates` — but relies on every entry now having a real `metValue > 0`.

- [ ] **Step 1: Write the failing data-sanity test**

Create `src/data/activityTemplates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activityTemplates } from './activityTemplates'

describe('activityTemplates', () => {
  it('has 18 templates with unique ids', () => {
    expect(activityTemplates).toHaveLength(18)
    expect(new Set(activityTemplates.map(item => item.id)).size).toBe(18)
  })

  it('gives every template a positive MET value and at least one goal fit', () => {
    for (const template of activityTemplates) {
      expect(template.metValue).toBeGreaterThan(0)
      expect(template.goalFit.length).toBeGreaterThan(0)
    }
  })

  it('keeps the original 3 rotation templates first, unchanged, and load-bearing', () => {
    expect(activityTemplates[0]).toMatchObject({ id: 'gym-basic', environment: 'gym', title: '머신 전신 탐험', minutes: 35 })
    expect(activityTemplates[1]).toMatchObject({ id: 'home-basic', environment: 'home', title: '집에서 기본 루프', minutes: 20 })
    expect(activityTemplates[2]).toMatchObject({ id: 'walk-basic', environment: 'walk', title: '동네 산보 퀘스트', minutes: 30 })
  })

  it('covers all four exercise styles', () => {
    const styles = new Set(activityTemplates.map(item => item.style))
    expect(styles).toEqual(new Set(['cardio', 'strength', 'flexibility', 'hiit']))
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/data/activityTemplates.test.ts`
Expected: FAIL — `activityTemplates` currently has 8 entries, not 18, and none have `style`/`goalFit`/`metValue` (so `template.goalFit.length` throws `Cannot read properties of undefined`).

- [ ] **Step 3: Replace the data file**

Replace the full contents of `src/data/activityTemplates.ts` with:

```ts
import type { ActivityTemplate } from '../domain/activity'

const safetyNote = '날카로운 통증이나 이상 증상이 있으면 중단하세요.'

const basicTemplates:ActivityTemplate[] = [
  { id:'gym-basic', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:3.5, title:'머신 전신 탐험', minutes:35, intensity:'moderate', movements:['레그 프레스 머신 2×8–12', '체스트 프레스 머신 2×8–12', '시티드 로우 머신 2×8–12', '레그 컬 머신 2×8–12', '숄더 프레스 머신 2×8–12'], equipment:['헬스장 머신'], safetyNote },
  { id:'home-basic', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'집에서 기본 루프', minutes:20, intensity:'easy', movements:['의자 스쿼트 2×8–12', '벽 푸시업 2×8–12', '글루트 브리지 2×8–12', '버드독 2×8–12'], equipment:[], safetyNote },
  { id:'walk-basic', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.3, title:'동네 산보 퀘스트', minutes:30, intensity:'easy', movements:['편하게 5분', '빠르게 20분', '천천히 5분'], equipment:[], safetyNote },
]

const approvedWeekTemplates:ActivityTemplate[] = [
  { id:'mixed-hiit-completed', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'유산소 + 가벼운 근력 + HIIT', minutes:45, intensity:'moderate', movements:['유산소 30분', '가벼운 근력 운동', '저녁 식사 후 HIIT'], equipment:[], safetyNote },
  { id:'recovery-cardio', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:4.0, title:'회복 걷기·자전거', minutes:40, intensity:'easy', movements:['빠른 걷기 또는 자전거 30~40분', '전신 스트레칭 10분'], equipment:[], safetyNote },
  { id:'gym-upper', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'상체 근력 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:['머신 체스트 프레스 3×8–12', '랫 풀다운 3×8–12', '시티드 로우 3×8–12', '숄더 프레스 3×8–12', '바이셉 컬 3×8–12', '트라이셉 푸시다운 3×8–12', '가벼운 유산소 15~20분'], equipment:['헬스장 머신'], safetyNote },
  { id:'gym-lower-core', environment:'gym', style:'strength', goalFit:['maintain','bulk'], metValue:4.5, title:'하체·코어 + 가벼운 유산소', minutes:60, intensity:'moderate', movements:['레그 프레스 3×8–12', '레그 익스텐션 3×8–12', '레그 컬 3×8–12', '글루트 브리지 또는 힙 스러스트 3×8–12', '카프 레이즈 3×8–12', '크런치 또는 플랭크 3세트', '가벼운 유산소 15~20분'], equipment:['헬스장 머신'], safetyNote },
  { id:'light-cardio-conditional', environment:'walk', style:'cardio', goalFit:['cut','maintain'], metValue:3.5, title:'가벼운 유산소 또는 휴식', minutes:45, intensity:'easy', movements:['회복 상태 확인', '괜찮으면 가벼운 유산소 30~45분', '다리가 많이 뻐근하거나 아프면 휴식'], equipment:[], safetyNote },
]

const newTemplates:ActivityTemplate[] = [
  { id:'gym-cardio-bike', environment:'gym', style:'cardio', goalFit:['cut'], metValue:6.8, title:'실내 사이클 인터벌', minutes:25, intensity:'moderate', movements:['가볍게 페달링 5분', '중강도 페달링 15분', '쿨다운 5분'], equipment:['실내 사이클'], safetyNote },
  { id:'gym-cardio-stairs', environment:'gym', style:'cardio', goalFit:['cut'], metValue:9.0, title:'스텝밀 등반', minutes:20, intensity:'hard', movements:['천천히 3분', '빠른 스텝 14분', '쿨다운 3분'], equipment:['스텝밀 머신'], safetyNote },
  { id:'home-cardio-jumprope', environment:'home', style:'cardio', goalFit:['cut'], metValue:8.8, title:'줄넘기 인터벌', minutes:15, intensity:'moderate', movements:['기본 줄넘기 1분 ×10세트', '세트 사이 30초 휴식'], equipment:['줄넘기'], safetyNote },
  { id:'walk-cardio-jog', environment:'walk', style:'cardio', goalFit:['cut'], metValue:7.0, title:'가벼운 조깅', minutes:25, intensity:'moderate', movements:['걷기 워밍업 5분', '가벼운 조깅 15분', '걷기 쿨다운 5분'], equipment:[], safetyNote },
  { id:'gym-strength-fullbody', environment:'gym', style:'strength', goalFit:['bulk'], metValue:6.0, title:'프리웨이트 전신', minutes:50, intensity:'hard', movements:['바벨 스쿼트 4×6–8', '벤치 프레스 4×6–8', '바벨 로우 4×6–8', '오버헤드 프레스 3×8–10'], equipment:['바벨', '랙'], safetyNote },
  { id:'home-strength-bodyweight', environment:'home', style:'strength', goalFit:['cut','maintain'], metValue:3.8, title:'맨몸 근력 서킷', minutes:25, intensity:'moderate', movements:['푸시업 3×10–15', '스쿼트 3×15', '플랭크 3×30초', '런지 3×10(양쪽)'], equipment:[], safetyNote },
  { id:'gym-flex-mat', environment:'gym', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'매트 스트레칭·모빌리티', minutes:20, intensity:'easy', movements:['고양이-소 스트레칭 1분', '골반 개방 스트레칭 5분', '전신 정적 스트레칭 10분'], equipment:['매트'], safetyNote },
  { id:'home-flex-yoga', environment:'home', style:'flexibility', goalFit:['cut','maintain','bulk'], metValue:2.5, title:'홈 요가 루틴', minutes:20, intensity:'easy', movements:['태양경배자세 5분', '전굴·후굴 스트레칭 10분', '호흡과 함께 정리 5분'], equipment:['매트'], safetyNote },
  { id:'gym-hiit-circuit', environment:'gym', style:'hiit', goalFit:['cut'], metValue:8.0, title:'서킷 HIIT', minutes:25, intensity:'hard', movements:['케틀벨 스윙 40초/휴식 20초 ×8', '로잉 머신 40초/휴식 20초 ×4'], equipment:['케틀벨', '로잉 머신'], safetyNote },
  { id:'home-hiit-tabata', environment:'home', style:'hiit', goalFit:['cut'], metValue:8.0, title:'타바타 4분 라운드', minutes:16, intensity:'hard', movements:['버피 20초/휴식 10초 ×8', '마운틴 클라이머 20초/휴식 10초 ×8'], equipment:[], safetyNote },
]

export const activityTemplates:ActivityTemplate[] = [...basicTemplates, ...approvedWeekTemplates, ...newTemplates]
```

- [ ] **Step 4: Run the new test file and confirm it passes**

Run: `npx vitest run src/data/activityTemplates.test.ts`
Expected: PASS — 4 tests pass (18 unique ids, positive MET/non-empty goalFit, first-3 unchanged, all 4 styles present).

- [ ] **Step 5: Run `src/domain/activity.test.ts` and `src/domain/weeklyPlan.test.ts` and `src/domain/weeklyTrainingGuidance.test.ts` to confirm the load-bearing ids still work**

Run: `npx vitest run src/domain/activity.test.ts src/domain/weeklyPlan.test.ts src/domain/weeklyTrainingGuidance.test.ts`
Expected: PASS — all of them. `weeklyPlan.test.ts` and `weeklyTrainingGuidance.test.ts` reference `gym-basic`/`home-basic`/`walk-basic`/`gym-upper`/`gym-lower-core`/`mixed-hiit-completed`/`recovery-cardio`/`light-cardio-conditional` by exact id and by `environment`/`title`/`minutes` — none of which changed.

- [ ] **Step 6: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/activityTemplates.ts src/data/activityTemplates.test.ts
git commit -m "feat: tag exercise templates with style/goal/MET and add 10 new ones"
```

---

### Task 3: Show estimated calorie burn and cited evidence on the activity card

**Files:**
- Create: `src/components/ActivityEvidenceSheet.tsx`
- Create: `src/components/ActivityEvidenceSheet.test.tsx`
- Modify: `src/components/ActivityCard.tsx`
- Create: `src/components/ActivityCard.test.tsx`
- Modify: `src/components/TodayScreen.tsx`

**Interfaces:**
- Consumes: `estimateActivityCalories` from `src/domain/activity.ts` (Task 1). `ActivityTemplate` type (Task 1).
- Produces: `ActivityEvidenceSheet` (no props — the citation list is static), `ActivityCard`'s new required prop `weightKg: number`.

- [ ] **Step 1: Write the failing test for `ActivityEvidenceSheet`**

Create `src/components/ActivityEvidenceSheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityEvidenceSheet } from './ActivityEvidenceSheet'

describe('ActivityEvidenceSheet', () => {
  it('shows the calorie formula and both citations with working links', () => {
    render(<ActivityEvidenceSheet/>)

    expect(screen.getByText('계산 근거 보기')).toBeInTheDocument()
    expect(screen.getByText(/kcal = MET × 체중\(kg\) × \(분\/60\)/)).toBeInTheDocument()

    const compendium = screen.getByRole('link', { name: /Compendium of Physical Activities/ })
    expect(compendium).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/21681120/')

    const who = screen.getByRole('link', { name: /WHO 2020 Guidelines on Physical Activity/ })
    expect(who).toHaveAttribute('href', 'https://www.who.int/publications/i/item/9789240015128')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/components/ActivityEvidenceSheet.test.tsx`
Expected: FAIL — `Failed to resolve import "./ActivityEvidenceSheet"` (the component doesn't exist yet).

- [ ] **Step 3: Create the component**

Create `src/components/ActivityEvidenceSheet.tsx`:

```tsx
const EVIDENCE = [
  { title: 'Compendium of Physical Activities (2011 update)', publisher: 'Ainsworth et al., Medicine & Science in Sports & Exercise', url: 'https://pubmed.ncbi.nlm.nih.gov/21681120/' },
  { title: 'WHO 2020 Guidelines on Physical Activity and Sedentary Behaviour', publisher: 'World Health Organization', url: 'https://www.who.int/publications/i/item/9789240015128' },
]

export function ActivityEvidenceSheet() {
  return <details><summary>계산 근거 보기</summary><div className="equation">kcal = MET × 체중(kg) × (분/60)</div><p>MET(대사량 단위) 값은 운동 강도를 나타내는 국제 표준 지표예요.</p><ul>{EVIDENCE.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> · {item.publisher}</li>)}</ul></details>
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/components/ActivityEvidenceSheet.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing test for `ActivityCard`'s calorie display**

Create `src/components/ActivityCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityTemplate } from '../domain/activity'
import { ActivityCard } from './ActivityCard'

const ACTIVITY: ActivityTemplate = { id:'test-activity', environment:'home', style:'cardio', goalFit:['cut'], metValue:5, title:'테스트 운동', minutes:30, intensity:'moderate', movements:['동작 1', '동작 2'], equipment:[], safetyNote:'안전 문구' }

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
})
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npx vitest run src/components/ActivityCard.test.tsx`
Expected: FAIL — `ActivityCard` doesn't accept a `weightKg` prop yet, so the badge still reads `30분` (no `· 약 175 kcal` suffix) and the first two assertions fail with "Unable to find an element with the text: 30분 · 약 175 kcal". The third and fourth tests fail too, since there is no `계산 근거 보기` text yet (`getByText` throws).

- [ ] **Step 7: Update `ActivityCard`**

Replace the full contents of `src/components/ActivityCard.tsx` with:

```tsx
import { Dumbbell, Footprints, House } from 'lucide-react'
import { estimateActivityCalories, type ActivityTemplate } from '../domain/activity'
import { ActivityEvidenceSheet } from './ActivityEvidenceSheet'

const icons = { gym: Dumbbell, home: House, walk: Footprints }
export function ActivityCard({ activity, weightKg, onComplete, onSwap }: { activity: ActivityTemplate; weightKg: number; onComplete: () => void; onSwap: () => void }) {
  const Icon = icons[activity.environment]
  const kcal = estimateActivityCalories(activity, weightKg)
  return <section className="panel activity-card"><header><div className="activity-icon"><Icon aria-hidden="true" /></div><div><p className="eyebrow">오늘의 운동</p><h2>{activity.title}</h2></div><strong className="card-badge">{activity.minutes}분 · 약 {kcal} kcal</strong></header><ul>{activity.movements.map(item => <li key={item}>{item}</li>)}</ul><p className="safety-note">{activity.safetyNote}</p><ActivityEvidenceSheet/><div className="actions"><button onClick={onComplete}>운동 완료</button><button className="secondary" onClick={onSwap}>다른 운동 선택</button></div></section>
}
```

- [ ] **Step 8: Run `ActivityCard.test.tsx` and confirm it passes**

Run: `npx vitest run src/components/ActivityCard.test.tsx`
Expected: PASS — all 4 tests.

- [ ] **Step 9: Update `TodayScreen` to pass `weightKg`**

In `src/components/TodayScreen.tsx`, find this exact substring:

```
<ActivityCard activity={activity} onComplete={() => complete('activity')} onSwap={next}/>
```

Replace it with:

```
<ActivityCard activity={activity} weightKg={state.profile!.weightKg} onComplete={() => complete('activity')} onSwap={next}/>
```

(`state.profile` is guaranteed non-null here: `TodayScreen`'s only caller, `WellnessApp` in `App.tsx`, renders `<Onboarding/>` instead of `TodayScreen` whenever `!game.state.profile`.)

- [ ] **Step 10: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS — including `src/AppFlow.test.tsx` and `src/App.test.tsx`, which render `TodayScreen`/`ActivityCard` through the full app and don't assert on the exact old `30분`-only badge text (confirmed by grep before writing this plan — no test matches `getByText('30분')` or similar on this badge).

- [ ] **Step 11: Run the build to confirm no type errors**

Run: `npm run build`
Expected: succeeds (`tsc -b && vite build`), confirming the new `weightKg` prop and widened `intensity`/new fields type-check everywhere they're used.

- [ ] **Step 12: Commit**

```bash
git add src/components/ActivityEvidenceSheet.tsx src/components/ActivityEvidenceSheet.test.tsx src/components/ActivityCard.tsx src/components/ActivityCard.test.tsx src/components/TodayScreen.tsx
git commit -m "feat: show estimated calorie burn and cited evidence on the activity card"
```

---

## Final check (whole-plan reviewer or controller, after all 3 tasks)

Run the full suite once more and confirm the total test count grew by exactly:
- Task 1: +3 (`estimateActivityCalories` cases)
- Task 2: +4 (`activityTemplates.test.ts`, new file)
- Task 3: +5 (1 `ActivityEvidenceSheet.test.tsx` + 4 `ActivityCard.test.tsx`, both new files)

Run: `npm test -- --run` and `npm run build`. Both must be clean before considering this plan done.
