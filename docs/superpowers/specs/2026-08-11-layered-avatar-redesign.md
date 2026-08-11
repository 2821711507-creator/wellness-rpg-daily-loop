# Layered Avatar Redesign

**Date:** 2026-08-11  
**Status:** Approved  
**Scope:** Replace the temporary CSS figure with an original, full-body, layered SVG character system.

## Purpose

The character should make routine completion feel rewarding without turning the wellness app into a visually heavy game. It must look intentional at mobile size, support future clothing and hair rewards, and remain independent of body weight.

## Reference Approach

The implementation will borrow the architecture—not artwork—from [DiceBear](https://github.com/dicebear/dicebear): a deterministic character is assembled from named parts while state stores only selected part IDs. DiceBear's code is MIT-licensed, but its individual styles have separate artist licenses. To avoid style-license ambiguity and to give the app a distinct full-body character, every shipped SVG part will be original and recorded as `project-owned` in the local manifest.

[M3 CharacterStudio](https://github.com/M3-org/CharacterStudio) was considered and rejected because its Three.js/VRM stack is too heavy for this lightweight 2D app. Direct use of DiceBear Pixel Art was also rejected because its available composition is less suitable for full-body clothing rewards.

## Visual Direction

- Front-facing, full-body character drawn on a consistent 32×48 logical pixel grid.
- Rendered at an integer multiple whenever practical to preserve crisp pixel edges.
- Light lifestyle-adventure tone rather than combat RPG styling.
- The app's pale blue and ivory remain dominant; clothing may use a restrained secondary color.
- A comfortable neutral smile is the default expression. Completion feedback may briefly brighten the expression.
- A subtle breathing motion is allowed. It is disabled under `prefers-reduced-motion`.
- Body shape never changes in response to weight or progress.

## Character Gender

Character gender is an explicit choice:

- `male` is displayed as `남성 캐릭터` and uses a slightly broader, straighter base silhouette.
- `female` is displayed as `여성 캐릭터` and uses a softer base silhouette.

This choice is separate from the private calculation sex used for nutrition estimates. A user may choose either character and switch at any time. Hair and clothing have no gender restriction.

Existing persisted values migrate as follows:

| Existing value | New value |
| --- | --- |
| `masculine` | `male` |
| `feminine` | `female` |

## First Asset Set

The first release includes:

- two body bases: male and female;
- three skin tones: light, medium, deep;
- four hairstyles: short, bob, wave, tied;
- three tops: runner, gym, walk;
- two bottoms: training pants, shorts;
- two shoes: trainers, walking shoes.

This scope supplies enough combinations to judge the system without prematurely building a shop or a large reward catalog. Hats, accessories, animated walking sprites, and directional poses remain later additions.

## Layer Model

The renderer uses one fixed ordering:

1. body base;
2. bottom;
3. top;
4. shoes;
5. back hair;
6. front hair;
7. hat;
8. accessory.

Each asset declares its ID, slot, display name, SVG source, author, license, and compatible logical grid. Hair may provide both a back and front layer under one selectable item. Missing optional layers render nothing.

## State and Data Flow

`AvatarState` stores only the selected gender, skin tone, unlocked item IDs, and equipped item IDs. The manifest owns all visual metadata. `AvatarRenderer` resolves state against the manifest and produces one accessible SVG.

The component boundaries are:

- `AvatarRenderer`: validates and stacks SVG parts; contains no game or persistence logic.
- `AvatarManifest`: typed catalog of parts, slots, attribution, and default selections.
- `AvatarCard`: shows the rendered character beside level, XP, and coins on Today.
- `AvatarCustomizer`: lets users switch gender, skin, hair, top, bottom, and shoes using labelled controls and live preview.
- `useWellnessGame`: owns persisted selection and exposes small avatar update commands.

The accessible name describes the current combination, for example `여성 캐릭터, 웨이브 머리, 산보복, 워킹화`.

## Recovery and Compatibility

- Unknown equipped IDs fall back to the manifest default for that slot.
- Missing optional items do not prevent the character from rendering.
- A missing or invalid gender falls back to `male` only for corrupt data; ordinary users always choose explicitly.
- Migration preserves unlocked and equipped IDs that still exist.
- Recovery of avatar data must not reset profile, nutrition, game, plan, or records.

## Interaction Rules

- Gender and all unlocked appearance choices may be changed without spending coins.
- Locked parts remain visible only when a future reward flow explicitly introduces them; the initial customizer does not present unusable controls.
- Every selector has a text label and a 44px minimum touch target.
- Selection is expressed by text and `aria-pressed`/`aria-current`, not color alone.
- Keyboard focus remains visible, and the preview does not steal focus after a change.

## Testing and Verification

Domain tests cover migration, fixed layer ordering, unrestricted hair/clothing use across genders, locked-item rejection, defaults, and recovery from unknown IDs.

Component tests cover accessible SVG naming, gender switching, live part changes, keyboard controls, and reduced-motion-safe markup. App-flow tests prove the selection persists after remounting.

Before visual completion is claimed, the rendered Today and customizer screens must be inspected at 390px, 1024px, and 1440px. Horizontal overflow must measure zero at each width, and a fresh-eyes review must confirm that face, hair, clothing boundaries, and focus states remain legible.

## Exclusions

This redesign does not add a store, loot boxes, payment, body transformation, 3D avatars, user-uploaded art, multiple poses, or walking animations. Those require separate designs.
