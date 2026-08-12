# Premium Cute Avatar Redesign

**Date:** 2026-08-11  
**Status:** Approved  
**Scope:** Replace the current unattractive layered avatar artwork and introduce level-based cosmetic unlocking while preserving persisted selections, wellness progress, and accessibility behavior.

## Goal

The avatar must be the emotional center of the daily wellness loop. It should feel cute, detailed, polished, and collectible without looking childish, generic, or like a combat-game character. Its human face must remain recognizable in the compact Today card.

## Approved Direction

- Premium modern pixel art with one consistent square-pixel grid and dense, intentional detail.
- Cute adult proportions near a 1:2.7 head-to-body ratio.
- An animation-influenced human face with visible eyebrows, large expressive eyes and highlights, a defined nose, a small smiling mouth, and restrained cheek color.
- A calm lifestyle-adventure mood using pale blue, ivory, charcoal, muted coral, sage, and warm skin tones.
- A near-front-facing pose with a subtle hip shift and one foot forward. Arms remain separated enough for clean clothing boundaries.
- Hair and clothing use one base color, two shadow steps, and one highlight step. Selective outlines use dark navy, brown, or a darker local color rather than uniform black.
- A new character starts barefoot in a fixed, non-selectable wellness underlayer: a sleeveless inner top and fitted exercise shorts. This underlayer prevents nudity and remains beneath equipped clothing.
- No weapons, armor, fantasy props, body transformation, weight-loss comparison, copied character, photorealism, 3D rendering, gradients, anti-aliasing, or mixed pixel sizes.

The two user-supplied images define the desired detail density, expressive face, layered hair shading, strong silhouette, and polished pixel treatment. Their characters, clothing, poses, animal traits, fantasy effects, watermarks, and exact pixel arrangements must not be copied. The earlier Canva design `DAHR84xFyrg` is superseded. Production layers remain original project-owned SVG data.

## Open-Source References

- Universal LPC informs the explicit stacking and shared-anchor model. No LPC artwork will be copied because individual assets carry mixed attribution and share-alike obligations.
- DiceBear informs deterministic state-to-SVG composition and small-size facial readability. No DiceBear style artwork will be copied.
- AI Game Spritesheets informs the workflow: approve one front-facing anchor before producing variants.
- Perfect Pixel informs grid normalization: every boundary lands on the logical pixel grid and is reviewed at native and integer-scaled sizes.

## Canvas and Grid

- Logical canvas: `96 × 144` pixels.
- Head-region bounding box: `x=22..74`, `y=8..59`; hairstyles may extend up to four pixels beyond it without hiding both eyes.
- Eye line: `y=34..39`; mouth line: `y=48..51`.
- Shoulder anchors: `x=20` and `x=76`, near `y=64`.
- Waist anchor: `y=98`; forward and rear shoe baselines: `y=139` and `y=136`.
- All visible coordinates are integers. Rendering uses `shape-rendering="crispEdges"` and integer scaling where practical.
- The Today card renders at no less than 144 CSS pixels tall on mobile so the face does not collapse into an unreadable cluster.

## Character System

The appearance fields are:

- gender: male or female;
- skin: light, medium, or deep;
- hair: short, bob, wave, or tied;
- top: initially empty, then runner, gym, or walk;
- bottom: initially empty, then training pants or shorts;
- shoes: initially empty, then trainers or walking shoes;
- hat: initially empty, with reward items added to the catalog;
- accessory: initially empty, with reward items added to the catalog.

Gender changes the base silhouette subtly, not the quality, body size, pose, or available clothing. Skin, gender, and starter hairstyles are freely selectable. Clothing remains unrestricted across genders. Body shape never responds to weight, calories, or progress.

## Cosmetic Progression

Rewards come from the existing game level, which rises through completed healthy actions. Weight lost, calories undereaten, and body measurements never unlock cosmetics.

The first progression track is deterministic:

| Level | Unlock |
| --- | --- |
| 1 | base character, all skin tones, short and bob hair |
| 2 | white trainers and wave hair |
| 3 | powder-blue runner top |
| 4 | charcoal training pants |
| 5 | walking shoes and tied hair |
| 6 | muted coral gym top and navy shorts |
| 7 | sage walking top |
| 8 | wellness cap |
| 9 | cross-body bottle pouch |

