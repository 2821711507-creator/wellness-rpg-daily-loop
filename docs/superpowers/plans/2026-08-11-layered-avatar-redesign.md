# Layered Avatar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary CSS figure with an original full-body layered SVG character that has explicit male and female choices, interchangeable appearance parts, safe persistence migration, and a simple customizer.

**Architecture:** A pure avatar catalog and resolver own all part metadata, defaults, compatibility, migration, and layer order. React renders resolved project-owned pixel layers into one accessible SVG, while `useWellnessGame` persists only selected IDs and exposes small update commands. The existing Today card remains compact and opens a dedicated customizer without adding a router or shop.

**Tech Stack:** React 19, TypeScript 5, native SVG, Vite 8, Vitest 4, Testing Library, CSS custom properties.

## Global Constraints

- Character gender is exactly `male | female`, displayed as `남성 캐릭터 | 여성 캐릭터`.
- Character gender remains independent from nutrition calculation sex and can be changed freely.
- Existing `masculine | feminine` values migrate without resetting unrelated state.
- Hair and clothing have no gender restriction.
- Body shape never changes from weight, calorie intake, or progress.
- The logical canvas is 64×96 and layer order is `hairBack,base,bottom,top,shoes,hairFront,hat,accessory`.
- All shipped art is original, recorded as `project-owned`, and does not copy DiceBear artwork.
- Initial assets are 2 bases, 3 skin tones, 4 hairstyles, 3 tops, 2 bottoms, and 2 shoes.
- Unknown required selections fall back to catalog defaults; unknown optional selections render nothing.
- Controls have a 44px minimum target, visible focus, text selection state, and reduced-motion support.
- No store, loot boxes, payments, 3D, uploads, multiple poses, directional sprites, or walking animation.
- Do not claim visual completion before rendered review and zero-overflow measurement at 390px and 1024px.

---

### Task 1: Typed Avatar Catalog and State Migration

**Files:**
- Create: `src/data/avatarManifest.ts`
- Modify: `src/domain/avatar.ts`
- Modify: `src/domain/avatar.test.ts`
- Modify: `public/avatar/manifest.json`

**Interfaces:**

```ts
export type AvatarGender = 'male'|'female'
export type AvatarSkin = 'light'|'medium'|'deep'
export type AvatarSlot = 'base'|'bottom'|'top'|'shoes'|'hairBack'|'hairFront'|'hat'|'accessory'
export type AvatarSelectionSlot = 'hair'|'top'|'bottom'|'shoes'|'hat'|'accessory'
export interface AvatarState {
  gender:AvatarGender
  skin:AvatarSkin
  unlockedIds:string[]
  equipped:Partial<Record<AvatarSelectionSlot,string>>
}
export interface AvatarPart {
  id:string
  name:string
  slot:AvatarSlot
  selectionSlot:AvatarSelectionSlot|'base'
  author:'project'
  license:'project-owned'
}
export const AVATAR_DEFAULTS: AvatarState
export const AVATAR_PARTS: AvatarPart[]
export function normalizeAvatarState(value:unknown):AvatarState
export function selectGender(state:AvatarState, gender:AvatarGender):AvatarState
export function selectSkin(state:AvatarState, skin:AvatarSkin):AvatarState
export function equipItem(state:AvatarState, itemId:string):AvatarState
export function getAvatarLayerIds(state:AvatarState):string[]
```

- [ ] Write failing domain tests that normalize `{base:'masculine'}` to `gender:'male'` and `{base:'feminine'}` to `gender:'female'` while retaining valid unlocked/equipped IDs.
- [ ] Add a failing legacy-ID assertion that migrates `runner-top` to `top-runner` in both `unlockedIds` and `equipped.top`.
- [ ] Write a failing test that invalid gender, skin, or required equipped IDs resolve to `AVATAR_DEFAULTS`, but an unknown optional hat/accessory is omitted.
- [ ] Write a failing parameterized test proving all four hairstyles and all clothing items equip on both genders.
- [ ] Write a failing test expecting layer IDs in exact order `base,bottom,top,shoes,hairBack,hairFront,hat,accessory`.
- [ ] Run `npm test -- --run src/domain/avatar.test.ts`; expect failures for the new types and functions.
- [ ] Define catalog IDs `hair-short`, `hair-bob`, `hair-wave`, `hair-tied`, `top-runner`, `top-gym`, `top-walk`, `bottom-pants`, `bottom-shorts`, `shoes-trainers`, and `shoes-walk` in `avatarManifest.ts`.
- [ ] Put every first-release selectable part in `AVATAR_DEFAULTS.unlockedIds`; rewards and locked catalog entries are outside this plan.
- [ ] Implement `normalizeAvatarState` as a pure function; never mutate its input and never read storage.
- [ ] Update `public/avatar/manifest.json` so every asset has `author:"project"`, `license:"project-owned"`, a Korean display name, slot, and `grid:"64x96"`.
- [ ] Run the focused test and `npm run build`; expect success.
- [ ] Commit with `git commit -m "feat: add layered avatar catalog"`.

