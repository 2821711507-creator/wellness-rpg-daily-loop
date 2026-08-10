# Wellness RPG Daily Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first single-user web app that turns evidence-labelled nutrition, smoothie tracking, gym/home/walk activities, and daily quests into pixel-avatar progression.

**Architecture:** React components consume state through one `useWellnessGame` hook. Pure domain modules own nutrition, activity, quest, reward, and avatar rules; a versioned repository boundary isolates browser persistence so a server repository can replace it later. Phase 1 has no real authentication, social features, weekly auto-planning, GPS, or AI coach.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Vitest, Testing Library, user-event, jsdom, CSS custom properties, Lucide React.

## Global Constraints

- Mobile-first responsive UI.
- Supported activities: gym machines, equipment-free home workouts, and walks.
- Nutrition results show formula, source, and version and are not medical advice.
- Rewards come from completed healthy actions, never weight lost or calories undereaten.
- Masculine and feminine pixel bases are freely selectable and unrelated to profile sex.
- Avatar body shape never changes with weight.
- Primary actions support keyboard and touch; state is not conveyed by color alone.
- Respect `prefers-reduced-motion`.
- Persist behind a repository interface; no real auth or friends in this plan.

## Planned File Structure

```text
index.html
package.json
vite.config.ts
tsconfig*.json
src/main.tsx
src/App.tsx
src/styles.css
src/domain/{profile,nutrition,smoothie,activity,game,avatar}.ts
src/data/{ingredients,activityTemplates}.ts
src/repositories/{wellnessRepository,localStorageWellnessRepository}.ts
src/hooks/useWellnessGame.ts
src/components/{Onboarding,TodayScreen,SmoothieCard,ActivityCard,QuestBoard,AvatarCard,EvidenceSheet}.tsx
src/test/setup.ts
src/**/*.test.ts(x)
public/avatar/*
```

---

### Task 1: Foundation and Test Harness

