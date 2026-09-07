# 20. Wave 2: GM theater

**Prompt:** Implement this wave only. Wave 1 must already be merged. Read `README.md`, `04-permissions.md`, `03-data-model.md`, and this file.

## Goal

The DM can hide the unexplored dungeon and park monsters in the next room. Players sketch and drop spell shapes. This is Fantasy Grounds Global Mask plus Roll20's GM layer.

## User stories

1. As DM, I enable fog. The map starts fully hidden for players. I paint reveal polygons (and hide to cover mistakes).
2. As DM, I put NPC tokens on the GM layer or `visibility: mask` so they appear only when their square is revealed.
3. As DM, I move an NPC from GM layer to token layer to "kick in the door."
4. As anyone, I freehand-draw in my color; the DM can clear all drawings.
5. As anyone, I place a cone, circle, or square pointer sized in feet, visible to the table, and dismiss it.

## Implementation order

### 1. Schema

- `CampaignMap.fogEnabled`
- `CampaignMapFogRegion` (`kind: hide | reveal`, `points` JSON)
- `CampaignMapDrawing`

Token fields already include `layer` and `visibility`. Start using them.

Fog model:

- When `fogEnabled` is false, players see the whole image (Wave 1 behavior).
- When true, players see only union(reveal) minus union(hide). Everything else is opaque (theme background, not a bright fill).
- DM always sees the full image, with a translucent overlay showing what players cannot see.

Reset fog: delete all regions (map fully hidden again if fog stays enabled).

### 2. Geometry

`src/lib/map/fog.ts`:

- Point-in-polygon
- Token center visible to players?
- Optional polygon simplification on save (cap point count, e.g. 64)

Tests for inside/outside and mask visibility.

### 3. Actions and live events

- `setFogEnabled`
- `addFogRegion` (tool supplies points)
- `removeFogRegion` / `resetFog`
- `setTokenLayer(tokenId, "token" | "gm")`
- `setTokenVisibility(tokenId, "always" | "hidden" | "mask")`
- `addDrawing` / `clearDrawings` (DM clears all; players cannot)
- `upsertAoePointer` / `clearAoePointers`

AOE pointers can be **ephemeral live state** (hub-only, not Prisma) with a 60s TTL or explicit clear. If that is awkward, a `CampaignMapPointer` table is fine; delete on clear.

Events: `mapFogUpsert`, `mapFogRemove`, `mapFogReset`, `mapDrawingUpsert`, `mapDrawingClear`, plus token upserts when layer/visibility change.

Filter: players get a `CampaignMapView` whose `fogRegions` are only what they need to render their mask (reveal minus hide is enough; sending both kinds is OK if hide/reveal are not secret). Do not send GM-layer tokens.

Recompute which `mask` NPCs appear in the player snapshot after each fog edit and token move. Broadcast `mapTokenUpsert` / `mapTokenRemove` for those NPCs to players (remove from the player's view when they walk into fog).

### 4. UI

DM toolbar additions:

- Fog on/off
- Fog reveal brush / polygon
- Fog hide brush / polygon
- Reset fog (confirm)
- Token context: Move to GM layer, Reveal to players, Visible always, Mask-sensitive

Player tokens default `always`. NPC tokens default `mask` when fog is on, `always` when fog is off.

Drawing tool: freehand, stroke width in screen px but stored in grid space (stroke width as grid units, e.g. 0.08).

AOE:

- Circle: radius in feet
- Square: width in feet, axis-aligned or rotated 45° if cheap
- Cone: 3.5e quarter-circle or 90° triangle; pick one and document it in the tooltip (prefer a 90° triangle on the grid for 3.5e cones)

Show template while dragging; commit on pointer up; click template to remove (author or DM).

### 5. Rendering

SVG path for fog: a full-map rect minus reveal holes, plus hide polygons on top. Use `fill-rule: evenodd`.

Player fog color: near-black, matching `.campaign-stage` so it does not flash white.

DM fog: same shapes at ~40% opacity so the DM can still prep.

## Acceptance

- [ ] Fog off: identical to Wave 1 for players.
- [ ] Fog on, no reveals: players see a dark board (tokens they own still visible: PCs are `always`).
- [ ] Reveal a room: players see that polygon of the image.
- [ ] Mask NPC in an unrevealed room: player does not receive it; after reveal, it appears without refresh.
- [ ] GM-layer NPC never appears for the player until moved to token layer.
- [ ] Hide polygon covers a revealed area again.
- [ ] Drawings sync; DM clear wipes them; reload restores persisted strokes.
- [ ] Cone/circle/square visible to both browsers; 20 ft circle covers 4 squares radius from center.
- [ ] Player cannot enable fog or see GM-layer tokens via the network tab payload (`filterForUser` / snapshot).

## Out of this wave

Walls, LOS, explorer grayscale, lighting, UVTT, token lock, HP bars.

## Browser check

1. Upload a dungeon image. Enable fog. Player sees black.
2. Reveal the entrance. Place a hidden goblin in the next room (GM layer) and a masked chest in the entrance.
3. Player sees the chest after reveal, never the goblin.
4. Draw a cone from the PC; second browser sees it.
5. Reload player: fog + drawings persist; goblin still hidden.
