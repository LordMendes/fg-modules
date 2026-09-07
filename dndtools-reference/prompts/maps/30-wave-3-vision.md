# 30. Wave 3: vision, walls, UVTT

**Prompt:** Implement this wave only. Waves 1 and 2 must already be merged. Read `02-architecture.md`, `03-data-model.md`, `04-permissions.md`, and this file.

## Goal

Dungeons get real walls and doors. Tokens only see what their eyes can reach inside revealed fog. Dungeondraft-style **Universal VTT** files import grid, image, and walls in one drop.

This is Fantasy Grounds LOS (walls + doors) plus Roll20 "has vision," without colored lighting.

## User stories

1. As DM, I draw wall polylines snapped to grid; players cannot see or walk through them.
2. As DM, I insert doors. Players open/close an unlocked door they can see. I lock it.
3. As a player, my token only sees within vision range and LOS, further clipped by fog from Wave 2.
4. As DM, I toggle "preview player vision" on a selected token.
5. As DM, I import a `.dd2vtt` / `.uvtt` file and get image + grid + walls + doors (lights stored for Wave 4 if present).
6. As DM, I optionally enable explorer memory so walked rooms stay gray when I look away.

## Implementation order

### 1. Schema

- `CampaignMap.losEnabled`
- `CampaignMapOccluder` (`kind` at least `wall` | `door`; store others but treat unknown as `wall` until Wave 4)
- `CampaignMapExplorerCell` if explorer ships in this wave
- Token `visionRange` in **squares** (null = use default)

Default vision: 12 squares (60 ft in bright conditions as a stand-in) until PC senses exist. Add a tiny optional field on `PcPlanState` only if it is clean, for example `identity.visionFeet: number | null`. Do not block this wave on a full 3.5e senses rewrite.

Door `state`: `open` | `closed` | `locked`. Open doors do not occlude. Locked doors behave as closed for players (no toggle).

### 2. LOS library

`src/lib/map/los.ts` (pure functions, heavily tested):

- Segment intersection
- Visibility polygon from a point given occluder segments (radial sweep or polygon clip; pick one and keep it deterministic)
- `canWalkTo(from, to, occluders)` : straight-line or grid-step that does not cross a closed wall/door. Wave 3 can reject the **final** position if the center would cross a wall; showing a blocked path is enough.
- Secret doors: in the **player** occluder list, `kind` is `wall` and there is no toggle.

Performance: a few hundred wall segments is the target. If a map is huge, clip to viewport + vision radius.

### 3. Vision overlay

Canvas above the image, below tokens:

- Fill darkness everywhere
- Punch the visibility polygon of the viewer's relevant tokens (union of all tokens the user may see through: own PCs; DM in preview mode uses the selected token; DM default is no punch, full view)
- Intersect with Wave 2 fog reveal
- Explorer: union of visited cells at reduced alpha (grayscale via CSS `filter` on a duplicate image layer, or desaturated blit). Party-shared explorer (`owner = "party"`) is enough.

When `losEnabled` is false, skip the canvas (fog only).

### 4. Actions

- `setLosEnabled`
- `addOccluder` / `updateOccluder` / `removeOccluder`
- `setDoorState(id, open | closed | locked)` with permission checks
- `setTokenVisionRange`
- `setExplorerEnabled` (or a boolean on `CampaignMap`)
- `importUvtt(campaignId, file)`

Door toggle from the player: allowed if `losEnabled`, door is not locked, and the token they control is within 1 square of the door segment.

### 5. UVTT import

`src/lib/map/uvtt.ts`:

Parse Universal VTT JSON (Dungeondraft `dd2vtt` / `uvtt`):

- Embedded image (`image` base64) -> `processMapImage`
- `resolution.pixels_per_grid`, `resolution.map_origin` or equivalent -> `gridSizePx`, offsets
- `line_of_sight` / `objects_line_of_sight` -> `wall` occluders
- `portals` -> `door` occluders (`closed` from file)
- `lights` -> create `CampaignMapLight` rows **disabled from rendering** until Wave 4, or store and ignore. Prefer insert-now so Wave 4 only flips a renderer.

Reject files that are not JSON UVTT. Cap image size with the same map pipeline.

Do not implement FG module XML import.

### 6. UI

DM LOS toolbar:

- Draw wall (polyline, click to add, Enter/double-click to finish, Shift = 45°)
- Draw door (two-point segment)
- Select occluder, delete
- LOS on/off
- Explorer on/off
- Player-vision preview

On the board, doors show a small handle for the DM always, for players only when in LOS and not secret.

Movement: on commit, if `losEnabled` and the path crosses a closed occluder, snap back and toast "blocked by a wall."

## Acceptance

- [ ] Walls block player vision; DM still sees the map in default mode.
- [ ] Closed door blocks vision; open door does not.
- [ ] Player cannot open a locked door; DM can.
- [ ] Secret door looks like a wall in the player payload (`kind` is `wall`).
- [ ] Token move that would cross a wall is rejected server-side, not only in CSS.
- [ ] Fog still applies: unrevealed rooms stay dark even with LOS on.
- [ ] UVTT import creates a live-capable scene with aligned grid and walls on a sample Dungeondraft file.
- [ ] `los.ts` tests: simple room, door open/closed, diagonal wall, no crash on degenerate segments.
- [ ] Two-browser: opening a door updates the other client's vision without refresh.

## Out of this wave

Ambient lights, torches, windows/terrain/illusion/pits, 3D, in-app map painter, token lock, HP bars.

## Browser check

1. Draw a square room with one door. Enable fog, reveal the hallway, not the room.
2. Player at the door: sees hallway, not through the closed door.
3. Player opens the door: sees into the room up to range, still not past back wall.
4. Import a UVTT; walls match painted dungeon art within a square.
5. DM preview-as-player matches the player browser closely enough to GM.