**Files:** Create `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:** Produces `npm test`, `npm run build`, and `App`.

- [ ] Write a failing test:

```tsx
render(<App />)
expect(screen.getByRole('heading', { name: '오늘의 모험' })).toBeInTheDocument()
```

- [ ] Configure Vite, strict TypeScript, jsdom, jest-dom, cleanup, and scripts `dev`, `build`, `test`.
- [ ] Run `npm test -- src/App.test.tsx`; expect missing app failure.
- [ ] Implement `App` as `<main><h1>오늘의 모험</h1></main>`, Korean metadata, 44px touch targets, focus tokens, and reduced-motion CSS.
- [ ] Run `npm test -- src/App.test.tsx && npm run build`; expect pass.
- [ ] Commit with `git commit -m "chore: scaffold wellness RPG"`.

### Task 2: Profile and Evidence-Labelled Nutrition

**Files:** Create `src/domain/profile.ts`, `src/domain/nutrition.ts`, their tests, `src/components/Onboarding.tsx`, `src/components/EvidenceSheet.tsx` and tests.

**Interfaces:**

```ts
type CalculationSex = 'female' | 'male'
type ActivityLevel = 'sedentary' | 'light' | 'moderate'
interface UserProfile { age:number; heightCm:number; weightKg:number; calculationSex:CalculationSex; activityLevel:ActivityLevel }
interface Evidence { title:string; publisher:string; version:string; url:string }
interface NutritionTarget { maintenanceKcal:number; targetKcal:number; proteinGrams:number; evidence:Evidence[]; warnings:string[] }
function calculateNutritionTarget(profile: UserProfile): NutritionTarget
```

- [ ] Test rejection of age below 18 and non-positive height/weight.
- [ ] Test a 30-year-old, 175cm, 80kg male with light activity: Mifflin-St Jeor BMR `1749`, factor `1.375`, 15% deficit, protein `128g`.
- [ ] Run `npm test -- src/domain/profile.test.ts src/domain/nutrition.test.ts`; expect missing modules.
- [ ] Implement `10w + 6.25h - 5a + s` with `s=5/-161`, factors `1.2/1.375/1.55`, `Math.round`, and `1.6g/kg`.
- [ ] Attach NIDDK safe-program evidence and formula citation; unsupported profiles return warnings rather than fabricated targets.
- [ ] Build onboarding with an explanation that calculation sex is private and separate from avatar choice.
- [ ] Run domain/component tests and build; commit `feat: add evidence-labelled nutrition onboarding`.

### Task 3: Smoothie Meal Calculator

**Files:** Create `src/domain/smoothie.ts`, `src/data/ingredients.ts`, tests, `src/components/SmoothieCard.tsx`.

**Interfaces:**

```ts
interface Nutrients { kcal:number; protein:number; carbs:number; fat:number; fiber:number }
interface Ingredient { id:string; name:string; per100g:Nutrients; sourceLabel:string }
interface SmoothieItem { ingredientId:string; grams:number }
function calculateSmoothie(items: SmoothieItem[], ingredients: Ingredient[]): Nutrients & {warnings:string[]}
```

- [ ] Test totals for 40g oats, 150g unsweetened yogurt, 200g unsweetened soy milk, 100g banana, 60g spinach using `per100g * grams / 100`.
- [ ] Test invalid quantities and the exact warning `단백질이 낮은 식사입니다.` below 20g.
- [ ] Run `npm test -- src/domain/smoothie.test.ts`; expect missing module.
- [ ] Add demonstration defaults for oats, yogurt, fortified soy milk, banana, berries, spinach, and carrot; require users to verify product labels.
- [ ] Implement editable grams, totals, warning, and “제품 라벨 값으로 수정”; do not label food healthy solely because it contains produce.
- [ ] Run tests/build; commit `feat: add smoothie meal calculator`.

### Task 4: Gym, Home, and Walk Activities

**Files:** Create `src/domain/activity.ts`, `src/data/activityTemplates.ts`, tests, `src/components/ActivityCard.tsx`.

**Interfaces:**

```ts
type ActivityEnvironment = 'gym' | 'home' | 'walk'
interface ActivityTemplate { id:string; environment:ActivityEnvironment; title:string; minutes:number; intensity:'easy'|'moderate'; movements:string[]; safetyNote:string }
function getAlternatives(activity: ActivityTemplate, all: ActivityTemplate[]): ActivityTemplate[]
```

- [ ] Test gym templates contain machine movements, home requires no equipment, and a missed 30-minute gym session offers home or a 40-minute brisk walk without claiming calorie equivalence.
- [ ] Run `npm test -- src/domain/activity.test.ts`; expect missing module.
- [ ] Add beginner templates: gym leg press/chest press/seated row/leg curl/shoulder press, 2×8–12; home chair squat/wall push-up/glute bridge/bird dog, 2×8–12; walk 5 easy + 20 brisk + 5 easy minutes.
- [ ] Every template includes “날카로운 통증이나 이상 증상이 있으면 중단하세요.”
- [ ] Implement environment, duration, movements, completion, and “오늘 다른 방식으로” controls.
- [ ] Run tests/build; commit `feat: add flexible daily activities`.

### Task 5: Quests, Rewards, and Pixel Avatar

**Files:** Create `src/domain/game.ts`, `src/domain/avatar.ts`, tests, `src/components/QuestBoard.tsx`, `src/components/AvatarCard.tsx`, `public/avatar/*`.

**Interfaces:**

```ts
interface Quest { id:string; title:string; kind:'meal-log'|'activity'|'recovery'; xp:number; coins:number; completed:boolean }
interface GameState { level:number; xp:number; coins:number; quests:Quest[]; processedEventIds:string[] }
function completeQuest(state:GameState, questId:string, eventId:string):GameState
type AvatarBase = 'masculine'|'feminine'
type AvatarSlot = 'base'|'bottom'|'top'|'shoes'|'hair'|'hat'|'accessory'
interface AvatarState { base:AvatarBase; unlockedIds:string[]; equipped:Partial<Record<AvatarSlot,string>> }
function equipItem(state:AvatarState, itemId:string):AvatarState
```

- [ ] Test one reward per quest/event, 100 XP level-up with remainder, and no weight/calorie-deficit reward input.
- [ ] Test free base switching, items on either base, locked-item rejection, and layer order `base,bottom,top,shoes,hair,hat,accessory`.
- [ ] Run game/avatar tests; expect missing modules.
- [ ] Implement immutable rewards and retain the last 200 event IDs.
- [ ] Create original 16-bit-inspired SVG bases and one starter outfit with a manifest containing author, license, and slot; do not copy generated or third-party art.
- [ ] Implement reduced-motion-safe completion feedback and stacked accessible SVG layers.
- [ ] Run tests/build; commit `feat: add wellness quests and pixel avatar`.

### Task 6: Persistence and Full Daily Loop

**Files:** Create repository files/tests, `src/hooks/useWellnessGame.ts` and tests, `src/components/TodayScreen.tsx`, `src/AppFlow.test.tsx`; modify `src/App.tsx`, `src/styles.css`.

**Interfaces:**

```ts
interface WellnessRepository { load(): LoadResult; save(state:PersistedState): void }
interface PersistedState { version:1; profile:UserProfile; nutritionTarget:NutritionTarget; smoothie:SmoothieItem[]; selectedActivityId:string; game:GameState; avatar:AvatarState }
```

- [ ] Test valid restore, malformed JSON recovery warning, save failure retaining memory state, and no duplicate reward after reload.
- [ ] Run `npm test -- src/repositories src/hooks`; expect missing modules.
- [ ] Implement key `wellness-rpg:v1`; components never call `localStorage` directly.
- [ ] Write a user-flow test: onboard, see cited target, edit smoothie grams, select a walk, complete its quest, see XP/coins rise, remount, and see the same avatar.
- [ ] Compose a mobile-first Today screen with a compact pixel-RPG direction and locked labels for later Plan/Record/Friends screens.
- [ ] Run `npm test && npm run build`; expect zero failures and a successful bundle.
- [ ] Manually verify 390px/1440px, keyboard, focus, touch, and reduced motion.
- [ ] Commit `feat: complete wellness RPG daily loop`.

## Final Verification

- [ ] Run `npm test` and confirm zero failures.
- [ ] Run `npm run build` and confirm success.
- [ ] Run `rg -n 'T[B]D|TO[D]O|FIX[M]E' src docs/superpowers/plans/2026-08-10-wellness-rpg-daily-loop.md`; expect no placeholders.
- [ ] Confirm `git status --short` contains only intentional changes.
- [ ] Confirm later-stage exclusions are documented: real auth, friends, weekly auto-plans, reward boxes/shop, GPS, wearables, AI coach.
