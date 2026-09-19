# 90. Testing, automation acceptance, rollout

Automations are the product. A rule without a test is not done. Tests live next to the module (`*.test.ts`, same runner as `src/lib/pc-planner/*.test.ts` and `src/lib/combat/combat.test.ts`).

## Rules matrix (unit tests, Phase 0A)

| Module | Case | Expected |
|---|---|---|
| `effects/parseEffect` | every example row in `05-effects-dsl.md` | components as listed |
| `effects/parseEffect` | `ATK: +2 morale; ATK: +1 morale` | collect ATK = +2 (same type, highest) |
| `effects/parseEffect` | `AC: 1 dodge; AC: 1 dodge` | collect AC = +2 (dodge stacks) |
| `effects/parseEffect` | `ATK: -2; ATK: -2 morale` | collect ATK = -4 (penalties stack) |
| `effects/parseEffect` | `RESIST: 10 elec` | RESIST 10 electricity (alias) |
| `effects/parseEffect` | `just a label` | LABEL only, no warnings |
| `effects/parseEffect` | `FOO: 3` | LABEL "FOO: 3", warning unknown tag |
| `effects/duration` | 1 minute -> 10 rounds; tick at source init start; expire at 0 | `effectExpire` |
| `effects/duration` | `endOfTurn` effect ticks after the actor's turn, not before | remains through the actor's own rolls that turn |
| `rules/initiative` | faces 15 and 15, mods +3 and +1 | order: +3 first; stored 18.03 and 16.01 |
| `rules/initiative` | delay then act now before actor at 12 | init 11.99, normal state |
| `rules/attack` | face 20 vs AC 40 | hit, autoHit |
| `rules/attack` | face 1 vs AC 5 | miss, autoMiss |
| `rules/attack` | +9 face 8 vs AC 17 | 17 hits (equal) |
| `rules/attack` | `mtouch` vs ac 20 / touch 12 | uses 12 |
| `rules/attack` | target Flat-footed | uses `acFlat` |
| `rules/attack` | target Prone, melee | +4; ranged -4 |
| `rules/attack` | attacker Shaken | -2 in modifiers with label |
| `rules/attack` | `ATK: 1 morale` on attacker, `Bless` label | +1, tooltip names Bless |
| `rules/attack` | `AC: 4 armor` on target | AC raised |
| `rules/attack` | target `CONC`, d% 15 | miss by concealment; d% 25 -> normal resolution |
| `rules/attack` | threatMin 19, face 19 hit | threat true; face 19 miss (low total) -> threat false |
| `rules/critical` | confirm face 1 | not confirmed |
| `rules/critical` | `IMMUNE: crit` target | no confirmation, immune flag |
| `rules/critical` | 1d8+4 x2 with `DMG: 1d6 fire` extra | 2d8+8 plus 1d6 once |
| `rules/damage` | 9 slashing vs `DR 5/magic` | 4 |
| `rules/damage` | 9 slashing,magic vs `DR 5/magic` | 9 |
| `rules/damage` | 9 slashing vs `DR 5/-` and `DR 10/magic` | 0 (highest non-bypassed DR is 10) |
| `rules/damage` | 9 slashing,magic vs `DR 5/-` and `DR 10/magic` | 4 (DR 10 bypassed, DR 5/- applies) |
| `rules/damage` | 10 fire vs `RESIST: 10 fire` | 0 |
| `rules/damage` | 10 fire vs `IMMUNE: fire` | 0, adjustment immune |
| `rules/damage` | 10 cold vs `VULN: cold` | 15 |
| `rules/damage` | 7 fire half | 3 |
| `rules/damage` | 1 fire half | 1 (minimum 1) |
| `rules/damage` | 6 precision vs `IMMUNE: precision` | 0 |
| `rules/damage` | 8 vs temp 5, wounds 0 | temp 0, wounds 3 |
| `rules/damage` | 5 nonlethal | nonlethal 5, wounds unchanged |
| `rules/healing` | heal 4 with wounds 6, nonlethal 3 | wounds 2, nonlethal 0 |
| `rules/healing` | temp 5 then temp 3 | temp 5 |
| `rules/death` | hpMax 10, wounds 13 | dying, system effect Dying |
| `rules/death` | wounds 20 | dead |
| `rules/death` | wounds 10 | disabled |
| `rules/death` | nonlethal 10, hp 10 | staggered; nonlethal 11 -> unconscious |
| `rules/death` | dying then heal 5 | no death state, Dying removed |
| `rules/turn` | REGEN 5 at turn start | wounds -5, event regen |
| `rules/turn` | DMGO 1d6 fire, faces [4] | damage 4 fire at target's turn start |
| `rules/turn` | dying actor turn start | wounds +1, event |
| `rules/turn` | next actor skips dead | correct next id; round increments on wrap |
| `rules/saves` | +5 face 10 vs DC 15 | success (equal) |
| `rules/saves` | `SAVE: 2 morale vs fear`, source descriptor fear | +2; source poison -> +0 |
| `rules/saves` | `FORT: 2` on Reflex | +0 |
| `rules/spellResistance` | CL 8 face 11 vs SR 18 | 19 passes; face 9 fails |
| `events/format` | damage event DM vs player | numbers vs band word |
| `events/filter` | hidden actor, player viewer | actorName null |
| `converters/parseDefenses` | `DR 10/magic`, `DR 15/adamantine or silver`, `resistance to fire 10, cold 5`, `immunity to fire and poison`, `SR 18`, `regeneration 5 (fire, acid)`, `fast healing 3` | structured `Defenses` |
| `converters/pcPlanToCombatStats` | fighter with +1 longsword BAB 6 | two iterative bonuses, slashing+magic, 19-20/x2 |

