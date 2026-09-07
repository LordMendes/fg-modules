# 40. Wave 4: lighting and remaining map features

**Prompt:** Implement this wave only after Wave 3. Read `01-requirements.md` for the leftover catalog. Ship as vertical slices; each slice below should be mergeable on its own.

## Goal

Finish the map feature set that Roll20 Dynamic Lighting and Fantasy Grounds lighting actually use at the table: lights, ambient, extra occluder types, and a few quality tools. Do not build an in-app dungeon painter, 3D camera, or weather FX.

## Slice A: lights and ambient

Schema: `CampaignMapLight`, `CampaignMap.lightingEnabled`, `CampaignMap.daylight` (0 = pitch black without lights, 1 = full ambient). Token `emitsLight`, `lightBright`, `lightDim` in **feet**.

Renderer: extend the Wave 3 vision canvas.

- Darkness is the base when lighting is on.
- Ambient `daylight` lifts the whole revealed+LOS area.
- Point lights: bright radius (hard) + dim radius (falloff). Walls occlude light with the same segment tests as vision.
- Token lights move with the token.
- Additive brightness; clamp.

DM UI: place light, presets (candle 5/5, torch 20/20, lantern 30/30 in feet), color, enable/disable, delete. Token checkbox "torch."

Player UI: none except seeing the result.

If UVTT lights were stored in Wave 3, enable them here.

**Accept:** torch in a dark room lights nearby tiles; wall blocks the beam; daylight 1 with LOS on matches Wave 3 visibility without a torch.

## Slice B: typed occluders

Implement kinds already on `CampaignMapOccluder.kind`:

| Kind | Vision | Movement | Player UI |
|---|---|---|---|
| `window` | see through | blocked until open | open if unlocked |
| `terrain` | see into first blob, not past; from inside see out | allowed | none |
| `secret` | wall for players (already Wave 3) | blocked until DM opens | none |
| `illusion` | blocks vision | allowed | none |
| `pit` | optional: skip if time | skip | skip |

Peek: offset occluder segments by a fraction of a square toward the viewer so wall art stays visible. Expose `peekSquares` default `0.1` on the map.

**Accept:** window shows the next room but tokens cannot walk through until opened. Terrain bushes hide what is behind them. Illusion wall hides LOS but the player token can walk through (server allows the move).

## Slice C: table quality

Do these as small PRs:

1. **Token HP pip** (optional): read `PcPlan.hitPoints` current/max if those fields exist; show a bar to the owner and DM only. Skip if HP current is not stored.
2. **Name / conditions:** one-line nameplate toggle; no Roll20 marker sticker sheet unless a tiny set (prone, dead) is trivial CSS.
3. **Duplicate scene** (DM): copy map row, image (R2 copy), tokens, fog, occluders, lights. New ids.
4. **Text labels** (DM): short strings on the map layer, GM-only or shared flag.
5. **Fit party:** button to frame all PC tokens.
6. **Hex grid** only if the calibrate math is clean; otherwise leave `gridType` locked to `square`.

## Slice D: movement extras (optional)

Token lock (FG): players submit a path, DM accepts. Only build this if Wave 3 collision feels insufficient. Not required to call maps "done."

Targeting arrows: out unless a combat tracker exists.

## Still out of scope after Wave 4

- FG Paint, tiles, stamps, image-as-brush
- Skybox, rain/snow, 3D token camera
- Isometric grids
- Per-player fog memory (party explorer is enough)
- Roll20 API / FG extensions
- Multi-instance live hub rewrite (unless production actually needs it)

## Architecture notes

- Do not replace the DOM token layer.
- Lights share occluder segments with LOS. One `visibleFrom(point, segments)` used by both vision and lighting.
- Keep daylight and fog as separate masks: lighting never reveals a Wave 2-hidden room.
- Secret doors stay walls in player payloads.

## Acceptance (wave complete)

- [ ] Lighting can be off (Wave 3 behavior) or on (dark + lights + ambient).
- [ ] Imported UVTT lights work after Slice A.
- [ ] Windows / terrain / illusion behave per the table.
- [ ] Duplicate scene is a playable independent copy.
- [ ] No regression: Wave 1 ping/measure, Wave 2 fog, Wave 3 doors.

## Browser check

1. Night dungeon: daylight 0, torches on PCs, walls carve light.
2. Daylight 1: indoor walls still block; outdoors is fully lit in revealed fog.
3. Window into a lit room: see, cannot walk.
4. Duplicate the scene, set the copy live, confirm tokens did not move on the original.
