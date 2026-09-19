# 50. Map grid overlay (z-order and viewport coverage)

**Prompt:** Implement this file only. Update [`STATUS.md`](./STATUS.md) row F50 when done.

## Goal

Fix the battle map grid so it renders **above the map image**, covers the **entire map viewport** (not only the image rectangle), and remains **adjustable by the DM** using existing controls. Today the grid is painted on a canvas layer below the map and clipped to image dimensions.

## Current behavior

### Layer stack (`theme.css`)

| Layer | z-index | Contents |
|---|---|---|
| `.map-viewport-overlay-host` | 1 | Canvas: grid, fog, vision, measure, pings |
| `.campaign-map-world` | 2 | Map image, drawings, targeting |
| `.map-token-layer` | 3 | Tokens |
| `.map-targeting-layer` | 4 | Target arrows |

The grid is painted in `paintGrid()` inside `map-viewport-overlay.tsx` **before** fog/vision in the same canvas, and the whole canvas sits **under** the map image. Users see the grid below the map.

### Grid drawing (`paintGrid`)

- Lines run from `(gridOffsetX, 0)` to `(gridOffsetX, imageHeight)` vertically.
- Horizontally `(0, gridOffsetY)` to `(imageWidth, gridOffsetY)`.
- Clipped to `map.imageWidth` x `map.imageHeight` in world space.
- Letterboxed areas in the viewport get no grid lines.

### Grid size controls (already exist)

- **Maps drawer** (`map-scenes-drawer.tsx`): numeric `gridSizePx`, offsets, scale, diagonal rule -> `updateCampaignMapGrid`.
- **Calibrate tool** on board (DM): two-click corner sizing, live `mapGrid` event.
- **Toolbar:** grid visible toggle (local `gridVisible` state).

### Dead code

- `map-grid-overlay.tsx` (SVG) is unused. Do not revive unless it is clearly the smallest fix.

## Desired behavior

### User stories

1. As anyone, when grid visibility is on, I see grid lines **on top of** the map artwork, not underneath.
2. As anyone, grid lines cover the **full map stage viewport**, including letterbox/padding areas, still aligned to the same world grid (offset + cell size).
3. As DM, I can still change grid size via Maps drawer and calibrate tool (no regression).
4. As anyone, tokens and target arrows remain **above** the grid.
5. As anyone, fog and vision overlays remain usable (above image; do not obscure tokens incorrectly).

### Layer target

```
viewport
  overlay canvas (fog, vision, measure, pings)  [below image OR split]
  map image + drawings
  grid overlay (NEW position: above image, below tokens)
  tokens
  targeting arrows
```

Preferred approach: **split grid from the under-canvas** rather than raising the entire overlay above tokens (which would hide tokens under fog incorrectly).

Options (pick smallest clean fix):

**Option A (recommended):** Two canvas hosts or two paint passes:
- Keep fog/vision/measure on z-index 1 canvas under world.
- Paint grid only on a new overlay at z-index 2.5 (between world and tokens), or paint grid in world div after image but before token layer.

**Option B:** Move grid to a dedicated div/SVG sibling inside `.campaign-map-world` after `.campaign-map-image`, before tokens.

**Option C:** Single canvas above world but below tokens, containing **only** grid lines; leave fog/vision on lower canvas.

### Viewport coverage

- Extend `paintGrid` (or equivalent) to draw lines across the **visible viewport bounds** in world coordinates, not only `[0, imageWidth]` x `[0, imageHeight]`.
- Convert viewport corners to world space using camera inverse, snap line start/end to cover that bounds while preserving `gridOffsetX/Y` and `gridSizePx` alignment.
- Grid must stay aligned with token snap and measure tool.

## MUST

- Grid visible above map image, below tokens (z-index between 2 and 3).
- Full viewport coverage when grid is toggled on.
- Preserve existing grid config fields on `CampaignMap`: `gridSizePx`, `gridOffsetX`, `gridOffsetY`, `scaleFeet`, `diagonalRule`.
- Preserve Maps drawer and calibrate tool behavior.
- Add or update unit test in `lib/map/grid.test.ts` if you add viewport bounds helper.
- Verify pan/zoom: grid stays aligned while moving camera.

## MUST NOT

- Add a second grid settings system on the toolbar (optional small shortcut is ok only if it reuses `updateCampaignMapGrid`).
- Resurrect `map-grid-overlay.tsx` without strong reason.
- Break fog, vision, or measure overlays.
- Use em dash in UI copy.

## Implementation order

### 1. Audit render order (`campaign-map-board.tsx`)

- Document current DOM order of `MapViewportOverlay`, `.campaign-map-world`, token layer, targeting layer.
- Choose Option A/B/C and implement minimal DOM/CSS change.

### 2. Extract or duplicate grid painting

- Move `paintGrid` to a shared module, e.g. `lib/map/paintGrid.ts`, or add `paintGridViewport()` that accepts viewport world bounds.
- Compute viewport bounds from camera + overlay size (`overlayCanvasSize` in `camera.ts`).

### 3. New grid layer

- If separate canvas: add `.map-grid-overlay-host` with `z-index: 2.5`, `pointer-events: none`, same size as viewport.
- Remove grid painting from lower overlay canvas (keep fog/vision there).
- If grid inside world: render after image, apply same transform as world.

### 4. CSS (`theme.css`)

- Add z-index for grid layer between `.campaign-map-world` (2) and `.map-token-layer` (3).
- Ensure `.campaign-map-image` stays below grid.

### 5. Toggle

- `gridVisible` prop must control the new grid layer only (or both if temporarily duplicated during migration, then remove duplicate).

### 6. Tests

- Pure function test: given camera + viewport size + grid config, line count or first line position matches expected alignment at origin.

## Browser checks

1. Upload/set live map. Enable grid toggle. Grid lines appear **over** the map image.
2. Pan and zoom: grid stays aligned with tokens when snapping.
3. Letterbox/padded viewport: grid fills the stage, not only the PNG rectangle.
4. Tokens render above grid; target arrows above tokens.
5. DM: change grid size in Maps drawer, confirm live update.
6. DM: calibrate tool still sets size and origin.
7. Fog/vision (if enabled on test map): still render correctly, tokens not hidden.

## Done when

- [ ] Grid renders above map image, below tokens.
- [ ] Grid covers full map viewport area, aligned to configured cell size and offset.
- [ ] Existing DM grid size controls work unchanged.
- [ ] Fog, vision, measure, pings still work.
- [ ] Browser checks pass.
- [ ] STATUS.md F50 marked `done`.