### Task 2: Original Pixel SVG Renderer

**Files:**
- Create: `src/components/AvatarRenderer.tsx`
- Create: `src/components/AvatarRenderer.test.tsx`
- Create: `src/data/avatarPixelLayers.ts`
- Modify: `src/styles.css`

**Interfaces:**

```ts
export interface PixelRect { x:number; y:number; width:number; height:number; fill:'skin'|'skinShade'|'hair'|'hairShade'|'fabric'|'fabricShade'|'shoe'|'ink'|'white' }
export type AvatarPixelLayer = Record<string, PixelRect[]>
export const AVATAR_PIXEL_LAYERS:AvatarPixelLayer
export function AvatarRenderer(props:{ state:AvatarState; className?:string }):JSX.Element
```

- [ ] Write a failing renderer test expecting one `<svg viewBox="0 0 64 96">`, `role="img"`, and accessible name `남성 캐릭터, 짧은 머리, 러닝복, 트레이닝 바지, 운동화` for defaults.
- [ ] Write a failing test that changes gender, skin, hair, top, bottom, and shoes and observes the corresponding `data-layer-id` groups in catalog order.
- [ ] Write a failing test that every resolved layer ID has at least one rectangle and all rectangles remain inside `0≤x<64`, `0≤y<96`, with positive width and height.
- [ ] Run `npm test -- --run src/components/AvatarRenderer.test.tsx`; expect a missing-module failure.
- [ ] Draw original base faces and bodies using integer-coordinate rectangles; give male and female bases visibly distinct silhouettes without changing height or implying weight.
- [ ] Draw three skin palettes, four two-part hairstyles, three tops, two bottoms, and two shoes; reuse palette tokens rather than duplicating color literals across rectangles.
- [ ] Render layers as `<g data-layer-id={id}>` and pixels as crisp `<rect>` elements with `shapeRendering="crispEdges"`.
- [ ] Add `.avatar-renderer{image-rendering:pixelated}` and a reduced-motion rule that disables the subtle breathing transform.
- [ ] Run renderer tests, domain avatar tests, and build; expect success.
- [ ] Commit with `git commit -m "feat: render original layered pixel avatars"`.

### Task 3: Backward-Compatible Avatar Persistence

**Files:**
- Modify: `src/hooks/useWellnessGame.ts`
- Modify: `src/hooks/useWellnessGame.test.tsx`
- Modify: `src/components/TodayScreen.tsx`

**Interfaces:**

```ts
setAvatarGender(gender:AvatarGender):void
setAvatarSkin(skin:AvatarSkin):void
equipAvatarItem(itemId:string):void
```

- [ ] Write a failing hook restore test using a complete version-one state whose avatar is `{base:'feminine',unlockedIds:['runner-top'],equipped:{top:'runner-top'}}`; expect `female`, preserved non-avatar fields, and normalized new defaults.
- [ ] Write a failing corrupt-avatar test proving profile, nutrition, smoothie, game, weekly plan, weights, and completion events remain unchanged while only avatar selections reset.
- [ ] Write failing command tests for `setAvatarGender`, `setAvatarSkin`, and `equipAvatarItem`, including persistence after unmount/remount.
- [ ] Run `npm test -- --run src/hooks/useWellnessGame.test.tsx`; expect avatar shape/command failures.
- [ ] Normalize `result.state.avatar` inside the hook's one-time loader independently from weekly plan and record validation.
- [ ] Add the three commands using functional state updaters and the pure domain functions.
- [ ] Update `TodayScreen` and its prop types to consume `AvatarState` without referencing legacy `AvatarBase`.
- [ ] Run hook tests, App flow tests, and build; expect success.
- [ ] Commit with `git commit -m "feat: migrate persisted avatar selections"`.

### Task 4: Today Card and Avatar Customizer

