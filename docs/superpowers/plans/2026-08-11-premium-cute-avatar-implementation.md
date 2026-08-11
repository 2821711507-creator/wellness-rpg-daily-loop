# Premium Cute Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current avatar with a detailed 96×144 premium pixel character that starts in a fixed wellness underlayer and permanently unlocks optional clothing, shoes, hats, accessories, and hairstyles through healthy-action levels.

**Architecture:** Keep the existing `AvatarState` and version-one repository boundary. A pure avatar progression module derives permanent unlocks from game levels; the manifest owns level requirements and optional-slot metadata; the renderer composes original project-owned pixel layers; the hook applies grants whenever a quest changes the level. UI components never calculate unlocks or write storage directly.

**Tech Stack:** React 19, TypeScript 5, Vite 8, Vitest, Testing Library, SVG `<rect>` layers, CSS custom properties.

## Global Constraints

- Logical avatar canvas is exactly `96 × 144` with integer coordinates and `shape-rendering="crispEdges"`.
- New profiles begin with a fixed sleeveless inner top, fitted exercise shorts, bare feet, and only short/bob hair unlocked.
- Gender, skin, and unlocked clothing are unrestricted across one another; body shape never responds to weight, calories, or progress.
- Cosmetic rewards derive only from game level earned through completed healthy actions.
- Existing persisted unlocked/equipped item IDs remain owned and equipped after migration.
- New unlocks are permanent, idempotent, announced, and never auto-equipped.
- Top, bottom, shoes, hat, and accessory are optional and can be unequipped.
- Do not copy pixels, characters, clothing, animal traits, poses, effects, or watermarks from references.
- Primary controls keep visible focus, 44px minimum touch targets, Korean labels, and non-color state indicators.
- Respect `prefers-reduced-motion`.

---

## Planned File Structure

```text
src/domain/avatar.ts                         avatar normalization, equip/unequip, layer resolution
src/domain/avatarProgression.ts              pure level-to-unlock derivation
src/domain/avatarProgression.test.ts         progression and idempotency tests
src/data/avatarManifest.ts                   item catalog and unlock levels
src/data/avatarPixelLayers.ts                original 96×144 project-owned pixel art
src/components/AvatarRenderer.tsx            palette resolution and SVG composition
src/components/AvatarRenderer.test.tsx       canvas, face groups, accessible name
src/components/AvatarCustomizer.tsx          unlocked/locked/empty slot controls and reward preview
src/components/AvatarCustomizer.test.tsx     customizer interaction and locked-state coverage
src/hooks/useWellnessGame.ts                 quest-to-level-to-avatar grant integration
src/hooks/useWellnessGame.test.tsx           restore and grant integration tests
src/AppFlow.test.tsx                         user-visible level reward persistence flow
src/avatar.css                               96×144 stage sizing and locked/reward presentation
```

---

### Task 1: Optional Slots and Level Progression Domain

**Files:**
- Create: `src/domain/avatarProgression.ts`
- Create: `src/domain/avatarProgression.test.ts`
- Modify: `src/domain/avatar.ts`
- Modify: `src/domain/avatar.test.ts`

**Interfaces:**
- Consumes: `AvatarState`, `AvatarSelectionSlot`, manifest item IDs.
- Produces: `unequipItem(state:AvatarState, slot:AvatarSelectionSlot):AvatarState`, `grantAvatarUnlocks(state:AvatarState, previousLevel:number, currentLevel:number):AvatarUnlockResult`.

- [ ] **Step 1: Write failing optional-slot tests**

Add tests proving top, bottom, shoes, hat, and accessory can be absent and hair cannot be unequipped:

```ts
it('unequips optional clothing without changing the base or hair', () => {
  const state = { ...AVATAR_DEFAULTS, equipped:{ hair:'hair-short', top:'top-runner', shoes:'shoes-trainers' } }
  expect(unequipItem(state, 'top').equipped).toEqual({ hair:'hair-short', shoes:'shoes-trainers' })
  expect(() => unequipItem(state, 'hair')).toThrow('머리는 해제할 수 없습니다.')
})

it('normalizes a new empty clothing state without adding defaults', () => {
  const result = normalizeAvatarState({ gender:'female', skin:'medium', unlockedIds:['hair-short'], equipped:{ hair:'hair-short' } })
  expect(result.equipped).toEqual({ hair:'hair-short' })
})
```

