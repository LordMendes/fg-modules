# 00. Current combat tracker context

Read this before changing code. Prefer the repo over this file if they drift.

## Product location

The tracker lives inside the campaign table in `dndtools-reference/web`. There is no separate combat route.

| Piece | Path |
|---|---|
| Table UI (orchestrates rail, map, sheets, combat drawer) | `src/components/tools/campaign-table.tsx` |
| Combat drawer (initiative list, rows, attack/damage buttons) | `src/components/combat/campaign-combat-drawer.tsx` |
| NPC library / encounters drawer | `src/components/combat/campaign-npcs-drawer.tsx` |
| Unplaced NPC tray (drag to map) | `src/components/combat/unplaced-combat-tray.tsx` |
| Drawer chrome shared by all drawers | `src/components/combat/campaign-drawer-shell.tsx` |
| Client combat context (targets, pending damage, hit text) | `src/components/combat/combat-context.tsx` |
| Server actions | `src/actions/combat.ts` |
| Mutations (DB + publish) | `src/lib/combat/combatMutations.ts` |
| Loaders (per viewer) | `src/lib/combat/loadCombat.ts` |
| View builder (sort, HP fuzz) | `src/lib/combat/combatView.ts` |
| Types | `src/lib/combat/types.ts` |
| Stat block converters (monster, NPC creator, PC plan) | `src/lib/combat/converters.ts`, `combatMutations.ts` (`pcPlanToCombatStats`) |
| Text parsers | `src/lib/combat/parseAttacks.ts`, `parseAc.ts`, `parseHp.ts`, `parseSaves.ts`, `parseSpaceReach.ts` |
| Health bands | `src/lib/combat/healthStatus.ts` |
| Map targeting arrows | `src/components/map/map-targeting-layer.tsx` |
| Map board (Ctrl+click target, AOE pointers, tokens) | `src/components/map/campaign-map-board.tsx` |
| PC weapon attacks (iterative, crit threat, damage) | `src/components/tools/pc-weapon-attacks-list.tsx`, `src/lib/pc-planner/weaponAttacks.ts` |
| PC spell cast block | `src/components/tools/spell-cast-details-view.tsx`, `src/lib/spell-cast-details.ts` |
| FG spell action model (used for XML export today) | `src/lib/fg-spell-actions/types.ts`, `buildActionXml.ts`, `mergeActions.ts` |
| PC conditions (sheet only) | `src/lib/pc-planner/conditions.ts`, `combatStats.ts` (`aggregateConditionEffects`) |
| Dice provider and 3D dice | `src/components/dice/dice-provider.tsx`, `dice-canvas.tsx` |
| Dice types and notation | `src/lib/dice/types.ts`, `notation.ts`, `parseDiceNotation.ts` |
| Server-side faces for campaign rolls | `src/lib/campaign/rollFaces.ts`, `startCampaignRoll` in `src/actions/campaigns.ts` |
| Live transport | WebSocket at `/ws/campaign/:id` (`server.ts`, `src/lib/campaign/liveWsServer.ts`, `liveHub.ts` with Redis fan-out, `liveClient.ts`, `liveStore.ts`) |
| Live event types | `src/lib/campaign/types.ts` (`CampaignLiveEvent`) |
| Prisma | `prisma/schema.prisma`: `CampaignCombat`, `CampaignCombatant`, `CampaignNpc`, `CampaignEncounter`, `CampaignEncounterEntry`, `CampaignRoll`, `CampaignMapToken` |
| Styles | `.combat-*`, `.campaign-drawer*`, `.tool-btn*`, `.dice-rollable` in `src/styles/theme.css` |

Note: the maps plan folder still says SSE. The table now uses WebSockets. Use `publishCampaignLive` and the WS client; do not add SSE.

## What already works

