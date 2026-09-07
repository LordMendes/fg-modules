# 02. Architecture

## Coordinate system

All persisted map geometry uses **grid space**:

- Origin `(0, 0)` is the top-left of grid cell `(0, 0)`, after applying `gridOffsetX/Y` in pixels on the image.
- `x` increases right, `y` increases down (screen space).
- One unit is one square. A Medium token is `width = 1`, `height = 1`. A Large token is `2 x 2`.
- Positions may be fractional while dragging. Snap on drop if snap is on.
- Pixel conversion: `px = offset + gridCoord * gridSizePx`.

Never store token `left/top` in CSS pixels. Recalibrating the grid must not strand tokens.

Distance helpers live in `src/lib/map/grid.ts`:

- `pixelsToGrid`, `gridToPixels`
- `chebyshevSquares` (5-5-5)
- `threeFiveDiagonalFeet` (5-10-5)
- `euclideanFeet`
- `snapToGrid(x, y, mode)` where mode is `center` | `corner` | `off`

## Renderer

### Waves 1 and 2: DOM board + SVG overlays

`CampaignMapBoard` inside `.campaign-stage`:

1. A pan/zoom viewport (`transform: translate() scale()` on a world layer, pointer events documented below).
2. The map `<img>` (or `<picture>`) sized to `imageWidth x imageHeight`.
3. SVG overlay: grid lines, measure, pings, drawings, fog polygons, AOE.
4. HTML tokens: absolutely positioned in grid space, converted to `%` or pixels via the world layer.

Why not WebGL yet: Wave 1 is about sync and permissions. DOM tokens keep hit-testing, context menus, and sheet-open trivial.

Pan/zoom:

- Middle-mouse or right-drag or hold Space: pan.
- Wheel: zoom toward cursor. Clamp scale (for example 0.15 to 4).
- Fit-to-view button.
- Store **local** viewport per user (`sessionStorage` is fine). Do not sync pan except Shift-ping.

### Wave 3+: vision canvas

Add a full-size 2D canvas (or OffscreenCanvas) above the image and below tokens:

- Draw darkness / explorer memory from each viewer's visible polygon set.
- Client computes LOS from occluders + token position. Server still stores occluders and fog.
- Keep tokens in DOM so they can dim or hide from CSS/`hidden` without a sprite system.

Do not introduce Pixi, Three.js, or a game engine in Waves 1 to 3.

## Layers (z-order)

Low to high:

1. Map image (background)
2. Map-layer objects (Wave 4 furniture; unused in 1)
3. Grid SVG
4. Fog / vision overlay
5. Drawings
6. Token layer (PCs, visible NPCs)
7. GM overlay tokens (DM only)
8. AOE pointers, measure, pings
9. Existing floating sheets and dice (already above `.campaign-stage` content)

A token's `layer` field is `token` | `gm`. Moving an NPC from `gm` to `token` is the reveal action.

## Code layout

All new map code under `dndtools-reference/web`:

```
src/lib/map/
  grid.ts
  grid.test.ts
  types.ts              # shared DTOs (no server imports)
  permissions.ts
  fog.ts                # polygon ops, player-visible mask
  fog.test.ts
  los.ts                # Wave 3
  los.test.ts
  uvtt.ts               # Wave 3 parse
  distance.ts           # ruler / AOE

src/lib/storage/
  map-image.ts          # process + R2 key helpers (or extend r2.ts)

src/actions/maps.ts     # server actions: CRUD scene, tokens, fog, ...

src/components/map/
  campaign-map-board.tsx
  map-toolbar.tsx
  map-token.tsx
  map-grid-overlay.tsx
  map-ping-layer.tsx
  map-measure.tsx
  map-fog-layer.tsx     # Wave 2
  map-draw-layer.tsx    # Wave 2
  map-vision-layer.tsx  # Wave 3
  map-scenes-drawer.tsx
```

Wire the board into `campaign-table.tsx` as the stage background. Add a rail button for scenes (DM) and a compact player toolbar (ping, measure, draw).

Read `node_modules/next/dist/docs/` before adding routes. Prefer server actions over new Route Handlers except the existing SSE stream.

## Live sync

Extend `CampaignLiveEvent` in `src/lib/campaign/types.ts`. Keep event names stable; waves only add fields.

Snapshot:

- `getCampaignTable` (or `getCampaignMapState(campaignId)`) returns the live scene **filtered for the viewer**.
- Client applies snapshot on load and on `mapSnapshot` events.

Deltas (examples, see `03-data-model.md` for the union):

- `mapLiveChanged` : which scene is live
- `mapTokenUpsert` / `mapTokenRemove` / `mapTokenMove`
- `mapPing`
- `mapViewportGoTo` (Shift-ping)
- `mapFogUpsert` / `mapFogReset` (Wave 2)
- `mapDrawingUpsert` / `mapDrawingClear`
- `mapOccluderUpsert` (Wave 3)
- `mapLightUpsert` (Wave 4)

**Token move protocol:**

1. Pointer down: local optimistic move, `movingTokenId` local-only.
2. Pointer move: emit `mapTokenMove` at most every 50 to 80ms via a server action or a tiny POST. Prefer a server action `broadcastMapTokenMove` that does **not** hit Prisma every tick.
3. Pointer up: `commitMapTokenMove` writes Postgres and broadcasts a final `mapTokenMove` with `committed: true`.
4. Other clients tween or snap to the latest move. Ignore stale moves with a monotonic `seq` per token.

If action overhead is too high for step 2, a dedicated `POST /tools/campaign/[id]/map/move` that only calls `publishCampaignLive` is allowed. Still persist only on commit.

## Image pipeline

`processMapImage(file)`:

- Accept JPEG, PNG, WebP.
- Max bytes: start at 15 MiB input.
- Max edge: 8192 px (downscale with sharp, same stack as PC images).
- Output WebP, quality aimed at a 4 to 8 MiB ceiling.
- Store `imageWidth`, `imageHeight` from the processed file, not the original.

UVTT (Wave 3): parse JSON, store the embedded image through the same pipeline, import grid + occluders + lights into tables.

## Tool state

Toolbar is local React state on the board (`select` | `pan` | `ping` | `measure` | `fogHide` | `fogReveal` | `draw` | `wall` | ...). Default `select`.

Modifier shortcuts (document in the toolbar tooltip):

- Space: pan
- Click: ping if ping tool, else select
- Shift+click with ping tool: `mapViewportGoTo`
- Alt while placing: ignore snap

## Failure modes

- Missing R2: creating a scene fails with a clear error, table still loads.
- SSE drop: EventSource reconnects (already); refetch map snapshot.
- Two DMs: there is only one `dmUserId`. Do not build co-DM in this project.
- Player with no PC: can still see the live map, cannot move a PC token, can ping/measure/draw if those tools are allowed (see permissions).