- [ ] **Step 2: Run optional-slot tests and confirm red**

Run: `npm test -- src/domain/avatar.test.ts`

Expected: FAIL because `unequipItem` does not exist and normalization still injects required clothing defaults.

- [ ] **Step 3: Implement optional clothing semantics**

In `avatar.ts`, add `unlockLevel?:number` to `AvatarPart`, make only hair required, and add:

```ts
const REQUIRED: AvatarSelectionSlot[] = ['hair']
const UNEQUIPPABLE: AvatarSelectionSlot[] = ['top', 'bottom', 'shoes', 'hat', 'accessory']

export function unequipItem(state:AvatarState, slot:AvatarSelectionSlot):AvatarState {
  if (!UNEQUIPPABLE.includes(slot)) throw new Error('머리는 해제할 수 없습니다.')
  const equipped = { ...state.equipped }
  delete equipped[slot]
  return { ...state, equipped }
}
```

Keep `getAvatarLayerIds` unchanged in ordering but allow all optional slots to contribute zero layers.

- [ ] **Step 4: Write failing progression tests**

```ts
it('grants every crossed level once without equipping items', () => {
  const state = { ...AVATAR_DEFAULTS, unlockedIds:['hair-short', 'hair-bob'], equipped:{ hair:'hair-short' } }
  const result = grantAvatarUnlocks(state, 1, 4)
  expect(result.newIds).toEqual(['hair-wave', 'shoes-trainers', 'top-runner', 'bottom-pants'])
  expect(result.state.equipped).toEqual({ hair:'hair-short' })
  expect(grantAvatarUnlocks(result.state, 1, 4).newIds).toEqual([])
})

it('does not use weight or calories as progression input', () => {
  expect(grantAvatarUnlocks.length).toBe(3)
})
```

- [ ] **Step 5: Run progression tests and confirm red**

Run: `npm test -- src/domain/avatarProgression.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 6: Implement pure progression**

```ts
export interface AvatarUnlockResult { state:AvatarState; newIds:string[] }

export function grantAvatarUnlocks(state:AvatarState, previousLevel:number, currentLevel:number):AvatarUnlockResult {
  const newIds = AVATAR_PARTS
    .filter(part => part.unlockLevel !== undefined && part.unlockLevel > previousLevel && part.unlockLevel <= currentLevel)
    .sort((a, b) => (a.unlockLevel! - b.unlockLevel!) || a.id.localeCompare(b.id))
    .map(part => part.id)
    .filter(id => !state.unlockedIds.includes(id))
  return {
    state:{ ...state, unlockedIds:[...state.unlockedIds, ...newIds] },
    newIds,
  }
}
```

- [ ] **Step 7: Run domain tests**

Run: `npm test -- src/domain/avatar.test.ts src/domain/avatarProgression.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/avatar.ts src/domain/avatar.test.ts src/domain/avatarProgression.ts src/domain/avatarProgression.test.ts
git commit -m "feat: add avatar cosmetic progression"
```

---

### Task 2: Reward Catalog and Safe Migration Defaults

**Files:**
- Modify: `src/domain/avatar.ts`
- Modify: `src/domain/avatar.test.ts`
- Modify: `src/data/avatarManifest.ts`

**Interfaces:**
- Consumes: `AvatarPart`, `AvatarState`.
- Produces: `unlockLevel?:number` metadata, level-one `AVATAR_DEFAULTS`, hat/accessory catalog entries.

- [ ] **Step 1: Write failing catalog tests**

```ts
it('starts in an underlayer with no optional equipment', () => {
  expect(AVATAR_DEFAULTS.unlockedIds).toEqual(['hair-short', 'hair-bob'])
  expect(AVATAR_DEFAULTS.equipped).toEqual({ hair:'hair-short' })
})

