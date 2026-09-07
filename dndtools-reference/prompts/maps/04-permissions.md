# 04. Permissions

`CampaignMember.role` is `"dm"` | `"player"`. Only `dmUserId` is the DM. Pending members never subscribe to SSE and never receive map state.

## Capability matrix

| Action | DM | Player (own PC) | Player (other) |
|---|---|---|---|
| List all scenes | yes | no | no |
| Create / delete / rename scene | yes | no | no |
| Set live scene | yes | no | no |
| Calibrate grid, scale, diagonal | yes | no | no |
| See live map image | yes | yes | yes |
| Pan / zoom own viewport | yes | yes | yes |
| Ping | yes | yes | yes |
| Shift-ping (force camera) | yes | no | no |
| Measure (private) | yes | yes | yes |
| Measure (broadcast) | yes | yes | yes |
| Place / delete NPC token | yes | no | no |
| Place PC token for a roster PC | yes | own PC if none on live map | no |
| Move token | any | own `ownerUserId` or own `pcPlanId` | no |
| Rotate / resize token | yes | own, size lock to current | no |
| Open sheet from token | any PC | own PC | no |
| Move token to GM layer / reveal | yes | no | no |
| Paint fog hide/reveal | yes | no | no |
| See unrevealed map | yes | no | no |
| Draw on map | yes | yes | yes |
| Clear all drawings | yes | own strokes only, or no | no |
| Edit walls / doors | yes | no | no |
| Open unlocked door | yes | yes if they can see it | yes if they can see it |
| Lock / unlock door | yes | no | no |
| Toggle secret door | yes | no | no |
| Import UVTT | yes | no | no |
| Place / edit lights | yes | no | no |

## Visibility rules

Apply in `src/lib/map/permissions.ts` on the server when building `CampaignMapView`. Do not trust the client to hide GM tokens.

1. **Image:** everyone who can load the table sees the live image. Fog/vision darken it; never 404 the asset for players.
2. **GM layer tokens:** omit from player snapshots and live upserts.
3. **`visibility: hidden`:** omit for players.
4. **`visibility: mask` (Wave 2):** include for players only if the token's **center** `(x + width/2, y + height/2)` lies in a revealed region and is not in a hide region. DM always sees them (with a visual "unrevealed" cue).
5. **Secret occluders (Wave 3):** players get `kind: "wall"`. No door handle.
6. **Locked doors:** players see a door they cannot toggle.
7. **Explorer memory (Wave 3):** players may see previously revealed cells in grayscale even if current LOS does not include them, when explorer is on.

## Token ownership

- PC token: `kind = "pc"`, `pcPlanId` set, `ownerUserId` = `CampaignPc.userId`.
- NPC token: `kind = "npc"`, `ownerUserId` null, DM-controlled.
- If a PC is unlinked from the campaign, delete or orphan their tokens on all maps (delete is simpler).

## Fog vs LOS (do not confuse)

- **Fog (Wave 2)** is a GM-painted mask. It hides the map regardless of LOS.
- **LOS (Wave 3)** is computed from walls and vision range. It hides what the token cannot see **inside already revealed fog**.

Combined player view = revealed-by-fog AND currently-in-LOS (or explorer gray).

DM preview toggle (Wave 3): "see as selected token" vs "see all." Default for DM is see all, with an optional player-vision preview (FG's player vision preview).

## Security checks on every write

Every map action:

1. `requireCurrentUser()`
2. Load membership; require `status === "active"`
3. Load map; `map.campaignId === campaignId`
4. Role check from the matrix
5. For moves: token belongs to that map; player owns it

Do not accept client-supplied `layer: "token"` on an NPC create from a player. Ignore unknown fields.