**Files:**
- Create: `src/components/AvatarCustomizer.tsx`
- Create: `src/components/AvatarCustomizer.test.tsx`
- Modify: `src/components/AvatarCard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/AppFlow.test.tsx`
- Modify: `src/styles.css`

**Component Contract:**

```ts
interface AvatarCustomizerProps {
  state:AvatarState
  onGenderChange(gender:AvatarGender):void
  onSkinChange(skin:AvatarSkin):void
  onEquip(itemId:string):void
  onClose():void
}
```

- [ ] Write a failing `AvatarCard` test proving the CSS `.pixel-hero` figure is gone, `AvatarRenderer` is present, and a `캐릭터 꾸미기` button is available.
- [ ] Write a failing customizer test expecting labelled groups for `캐릭터 성별`, `피부색`, `머리`, `상의`, `하의`, and `신발`, with current buttons exposing `aria-pressed="true"`.
- [ ] Write a failing interaction test that clicks `여성 캐릭터`, `짙은 피부`, `웨이브 머리`, and `산보복`, then verifies callbacks and an updated accessible preview name.
- [ ] Write a failing keyboard test that tabs through every visible selector, activates one with Enter, closes with Escape, and restores focus to `캐릭터 꾸미기`.
- [ ] Write a failing App flow test that customizes the character, returns to Today, remounts, and finds the same accessible character name.
- [ ] Run `npm test -- --run src/components/AvatarCustomizer.test.tsx src/AppFlow.test.tsx`; expect missing component/view failures.
- [ ] Replace `AvatarCard`'s CSS figure with `AvatarRenderer`; keep level, XP, coins, and progress visually secondary to the character.
- [ ] Add App view `'avatar'`, render a compact top bar plus `AvatarCustomizer`, and pass hook commands without adding a router.
- [ ] Render only unlocked choices. Use native buttons with `aria-pressed`, Korean part names, and at least 44px height.
- [ ] Add a dominant preview column at desktop and a single-column layout below 1024px using the existing ivory/pale-blue tokens.
- [ ] Add Escape handling and focus restoration using a stored trigger ref; do not move focus on ordinary part selection.
- [ ] Run focused tests, full tests, and build; expect success.
- [ ] Commit with `git commit -m "feat: add layered avatar customizer"`.

### Task 5: Safety, Accessibility, and Visual Verification

**Files:** Modify only files required by verified failures.

- [ ] Run `npm test`; expect zero failing tests and zero React warnings.
- [ ] Run `npm run build`; expect a successful TypeScript and Vite production build.
- [ ] Run `rg -n 'T[B]D|TO[D]O|FIX[M]E' src public/avatar docs/superpowers/plans/2026-08-11-layered-avatar-redesign.md`; expect no matches.
- [ ] Run `rg -n 'weight|weightKg|calorie|targetKcal' src/domain/avatar.ts src/data/avatarManifest.ts src/components/AvatarRenderer.tsx src/components/AvatarCustomizer.tsx`; expect no character-shape or reward dependency.
- [ ] Restore legacy masculine and feminine fixtures and corrupt one avatar field at a time; verify unrelated state survives.
- [ ] Start the app and complete onboarding, male/female switching, every first-release hair/clothing selection, navigation, and reload with keyboard controls.
- [ ] At 390×844 measure `document.documentElement.scrollWidth-document.documentElement.clientWidth` on Today and Customizer; require `0`.
- [ ] Repeat overflow measurement at 1024px and 1440px; require `0`.
- [ ] Capture Today and Customizer screenshots at 390px and 1440px; use a separate fresh-eyes judge to inspect facial legibility, layer collisions, clipping, hierarchy, focus, and restrained color use.
- [ ] Enable reduced motion and verify the character remains understandable without breathing or completion animation.
- [ ] Run final tests/build after corrections and confirm `git status --short` contains only intentional files.
- [ ] Commit corrections, if any, with `git commit -m "fix: polish layered avatar experience"`.

## Final Acceptance Criteria

- [ ] The temporary CSS figure is completely replaced by an original accessible layered SVG character.
- [ ] Users can explicitly choose male or female characters independently from calculation sex.
- [ ] Skin, hair, top, bottom, and shoes can be combined without gender restrictions.
- [ ] Legacy avatar state migrates and corrupt avatar fields do not erase unrelated wellness data.
- [ ] Character appearance persists after reload and never changes because of weight or calorie data.
- [ ] All asset authorship and license metadata are present in `public/avatar/manifest.json`.
- [ ] Automated checks pass and real browser QA confirms zero overflow at required widths.
