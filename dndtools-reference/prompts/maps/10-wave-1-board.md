# 10. Wave 1: playable board

**Prompt:** Implement this wave only. Read `README.md`, `00-context.md`, `02-architecture.md`, `03-data-model.md`, and `04-permissions.md` first.

## Goal

A DM can upload a battlemap, calibrate a square grid, set it live, and drop PC/NPC tokens. Everyone at the table sees the same board. Players move their own token. Anyone can ping and measure.

After this wave the table is a VTT. Fog and walls wait.

## User stories

1. As DM, I create a scene from a PNG/WebP/JPEG, name it, and set it live.
2. As DM, I drag from a grid square corner to the opposite corner to set cell size and origin.
3. As DM, I place each roster PC on the map (or click "place party") and drop extra NPC tokens.
4. As a player, I see the live map, pan/zoom my own view, and drag my token with snap.
5. As anyone, I click-ping a point. As DM, Shift-ping centers every player's view on that point.
6. As anyone, I drag a ruler and see distance in feet using 5-10-5 (toggleable).
7. As a player, clicking my token focuses my open sheet (if the sheet is already in the table).

## Implementation order

### 1. Schema and storage

- Add `CampaignMap`, `CampaignMapToken`, `Campaign.liveMapId` (see `03-data-model.md`).
- Migrate.
- Add R2 helpers for `campaign/{campaignId}/maps/{mapId}/image.webp` and optional NPC token images.
- Add `processMapImage` (do not reuse token crop/square logic).

### 2. Types and permissions

- `src/lib/map/types.ts` with Wave 1 fields only (`fogRegions` etc. can be empty arrays).
- `src/lib/map/permissions.ts`: filter tokens for players (no `gm` layer yet, but still honor `hidden`).
- `src/lib/map/grid.ts` + tests.

### 3. Server actions

In `src/actions/maps.ts`:

- `createCampaignMap(campaignId, formData)` : process image, create row, do not auto-live unless it is the first map.
- `deleteCampaignMap`, `renameCampaignMap`
- `setLiveCampaignMap(campaignId, mapId | null)`
- `updateCampaignMapGrid(...)`
- `placePcToken(mapId, pcPlanId, x, y)` : one PC token per map per `pcPlanId` (upsert position if exists).
- `placeNpcToken(mapId, name, x, y, image?)`
- `removeMapToken`
- `broadcastMapTokenMove` / `commitMapTokenMove`
- `sendMapPing` / `sendMapViewportGoTo`

Publish live events. `setLiveCampaignMap` sends `mapSnapshot` to everyone (filtered).

### 4. Snapshot on the table

Extend `getCampaignTable` / `CampaignTableState`:

```ts
liveMap: CampaignMapView | null;
maps: { id: string; name: string }[]; // empty for players
```

On SSE `mapSnapshot` / `mapTokenMove` / `mapPing` / `mapViewportGoTo` / `mapGrid` / `mapTokenUpsert` / `mapTokenRemove`, update React state in `campaign-table.tsx` and pass into the board.

### 5. UI

Replace the empty stage message with `CampaignMapBoard` when `liveMap` is set. Keep the empty copy when there is no live map:

- DM: "Upload a map from the Maps rail, then set it live."
- Player: "Waiting for the DM to share a map."

Add a **Maps** rail button (DM). Drawer: list scenes, upload, set live, delete, grid calibration controls.

Board toolbar (bottom or top of stage, compact):

- Select, pan
- Ping
- Measure (toggle broadcast vs private; private = local-only overlay)
- Snap on/off
- Fit view
- Grid visible on/off (local)

DM-only on toolbar or drawer: grid calibrate mode (click two corners of one square).

Tokens:

- Image from PC token URL or NPC upload / default silhouette.
- Nameplate under token.
- Drag with snap to square centers by default.
- Show a faint path distance while dragging (local + optional broadcast later; Wave 1 local is enough).

### 6. Pan / zoom / ping / measure

- Wheel zoom toward cursor.
- Space or middle-drag pan.
- Ping: 800ms CSS pulse at grid point, color = a stable hash of `userId` (reuse nothing from dice if it collides; a small `userColor(userId)` helper is fine).
- `mapViewportGoTo`: animate other clients' camera to center that grid point.
- Ruler: polyline of one or more segments, label with feet from `diagonalRule`.

## Acceptance

- [ ] First map upload appears in the DM list and can be set live.
- [ ] Players see the image within a second of `setLive` (SSE or refresh).
- [ ] Grid lines align to the calibrated square on a known test image.
- [ ] Two browsers: moving a PC token in one updates the other during drag (throttled) and after drop (persisted, refresh-safe).
- [ ] Player cannot move the DM's NPC token.
- [ ] Player cannot set live map or calibrate grid.
- [ ] Ping visible to all; Shift-ping only from DM and recenters players.
- [ ] Ruler shows 5 ft per square orthogonal; diagonal follows 5-10-5 by default.
- [ ] Sheets and dice still work; map sits behind them.
- [ ] Campaign with no map is unchanged besides the empty-state sentence.
- [ ] `grid.ts` unit tests cover snap, 5-10-5, and pixel round-trip.

## Out of this wave

Fog, GM-hidden tokens, drawings, AOE shapes, walls, lighting, UVTT, HP bars, token lock, hex.

## Browser check

On desktop (this app is not mobile-first):

1. Create a campaign, open two users.
2. DM uploads a 20x20-ish battlemap, calibrates, places both PCs and one NPC.
3. Player moves, pings, measures.
4. Reload both tabs: token positions match.
5. Open a character sheet and confirm it still floats above the map.