it('defines the approved deterministic reward track', () => {
  expect(Object.fromEntries(AVATAR_PARTS.filter(p => p.unlockLevel).map(p => [p.id, p.unlockLevel]))).toMatchObject({
    'shoes-trainers':2, 'hair-wave':2, 'top-runner':3, 'bottom-pants':4,
    'shoes-walk':5, 'hair-tied':5, 'top-gym':6, 'bottom-shorts':6,
    'top-walk':7, 'hat-wellness-cap':8, 'accessory-bottle-pouch':9,
  })
})
```

- [ ] **Step 2: Run tests and confirm red**

Run: `npm test -- src/domain/avatar.test.ts src/domain/avatarProgression.test.ts`

Expected: FAIL because defaults unlock everything and catalog items have no `unlockLevel`.

- [ ] **Step 3: Extend the manifest type and catalog**

Use the `unlockLevel?:number` field added in Task 1. Add original project-owned items:

```ts
{ id:'hat-wellness-cap', name:'웰니스 캡', slot:'hat', selectionSlot:'hat', unlockLevel:8, author:'project', license:'project-owned' },
{ id:'accessory-bottle-pouch', name:'물병 크로스백', slot:'accessory', selectionSlot:'accessory', unlockLevel:9, author:'project', license:'project-owned' },
```

Assign the exact levels from the approved table and replace defaults with:

```ts
export const AVATAR_DEFAULTS:AvatarState = {
  gender:'male', skin:'medium', unlockedIds:['hair-short', 'hair-bob'], equipped:{ hair:'hair-short' },
}
```

- [ ] **Step 4: Preserve legacy ownership during normalization**

Ensure `normalizeAvatarState` unions only valid stored IDs with starter IDs. It must not infer locked items from the current level, because level reconciliation belongs to `grantAvatarUnlocks`.

- [ ] **Step 5: Run domain tests**

Run: `npm test -- src/domain/avatar.test.ts src/domain/avatarProgression.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/avatar.ts src/domain/avatar.test.ts src/data/avatarManifest.ts src/domain/avatarProgression.test.ts
git commit -m "feat: define avatar reward catalog"
```

---

### Task 3: Premium 96×144 Base Character and Layers

**Files:**
- Modify: `src/data/avatarPixelLayers.ts`
- Modify: `src/components/AvatarRenderer.tsx`
- Modify: `src/components/AvatarRenderer.test.tsx`

**Interfaces:**
- Consumes: manifest layer IDs and `AvatarState`.
- Produces: 96×144 original pixel layers, four-step local palettes, required `data-face-feature` groups.

- [ ] **Step 1: Write failing renderer-contract tests**

```tsx
it('renders the premium 96 by 144 grid and readable face groups', () => {
  render(<AvatarRenderer state={AVATAR_DEFAULTS}/>)
  const avatar = screen.getByRole('img')
  expect(avatar).toHaveAttribute('viewBox', '0 0 96 144')
  for (const feature of ['eyes', 'brows', 'nose', 'mouth', 'underlayer']) {
    expect(avatar.querySelector(`[data-face-feature="${feature}"]`)).toBeTruthy()
  }
})

it('renders no optional clothing or shoes for defaults', () => {
  render(<AvatarRenderer state={AVATAR_DEFAULTS}/>)
  expect(screen.getByRole('img').querySelector('[data-layer-id^="top-"]')).toBeNull()
  expect(screen.getByRole('img').querySelector('[data-layer-id^="shoes-"]')).toBeNull()
})
```

- [ ] **Step 2: Run tests and confirm red**

Run: `npm test -- src/components/AvatarRenderer.test.tsx`

Expected: FAIL with the old `0 0 64 96` viewBox and missing face groups.

- [ ] **Step 3: Replace pixel fill vocabulary**

Use explicit four-step families:

```ts
export type PixelFill =
  | 'skinLight'|'skin'|'skinShade'|'skinDeep'
  | 'hairLight'|'hair'|'hairShade'|'hairDeep'
  | 'fabricLight'|'fabric'|'fabricShade'|'fabricDeep'
  | 'shoeLight'|'shoe'|'shoeShade'|'outline'|'eye'|'eyeLight'|'mouth'|'innerTop'|'innerBottom'