- `CampaignCombat` per campaign (lazy created), `CampaignCombatant` rows for PCs and NPCs with `init`, `initMod`, `hpMax`, `hpTemp`, `wounds`, `ac`, `acTouch`, `acFlat`, `spaceSquares`, `reachFeet`, `attacks` (parsed FG-style lines), `targetIds`, `faction`, `visibleToPlayers`, `identified`, `snapshot` (speed, saves, abilities, SR string, raw attack text).
- Add party (stats from `PcPlan.state` through `computeCombatStats`), add NPC from library, spawn encounter presets with quantities, place unplaced NPCs on the map, spawn directly on the map.
- `advanceCombatTurn`: sorts by `init` desc, wraps and increments `round`. Manual init edit by the DM. Shift+click rolls initiative but does **not** write the result.
- Targeting: current actor only. Ctrl/Cmd+click a token, chips on the drawer row, SVG arrows on the map.
- PC weapon attack: `iterativeD20Checks` roll, totals compared to each target's `ac` on the client (`combat-context.tsx` `resolveAttackTotals`), targets saved as `pendingDamageTargets`, next damage roll applies the integer to each target through `applyCombatDamage`.
- NPC attack and damage buttons in the DM-expanded row. Damage applies to all current targets.
- `applyCombatDamage`: temp HP first, then wounds; PC HP synced back to `PcPlan.state.hitPoints`; `pcUpdated` and `combatSnapshot` published.
- HP visibility: DM and the owning player see exact numbers, everyone else sees a health band.
- 3D dice with server faces, shared roll log with hidden rolls, `RollResult.faces`, `attackTotals`, `natural20`, `natural1`.
- Crit threat for PC weapons on the sheet (`threatMin`, `critMultiplier`, pending crit multiplies the next damage roll, CSS flash).

## What is missing (summary, details per phase)

- Hit is decided on the client against `ac` only. No touch / flat-footed selection, no auto miss on 1, no auto hit on 20, no confirmation roll, no crit for NPC attacks (`threatMin` is parsed and ignored).
- Damage is an untyped integer. No damage types, DR, energy resistance, immunity, vulnerability, regeneration, fast healing, nonlethal, half on save.
- No saving throw resolution. `fort` / `ref` / `will` sit in `snapshot` and are never rolled against a DC.
- No healing path, no temp HP UI, no death and dying rules (bands are display only).
- No effects or conditions on combatants. PC sheet conditions never reach combat and only cover five presets.
- No combat start/end (`CampaignCombat.active` is unused), no roll-all-initiative, no delay/ready, no drag reorder, dead combatants still take turns.
- Spell casting rolls a d20 and dice with no target, DC, SR or effect.
- No combat log. `CampaignRoll` records dice, not outcomes.
- No HP or condition display on tokens, no combat animations beyond dice and the PC crit flash.
- `advanceCombatTurn` has no DM check. `combatToggleTarget` / `combatNextTurn` WS client message types exist in `campaign/types.ts` but have no server handlers (all mutations run through Server Actions, which is fine).
- `pcPlanToCombatStats` writes `attacks: []`, so the DM cannot roll a PC's attacks from the tracker.
- `monsterToCombatStats` does not extract DR, resistances, immunities, regeneration, SR as numbers, or spell-like abilities.
- Encounter Builder (`/tools/encounter-builder`, EL math) and `CampaignEncounter` presets are separate systems.

## Ruleset bias

D&D 3.5e. Model the tracker on the Fantasy Grounds 3.5E ruleset CT: friend/foe/neutral factions, wounds plus nonlethal plus temp HP, health bands (Healthy, Light, Moderate, Heavy, Critical, Dying, Dead), effect strings with tags and durations, targeting by drag or click, drag a roll result onto a row to apply it, chat lines like `[ATTACK (M)] Longsword [CRITICAL THREAT]`.

## Non-goals inherited from the product

- No Pathfinder-only mechanics (CMB/CMD) unless trivially free.
- No Foundry or Roll20 macro compatibility.
- No FG XML export of the live combat state in these phases (the NPC and spell exporters already exist and stay unchanged).
- No voice/video.