- Level-up grants are permanent and idempotent.
- Newly unlocked items are announced but never equipped automatically.
- Users may unequip top, bottom, shoes, hat, and accessory to return to the visible underlayer or bare feet.
- Coins remain visible but do not purchase cosmetics in this scope.
- The customizer shows the next three rewards with their required levels. Locked items are visible, labelled, and disabled.
- Completing the same quest event twice cannot grant an item twice.

## Layer Contract

The renderer keeps this fixed order:

1. back hair;
2. body base, facial features, and fixed underlayer;
3. optional bottom;
4. optional top;
5. optional shoes;
6. front hair;
7. optional hat;
8. optional accessory.

Every selectable item uses the same canvas, shoulder, waist, hand-clearance, hip-shift, and shoe-baseline anchors. Hair may contain coordinated back and front paths. Clothing cannot paint facial features or permanently cover skin needed by another slot.

## Face Readability Rules

- Both eyes, at least one eyebrow, nose, mouth, and at least one ear remain visible for every hairstyle.
- Hair may frame one eye but cannot cover either pupil or both eyebrows.
- Skin, hair, eye, and outline colors meet a minimum 3:1 visual contrast against adjacent pixels.
- The neutral expression reads as a smile at 144px render height and at a native 96×144 screenshot.
- Male and female bases receive equally detailed faces.
- Completion feedback may alter cheek or eye-highlight pixels briefly, but the neutral face remains the persisted state.

## Production Workflow

1. Build one female medium-skin, layered bob-hair anchor from the approved written art direction and user-supplied references without tracing or copying them.
2. Review the face at native size, 2×, and Today-card size.
3. Create the male base on the same anchors.
4. Rebuild the remaining skin, hair, top, bottom, shoe, hat, and accessory layers against those anchors.
5. Run a compatibility matrix covering every available combination.
6. Add deterministic level requirements and idempotent unlock grants.
7. Replace the old layer catalog without changing persisted IDs.

## Components and Data Flow

- `avatarPixelLayers.ts` owns original SVG path and rect data only.
- `avatarManifest.ts` owns IDs, slots, labels, attribution, defaults, and compatibility metadata.
- `AvatarRenderer` resolves and stacks layers but does not own game or persistence logic.
- `AvatarCustomizer` continues to update selected IDs through `useWellnessGame`.
- The pure avatar domain derives newly granted IDs from the previous and current game levels. `useWellnessGame` persists the resulting unlocked IDs.
- Existing version-one persisted selections and unlocked items remain valid even if their current level is below a new requirement. Unknown IDs continue to fall back per slot without resetting unrelated wellness data.

## Accessibility and Motion

- The accessible avatar name continues to list gender, hair, top, bottom, and shoes.
- Selection remains communicated with Korean labels and `aria-pressed`, never color alone.
- Keyboard focus returns to the Customize trigger after closing.
- The optional breathing effect changes only whole-character translation by at most two logical pixels and is disabled by `prefers-reduced-motion`.

## Verification

- Domain tests preserve layer order, cross-gender compatibility, locked-item rejection, legacy migration, and corrupt-data recovery.
- Progression tests cover every level grant, skipped-level grants, repeated processing, unequipping, and the prohibition on weight- or calorie-driven rewards.
- Renderer tests assert one accessible SVG and stable resolved layers.
- Add facial-contract tests asserting required face feature groups and non-overlap with the eye-line exclusion zone.
- Add a combination test for all initial gender, skin, hair, top, bottom, and shoe selections.
- Render and inspect Today and Customize at 390px, 1024px, and 1440px.
- Inspect the anchor character at native 96×144, 2×, and 4× scales with zero smoothing.
- Confirm zero horizontal overflow and visible focus at all target widths.

## Exclusions

This redesign does not add animation sheets, side or back poses, a shop, random reward boxes, paid items, uploads, 3D avatars, or user-photo likeness. Additional cosmetic items beyond the first progression track require a catalog extension but not a new renderer.