```

Keep all `PixelRect` coordinates integer-valued and inside `0..96 × 0..144`.

- [ ] **Step 4: Draw the original base and underlayer**

Build male and female bases using the approved anchors: head box `x=22..74, y=8..59`, eye line `y=34..39`, shoulder points near `(20,64)` and `(76,64)`, waist `y=98`, shoe baselines `y=139/136`. Include separate arrays for `eyes`, `brows`, `nose`, `mouth`, and `underlayer` so the renderer can group them semantically.

- [ ] **Step 5: Rebuild swappable layers**

Rebuild short, bob, wave, and tied hair plus every top, bottom, and shoe on the new anchors. Add `hat-wellness-cap` and `accessory-bottle-pouch`. Each family uses base, two shadow steps, and one highlight step; do not trace either supplied reference.

- [ ] **Step 6: Update the renderer**

Set `viewBox="0 0 96 144"`, expand CSS palette variables, render semantic face groups, and generate accessible names that omit empty clothing slots and include equipped hat/accessory names.

- [ ] **Step 7: Add pixel-boundary validation**

```ts
it('keeps every pixel rectangle on the 96 by 144 integer grid', () => {
  for (const pixels of Object.values(AVATAR_PIXEL_LAYERS)) for (const pixel of pixels) {
    expect([pixel.x,pixel.y,pixel.width,pixel.height].every(Number.isInteger)).toBe(true)
    expect(pixel.x).toBeGreaterThanOrEqual(0)
    expect(pixel.y).toBeGreaterThanOrEqual(0)
    expect(pixel.x + pixel.width).toBeLessThanOrEqual(96)
    expect(pixel.y + pixel.height).toBeLessThanOrEqual(144)
  }
})
```

- [ ] **Step 8: Run renderer and domain tests**

Run: `npm test -- src/components/AvatarRenderer.test.tsx src/domain/avatar.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/avatarPixelLayers.ts src/components/AvatarRenderer.tsx src/components/AvatarRenderer.test.tsx
git commit -m "feat: draw premium pixel avatar layers"
```

---

### Task 4: Customizer Empty Slots, Locked Items, and Reward Preview

**Files:**
- Modify: `src/components/AvatarCustomizer.tsx`
- Modify: `src/components/AvatarCustomizer.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/avatar.css`

**Interfaces:**
- Consumes: `gameLevel:number`, manifest `unlockLevel`, `unequipAvatarItem(slot)` hook command.
- Produces: visible locked items, empty-slot controls, next-three-reward list.

- [ ] **Step 1: Write failing customizer tests**

```tsx
it('shows empty clothing choices and disables future rewards', async () => {
  render(<AvatarCustomizer state={AVATAR_DEFAULTS} gameLevel={1} onUnequip={onUnequip} {...handlers}/>)
  expect(screen.getByRole('button', { name:'상의 없음' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name:/러닝복.*레벨 3/ })).toBeDisabled()
  expect(screen.getByText('다음 보상')).toBeInTheDocument()
})
```

Add a test that clicks `신발 없음`, verifies `onUnequip('shoes')`, and confirms locked items cannot call `onEquip`.

- [ ] **Step 2: Run tests and confirm red**

Run: `npm test -- src/components/AvatarCustomizer.test.tsx`

Expected: FAIL because the props and locked/empty controls do not exist.

- [ ] **Step 3: Render all catalog choices with explicit state**

For optional groups, prepend an empty choice. Render unlocked items as buttons and locked items as disabled buttons labelled `레벨 N에 해금`. Add hat and accessory groups.

- [ ] **Step 4: Add the next-three-reward list**

Sort locked items by `unlockLevel`, then ID, and display the first three unique level/item pairs. Use text plus lock icon; do not rely on opacity or color alone.

- [ ] **Step 5: Wire App props and focus behavior**

Pass `game.state.game.level`, `game.unequipAvatarItem`, and the existing equip handler. Preserve Escape close and trigger focus restoration.

- [ ] **Step 6: Style the 96×144 preview and reward controls**

Set integer-friendly preview sizes at 192px and 288px where space permits, keep `image-rendering:pixelated`, retain 44px controls, and add mobile wrapping without horizontal overflow.

- [ ] **Step 7: Run component tests**

Run: `npm test -- src/components/AvatarCustomizer.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/AvatarCustomizer.tsx src/components/AvatarCustomizer.test.tsx src/App.tsx src/avatar.css
git commit -m "feat: show avatar reward progression"
```

---

### Task 5: Hook Integration, Persistence, and Full Flow

**Files:**
- Modify: `src/hooks/useWellnessGame.ts`
- Modify: `src/hooks/useWellnessGame.test.tsx`
- Modify: `src/AppFlow.test.tsx`

**Interfaces:**
- Consumes: `completeQuest`, `grantAvatarUnlocks`, `unequipItem`.
- Produces: `avatarUnlockMessage:string`, `unequipAvatarItem(slot)`, persisted idempotent unlock flow.

- [ ] **Step 1: Write failing hook integration tests**

```tsx
it('grants crossed-level cosmetics once and never auto-equips them', () => {
  const repository = memoryRepository(levelOneStateWithNinetyXp)
  const { result } = renderHook(() => useWellnessGame({ repository, now:fixedNow }))
  act(() => result.current.complete('recovery'))
  expect(result.current.state.game.level).toBe(2)
  expect(result.current.state.avatar.unlockedIds).toEqual(expect.arrayContaining(['hair-wave','shoes-trainers']))
  expect(result.current.state.avatar.equipped).toEqual({ hair:'hair-short' })
  expect(result.current.avatarUnlockMessage).toContain('운동화')
})
```

Add restore coverage proving legacy unlocked/equipped items survive below-level requirements and remounting does not duplicate an unlock message.

- [ ] **Step 2: Run hook tests and confirm red**

Run: `npm test -- src/hooks/useWellnessGame.test.tsx`

Expected: FAIL because quest completion does not reconcile avatar unlocks.

- [ ] **Step 3: Integrate progression into quest completion**

Inside the existing functional `setState`, retain the previous level, call `completeQuest`, then call `grantAvatarUnlocks(current.avatar, current.game.level, game.level)`. Store the returned avatar and derive a Korean message from newly unlocked manifest names.

- [ ] **Step 4: Add unequip command**

```ts
unequipAvatarItem: (slot:AvatarSelectionSlot) =>
  setState(current => ({ ...current, avatar:unequipItem(current.avatar, slot) })),
