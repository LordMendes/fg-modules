# 03. Data model

Prisma lives in `dndtools-reference/web/prisma/schema.prisma`. Add models; do not overload `Campaign` JSON.

## Prisma (target shape)

Field names may be adjusted for Prisma conventions, not for meaning.

```prisma
model Campaign {
  // existing fields...
  maps     CampaignMap[]
  liveMapId String?
  liveMap   CampaignMap? @relation("CampaignLiveMap", fields: [liveMapId], references: [id], onDelete: SetNull)
}

model CampaignMap {
  id           String   @id @default(cuid())
  campaignId   String
  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  liveFor      Campaign[] @relation("CampaignLiveMap")
  name         String
  imageKey     String
  imageWidth   Int
  imageHeight  Int
  gridSizePx   Float    @default(70)
  gridOffsetX  Float    @default(0)
  gridOffsetY  Float    @default(0)
  gridType     String   @default("square") // square | hexH | hexV (only square until W4)
  scaleFeet    Float    @default(5)
  diagonalRule String   @default("5105") // 5105 | 555 | euclid
  fogEnabled   Boolean  @default(false)
  losEnabled   Boolean  @default(false)
  lightingEnabled Boolean @default(false)
  daylight     Float    @default(1) // 0..1, Wave 4
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  tokens       CampaignMapToken[]
  fogRegions   CampaignMapFogRegion[]
  drawings     CampaignMapDrawing[]
  occluders    CampaignMapOccluder[]
  lights       CampaignMapLight[]
  explorer     CampaignMapExplorerCell[]

  @@index([campaignId])
}

model CampaignMapToken {
  id          String   @id @default(cuid())
  mapId       String
  map         CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  kind        String   // pc | npc | object
  pcPlanId    String?
  name        String
  imageKey    String?
  /// Grid-space top-left of the token footprint.
  x           Float
  y           Float
  width       Float    @default(1)
  height      Float    @default(1)
  rotation    Float    @default(0)
  layer       String   @default("token") // token | gm
  visibility  String   @default("always") // always | hidden | mask
  ownerUserId String?
  visionRange Float?   // squares; null = default later
  emitsLight  Boolean  @default(false)
  lightBright Float    @default(0) // feet, Wave 4
  lightDim    Float    @default(0)
  seq         Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([mapId])
  @@index([pcPlanId])
}

model CampaignMapFogRegion {
  id        String @id @default(cuid())
  mapId     String
  map       CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  /// hide = extra darkness (DM paint). reveal = hole in the global mask.
  kind      String // hide | reveal
  points    Json   // { x: number, y: number }[] in grid space
  createdAt DateTime @default(now())
}

model CampaignMapDrawing {
  id        String @id @default(cuid())
  mapId     String
  map       CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  authorUserId String
  color     String
  stroke    Json   // { x, y }[] grid space
  createdAt DateTime @default(now())
}

model CampaignMapOccluder {
  id     String @id @default(cuid())
  mapId  String
  map    CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  /// wall | door | window | terrain | secret | illusion | pit
  kind   String @default("wall")
  points Json
  /// open | closed | locked (doors, windows, secrets, pits)
  state  String @default("closed")
  createdAt DateTime @default(now())
}

model CampaignMapLight {
  id      String @id @default(cuid())
  mapId   String
  map     CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  x       Float
  y       Float
  brightFeet Float @default(20)
  dimFeet    Float @default(20)
  color   String @default("#ffd8a8")
  enabled Boolean @default(true)
  /// light | darkness
  mode    String @default("light")
}

model CampaignMapExplorerCell {
  id     String @id @default(cuid())
  mapId  String
  map    CampaignMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  /// "party" shared memory, or a userId if we later split per player
  owner  String @default("party")
  cx     Int
  cy     Int

  @@unique([mapId, owner, cx, cy])
}
```

Wave 1 can ship with `CampaignMap` + `CampaignMapToken` only. Add the other tables in the wave that first writes them. Do not store Wave 2+ data as untyped JSON on `CampaignMap` if a table already exists in this spec.

`Campaign.liveMapId` is the yellow-ribbon equivalent.

## R2 keys