## Phase 1 matrix

| Module | Case | Expected |
|---|---|---|
| `spells/dc` | level 3, Int 18, `DC: 1` evocation effect, Fireball | 10+3+4+1 = 18 |
| `spells/scaling` | `cl` max 10 at CL 12 | 10 dice; `halfcl` at CL 7 -> 3 |
| `spells/spellAction` | Fireball, target SR 18 fails SR | no save, no damage for that target |
| `spells/spellAction` | Fireball, save success, `onmissdamage half` | half damage |
| `spells/spellAction` | Hold Person, save success | no effect; failure -> Paralyzed for CL rounds |
| `spells/spellAction` | Scorching Ray miss | no damage packet |
| `spells/spellAction` | Cure Light Wounds CL 9 | 1d8+5 |
| `spells/spellAction` | Bless CL 6 | duration 60 rounds, tickInit caster |
| `spells/spellToActionSet` | compendium Fireball, Hold Person, Cure Light Wounds, Scorching Ray, Bless | action sets with expected fields, confidence high |
| `map/distance` | tokens inside a 20 ft burst with 5-10-5 | correct set |

## Automation acceptance (browser, every phase)

Run with a DM tab and a player tab. Each item must show the result in three places: the tracker row, the combat log, and (from Phase 2) the map.

1. Roll init all: order changes, active actor set, log line per row.
2. Attack hit and miss against normal, touch and flat-footed targets.
3. Threat, confirm, crit damage.
4. Damage through DR, resistance, immunity, vulnerability, temp HP, nonlethal.
5. Dying, stabilize, death, heal out of dying.
6. Effect apply with duration, effect changes a roll (tooltip), effect expires at the right boundary.
7. Regeneration and ongoing damage at turn start.
8. Modifier stack once and sticky.
9. Player wording and hidden data (inspect the WS payload in dev tools; no `defenses`, no `gm` effects, no hidden rows).
10. Phase 1: cast with SR, save half, heal, effect from spell, slots.
11. Phase 2: FX per event type, reduced motion, HP bars quantized for players.
12. Phase 3: save requests, undo, XP, rest, send from Encounter Builder.

## Regression guards

- The non-campaign PC sheet, spell pages, NPC creator and FG exporters must be untouched: run their existing tests and open `/tools/pc-planner`, a spell page, and the NPC creator once per phase.
- `campaign-table.tsx` with no combat rows renders the same as before (screenshot compare by eye is enough).
- Existing map tests (`src/lib/map/*.test.ts`) still pass.

## Data safety

- Every mutation runs in a transaction with a row lock on `CampaignCombat`.
- Never delete `CampaignCombatEvent` rows except retention pruning on `endCombat`.
- Migrations are additive; no column drops in these phases.
- Do not log `.env` secrets in tests or stress scripts.

## Rollout

1. Phase 0A migration on deploy; existing combats keep working with `state = active`.
2. No feature flag needed: an idle combat with no rows changes nothing for the table.
3. Phase 2 adds at most one small animation dependency; check bundle size of the campaign route before and after (`next build` output) and keep the delta under 30 KB gzipped.
4. Redis and WS unchanged; verify `combatEvent` fan-out across two server instances if the deployment runs more than one (same check maps did for `mapSnapshot`).

## Implementation checklist for an agent

Before coding a phase:

- [ ] Read the phase file and the shared specs (`02` to `07`)
- [ ] List files to add, matching `02-architecture.md`
- [ ] One Prisma migration if the phase adds tables or columns

After coding:

- [ ] Unit tests for every new `src/lib/combat/**` module, matrix rows covered
- [ ] Browser path from the phase's "Browser check" with DM and player tabs
- [ ] Player payload inspected for leaks
- [ ] `pnpm lint`, typecheck and tests green
- [ ] UI compared side by side with the NPC drawer and roll log for consistency

Do not start Phase N+1 in the same PR as Phase N unless the user asks to combine them.
