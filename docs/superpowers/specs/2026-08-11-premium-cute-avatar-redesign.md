# Premium Cute Avatar Redesign

**Date:** 2026-08-11  
**Status:** Approved  
**Scope:** Replace the current unattractive layered avatar artwork while preserving the existing avatar state, customization controls, persistence, and accessibility behavior.

## Goal

The avatar must be the emotional center of the daily wellness loop. It should feel cute, polished, and collectible without looking childish, generic, or like a combat-game character. Its human face must remain recognizable in the compact Today card.

## Approved Direction

- Premium modern pixel art with one consistent square-pixel grid.
- Cute adult proportions near a 1:3.2 head-to-body ratio.
- A round face, visible ears and eyebrows, warm eyes with highlights, a small defined nose, a smiling mouth, and restrained cheek color.
- A calm lifestyle-adventure mood using pale blue, ivory, charcoal, muted coral, sage, and warm skin tones.
- Front-facing neutral pose with arms separated enough for clean clothing boundaries.
- No weapons, armor, fantasy props, body transformation, weight-loss comparison, copied character, photorealism, 3D rendering, gradients, anti-aliasing, or mixed pixel sizes.

The Canva reference design is `DAHR84xFyrg`, titled **Inviting Korean Woman in Pixel Art Style**. It is a direction reference rather than a production asset. Production layers remain original project-owned SVG data.

## Open-Source References

- Universal LPC informs the explicit stacking and shared-anchor model. No LPC artwork will be copied because individual assets carry mixed attribution and share-alike obligations.
- DiceBear informs deterministic state-to-SVG composition and small-size facial readability. No DiceBear style artwork will be copied.
- AI Game Spritesheets informs the workflow: approve one front-facing anchor before producing variants.
- Perfect Pixel informs grid normalization: every boundary lands on the logical pixel grid and is reviewed at native and integer-scaled sizes.

## Canvas and Grid

- Logical canvas: `64 × 96` pixels.
- Head-region bounding box: `x=17..47`, `y=8..40`; hairstyles may extend up to two pixels beyond it without entering the eye-line exclusion zone.
- Eye line: `y=24..26`; mouth line: `y=32..34`.
- Shoulder anchors: `x=14` and `x=50`, near `y=43`.
- Waist anchor: `y=65`; shoe baseline: `y=91`.
- All visible coordinates are integers. Rendering uses `shape-rendering="crispEdges"` and integer scaling where practical.
- The Today card renders at no less than 128 CSS pixels tall on mobile so the face does not collapse into an unreadable cluster.

## Character System

The existing selectable fields remain unchanged:

- gender: male or female;
- skin: light, medium, or deep;
- hair: short, bob, wave, or tied;
- top: runner, gym, or walk;
- bottom: training pants or shorts;
- shoes: trainers or walking shoes.

Gender changes the base silhouette subtly, not the quality, body size, pose, or available clothing. Hair and clothing remain unrestricted across genders. Body shape never responds to weight, calories, or progress.

## Layer Contract

The renderer keeps this fixed order:

1. back hair;
2. body base and facial features;
3. bottom;
4. top;
5. shoes;
6. front hair;
7. optional hat;
8. optional accessory.

Every selectable item uses the same canvas, shoulder, waist, hand-clearance, and shoe-baseline anchors. Hair may contain coordinated back and front paths. Clothing cannot paint facial features or permanently cover skin needed by another slot.

## Face Readability Rules

- Both eyes, eyebrows, nose, mouth, and at least one ear remain visible for every hairstyle.
- Hair cannot overlap the eye line.
- Skin, hair, eye, and outline colors meet a minimum 3:1 visual contrast against adjacent pixels.
- The neutral expression reads as a smile at 128px render height and at a native 64×96 screenshot.
- Male and female bases receive equally detailed faces.
- Completion feedback may alter cheek or eye-highlight pixels briefly, but the neutral face remains the persisted state.

## Production Workflow

1. Build one female medium-skin, bob-hair anchor using the Canva reference only for mood and proportions.
2. Review the face at native size, 2×, and Today-card size.
3. Create the male base on the same anchors.
4. Rebuild the remaining skin, hair, top, bottom, and shoe layers against those anchors.
5. Run a compatibility matrix covering every available combination.
6. Replace the old layer catalog without changing persisted IDs.

## Components and Data Flow

- `avatarPixelLayers.ts` owns original SVG path and rect data only.
- `avatarManifest.ts` owns IDs, slots, labels, attribution, defaults, and compatibility metadata.
- `AvatarRenderer` resolves and stacks layers but does not own game or persistence logic.
- `AvatarCustomizer` continues to update selected IDs through `useWellnessGame`.
- Existing version-one persisted selections remain valid. Unknown IDs continue to fall back per slot without resetting unrelated wellness data.

## Accessibility and Motion

- The accessible avatar name continues to list gender, hair, top, bottom, and shoes.
- Selection remains communicated with Korean labels and `aria-pressed`, never color alone.
- Keyboard focus returns to the Customize trigger after closing.
- The optional breathing effect changes only whole-character translation by at most one logical pixel and is disabled by `prefers-reduced-motion`.

## Verification

- Domain tests preserve layer order, cross-gender compatibility, locked-item rejection, legacy migration, and corrupt-data recovery.
- Renderer tests assert one accessible SVG and stable resolved layers.
- Add facial-contract tests asserting required face feature groups and non-overlap with the eye-line exclusion zone.
- Add a combination test for all initial gender, skin, hair, top, bottom, and shoe selections.
- Render and inspect Today and Customize at 390px, 1024px, and 1440px.
- Inspect the anchor character at native 64×96, 2×, and 4× scales with zero smoothing.
- Confirm zero horizontal overflow and visible focus at all target widths.

## Exclusions

This redesign does not add animation sheets, side or back poses, a shop, locked reward inventory, hats, accessories, uploads, 3D avatars, or user-photo likeness. Those require separate designs after the new base system is accepted.