```
campaign/{campaignId}/maps/{mapId}/image.webp
campaign/{campaignId}/maps/{mapId}/tokens/{tokenId}.webp   // optional NPC art
```

Add `isCampaignMapImageKey` / `isCampaignMapTokenImageKey` next to `isPcImageObjectKey`. PC tokens on the map **reference** `PcPlan.state.identity.tokenImageKey`; do not copy the file unless the PC is detached.

## Viewer DTOs

Put shared types in `src/lib/map/types.ts`.

```ts
export type MapDiagonalRule = "5105" | "555" | "euclid";

export type MapTokenView = {
  id: string;
  kind: "pc" | "npc" | "object";
  pcPlanId: string | null;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: "token" | "gm";
  visibility: "always" | "hidden" | "mask";
  ownerUserId: string | null;
  seq: number;
};

export type CampaignMapView = {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridType: "square";
  scaleFeet: number;
  diagonalRule: MapDiagonalRule;
  fogEnabled: boolean;
  losEnabled: boolean;
  lightingEnabled: boolean;
  tokens: MapTokenView[];
  fogRegions: { id: string; kind: "hide" | "reveal"; points: { x: number; y: number }[] }[];
  drawings: { id: string; color: string; stroke: { x: number; y: number }[] }[];
  occluders: { id: string; kind: string; points: { x: number; y: number }[]; state: string }[];
  lights: { id: string; x: number; y: number; brightFeet: number; dimFeet: number; color: string; enabled: boolean }[];
};
```

Players receive a **filtered** `CampaignMapView`:

- No `layer: "gm"` tokens.
- `visibility: "hidden"` omitted.
- `visibility: "mask"` included only if the token center is in a revealed region (Wave 2+). Before fog exists, treat `mask` as hidden to players.
- Occluders: `secret` sent as `wall` with no open toggle.
- Fog: send the computed player mask, or send reveal polygons only, never GM notes.

`getCampaignTable` should add:

```ts
liveMap: CampaignMapView | null;
maps: { id: string; name: string }[]; // DM only; players get [] or just the live id
```

## Live events

Extend `CampaignLiveEvent`:

```ts
| { type: "mapSnapshot"; map: CampaignMapView | null }
| { type: "mapList"; maps: { id: string; name: string }[] } // DM only
| { type: "mapTokenMove"; tokenId: string; x: number; y: number; rotation: number; seq: number; committed: boolean }
| { type: "mapTokenUpsert"; token: MapTokenView }
| { type: "mapTokenRemove"; tokenId: string }
| { type: "mapPing"; x: number; y: number; color: string; userId: string }
| { type: "mapViewportGoTo"; x: number; y: number }
| { type: "mapFogUpsert"; region: CampaignMapView["fogRegions"][number] } // Wave 2
| { type: "mapFogRemove"; regionId: string }
| { type: "mapFogReset" }
| { type: "mapDrawingUpsert"; drawing: CampaignMapView["drawings"][number] }
| { type: "mapDrawingClear" }
| { type: "mapOccluderUpsert"; occluder: CampaignMapView["occluders"][number] } // Wave 3
| { type: "mapOccluderRemove"; occluderId: string }
| { type: "mapGrid"; gridSizePx: number; gridOffsetX: number; gridOffsetY: number; scaleFeet: number; diagonalRule: MapDiagonalRule }
```

Reuse existing `filterForUser` so players never see GM-layer upserts.

## Server actions (names)

`src/actions/maps.ts` (Wave 1 set):

- `listCampaignMaps` (DM)
- `createCampaignMap` (upload)
- `deleteCampaignMap`
- `setLiveCampaignMap`
- `updateCampaignMapGrid`
- `placePcToken` / `placeNpcToken`
- `removeMapToken`
- `broadcastMapTokenMove` / `commitMapTokenMove`
- `setTokenLayer` (Wave 2)
- `addFogRegion` / `resetFog` (Wave 2)
- `addDrawing` / `clearDrawings`
- `sendMapPing` / `sendMapViewportGoTo`

Return `{ success, error?, ... }` like other campaign actions.

## Migrations

One Prisma migration per wave that adds tables. Wave 1 migration: `CampaignMap`, `CampaignMapToken`, `Campaign.liveMapId`.
