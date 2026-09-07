# 00. Current VTT context

Read this before changing code. Prefer the repo over this file if they drift.

## Product location

The VTT is the campaign table in `dndtools-reference/web`.

| Piece | Path |
|---|---|
| Table UI | `src/components/tools/campaign-table.tsx` |
| Table route | `src/app/tools/campaign/[id]/page.tsx` |
| SSE route | `src/app/tools/campaign/[id]/live/route.ts` |
| In-memory hub | `src/lib/campaign/liveHub.ts` |
| Live event types | `src/lib/campaign/types.ts` |
| Campaign actions | `src/actions/campaigns.ts` |
| Prisma models | `prisma/schema.prisma` (`Campaign`, `CampaignMember`, `CampaignPc`, `CampaignRoll`, `CampaignActivity`) |
| PC token images | `src/actions/pc-images.ts`, `src/lib/storage/r2.ts` (`pc/{userId}/{planId}/token.webp`) |
| Stage chrome | `.campaign-stage` in `src/styles/theme.css` |

There is **no map model, no map UI, and no map live event**.

## What already works

- Campaigns with a DM and players, join codes, invites.
- Attach/create PCs (`CampaignPc` -> `PcPlan`).
- PC token and profile images on R2, shown in the party strip.
- Floating / pop-out character sheets on the stage.
- Shared 3D dice, roll log, hidden rolls.
- SSE: `presence`, `roster`, `roll`, `pcUpdated`, `activity`, heartbeat `ping`.
- Per-viewer filtering for activity (`filterForUser` in `activityLog.ts`).

## What the stage looks like today

`.campaign-stage` is a full-viewport play area. Left rail: roster and logs. Bottom: party chips for online PCs. Center: empty state or stacked sheet windows. Dice canvas sits on top of the whole table.

The map must fill the stage **behind** sheets and dice. Sheets stay floating. Do not replace the campaign table with a dedicated `/map` route.

## Live hub constraints

`liveHub.ts` is an in-process `Map` of campaign subscribers. It works on a single Node server. Token drags will broadcast through the same hub.

Implications:

- Persist authoritative map state in Postgres (and images in R2).
- Use SSE for deltas. On reconnect, the client refetches a snapshot (same pattern as `getCampaignTable`).
- Throttle move broadcasts. Persist position on pointer-up (and a slow backup interval while dragging).
- Do not assume multi-instance fan-out. If that is needed later, replace the hub, not the event shapes.

## Storage constraints

- PC tokens: `pc/{userId}/{planId}/token.webp`, validated by `isPcImageObjectKey`.
- Map files need a **new** prefix and validator, for example `campaign/{campaignId}/maps/{mapId}/image.webp`.
- Battlemaps are much larger than tokens. Do not run them through `processPcImage` token dimensions. Add a map-specific pipeline (max bytes, max edge, WebP).

## Ruleset bias

This app is D&D 3.5e. Grid defaults:

- Square grid.
- 5 feet per square.
- Diagonal option `5-10-5` (3.5e) as default, plus `5-5-5` and Euclidean.

PC sheets already have `hitPoints` and token art. They do **not** yet have a structured senses field (darkvision, low-light). Wave 3 may add a small senses block, or read a conservative default (normal vision) until that exists.

## Encounter builder (later hook)

`src/lib/encounter/` is a party EL calculator, not a combat tracker. Wave 1 NPC tokens are free tokens the DM drops. Linking to a future combat tracker is out of Waves 1 to 3.

## Non-goals inherited from the product

- No Foundry module compatibility.
- No Roll20 API scripts.
- No FG XML map import in Wave 1 (UVTT is Wave 3).
- No voice/video on the map.