```

- [ ] **Step 5: Add end-to-end flow test**

Onboard, complete a quest that crosses level 2, open Customize, verify 운동화 is enabled but not equipped, equip it, remount, and verify the shoes and accessible avatar name persist.

- [ ] **Step 6: Run full automated verification**

Run: `npm test && npm run build`

Expected: 0 failed tests and successful Vite production build.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useWellnessGame.ts src/hooks/useWellnessGame.test.tsx src/AppFlow.test.tsx
git commit -m "feat: persist avatar level rewards"
```

---

### Task 6: Visual and Accessibility Verification

**Files:**
- Modify only if verification reveals defects: `src/avatar.css`, `src/components/AvatarRenderer.tsx`, `src/components/AvatarCustomizer.tsx`, related tests.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified responsive, readable, keyboard-accessible avatar experience.

- [ ] **Step 1: Start the app**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL without compile errors.

- [ ] **Step 2: Inspect required sizes**

Capture Today and Customize at 390px, 1024px, and 1440px. At each width verify zero horizontal overflow, a visible human face, distinct hair/clothing boundaries, and no clipped shadow or forward foot.

- [ ] **Step 3: Inspect pixel scales**

Capture the anchor at native 96×144, 192×288, and 384×576. Verify square pixels, no smoothing, readable eyes/nose/mouth, and no mixed-resolution edges.

- [ ] **Step 4: Verify keyboard and reduced motion**

Tab through all selectors, activate an unlocked item with Enter, confirm locked items cannot activate, close with Escape, and verify focus returns to `캐릭터 꾸미기`. Enable reduced motion and verify breathing translation is disabled.

- [ ] **Step 5: Fix only observed defects with regression tests**

For each defect, add a failing focused test, reproduce it, apply the smallest fix, and rerun the focused test before continuing.

- [ ] **Step 6: Run final verification**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: zero failed tests, successful build, no whitespace errors, and only intentional changes.

- [ ] **Step 7: Commit verification fixes if any**

```bash
git add src
git commit -m "fix: polish premium avatar presentation"
```
