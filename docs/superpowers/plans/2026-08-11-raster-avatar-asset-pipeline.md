# Raster Avatar Asset Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-drawn rectangle base characters with the approved Canva-backed, Perfect Pixel-normalized male and female PNG anchors while preserving the existing 96×144 renderer contract and progression state.

**Architecture:** Store transparent project-owned PNG anchors under `public/avatar/v2`. `AvatarRenderer` continues to own the accessible SVG and fixed layer ordering, but renders approved raster bases with SVG `<image>` elements. Existing cosmetic rectangles remain temporarily available until matching PNG hair and clothing overlays are produced in later asset batches.

**Tech Stack:** React 19, TypeScript 5, SVG image layers, transparent PNG, Perfect Pixel, Vitest, Testing Library.

## Global Constraints

- Logical canvas remains exactly `96 × 144`.
- Raster assets are transparent PNG files rendered with pixelated sampling.
- Male and female bases share the same bottom anchor and fit inside the canvas.
- Existing avatar state, unlock levels, accessibility names, and layer ordering do not change.
- Generated reference art is original; the user-provided images guide quality only and are not copied.
- The source and refined previews are stored in Canva; only production-size assets ship in the app.

---

### Task 1: Production Base Assets

**Files:**
- Create: `public/avatar/v2/base-female.png`
- Create: `public/avatar/v2/base-male.png`
- Create: `scripts/avatar/process_anchor.py`

**Interfaces:**
- Consumes: chroma-key ImageGen output and Perfect Pixel grid normalization.
- Produces: transparent `96×144` RGBA PNG files with a common bottom anchor.

- [x] **Step 1: Validate generated assets**

Run a script that asserts both PNGs are exactly `96×144`, have RGBA mode, transparent corners, and non-empty foreground.

- [x] **Step 2: Copy the approved bases and reproducible processor**

Copy the two refined production files into `public/avatar/v2` and retain the parameterized processor under `scripts/avatar`.

- [x] **Step 3: Run asset validation**

Run: `python3 scripts/avatar/validate_assets.py public/avatar/v2/base-female.png public/avatar/v2/base-male.png`

Expected: both assets report `96x144 RGBA`, transparent corners, and a non-empty alpha bounding box.

---

### Task 2: Raster-Aware Renderer

**Files:**
- Modify: `src/components/AvatarRenderer.test.tsx`
- Modify: `src/components/AvatarRenderer.tsx`

**Interfaces:**
- Consumes: `getAvatarLayerIds(state)` and `/avatar/v2/base-{gender}.png`.
- Produces: an accessible `96×144` SVG whose base layer is a production PNG `<image>`.

- [x] **Step 1: Write a failing renderer test**

Assert that each gender renders one base `<image>` with `href=/avatar/v2/base-{gender}.png`, `width=96`, `height=144`, and `image-rendering:pixelated`.

- [x] **Step 2: Run the focused test and confirm red**

Run: `npm test -- src/components/AvatarRenderer.test.tsx`

Expected: FAIL because bases currently render only rectangle groups.

- [x] **Step 3: Render approved raster bases**

Add a base-source map and branch only for `base-male` and `base-female`; preserve all cosmetic groups and accessible naming.

- [x] **Step 4: Run focused and full verification**

Run: `npm test -- src/components/AvatarRenderer.test.tsx`

Expected: PASS.

Run: `npm test && npm run build`

Expected: all tests and the production build pass.

---

### Task 3: Browser Visual Gate

**Files:**
- Modify only if visual verification exposes an avatar-scoped defect.

**Interfaces:**
- Consumes: the running Vite app at mobile and desktop widths.
- Produces: evidence that the new bases render crisply without layout regression.

- [ ] **Step 1: Inspect Today and Customize**

Verify male and female bases at `390px`, `1024px`, and `1440px`; confirm face visibility, common foot anchor, full containment, and zero horizontal overflow.

- [ ] **Step 2: Run final checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intentional files changed.
