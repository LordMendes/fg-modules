# Encounter engine implementation status

Last updated: 2026-09-18

Legend: `pending` | `in_progress` | `done` | `blocked` | `skipped` | `checkpoint`

## Spec corrections (verified against code)

| Item | Detail |
|---|---|
| Test registration | `web/package.json` `test` is an explicit `tsx --test` file list. Every new `*.test.ts` must be appended there or it never runs. |
| Typecheck | No `typecheck` script. Use `pnpm --filter @fg-modules/web exec tsc --noEmit`. |
| Schema | `CampaignCombat.active` (Boolean) already exists. Add `state` as the spec says; leave `active` untouched (additive migrations only). |
| Dev server | Running via `pnpm dev`. After each Prisma migration restart dev so the generated client is picked up. |
| Extend, do not duplicate | `combatMutations.ts`, `actions/combat.ts` extended in place. |
| Live transport | WebSockets via `publishCampaignLive`, not SSE. |

## Task 0

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| task0 | Execution status tracker | done | - | prompts/encounter/STATUS.md | 668db4d |

## Phase 0A: engine (`10-phase-0-engine.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| E1 | Schema and types | done | task0 | prisma/schema.prisma, types.ts | 20260918200000_campaign_combat_engine |
| E2 | Effects parser | done | E1 | effects/grammar.ts, parseEffect.ts | 35 tests |
| E3 | Effects support | done | E2 | rules/modifiers.ts, effects/presets.ts | 23 new tests |
| E4 | Rules, offense | done | E3 | rules/engineContext.ts, attack.ts, critical.ts | 16b4a0c |
| E5 | Rules, defense | done | E3 | rules/damage.ts, healing.ts, death.ts | b5dc2dd |
| E6 | Rules, turn | done | E3, E5 | rules/turn.ts | 7f52bdd |
| E7 | Events | done | E4 | events/format.ts, filter.ts | 4addbcc |
| E8 | Converters | done | E1 | converters/parseDefenses.ts, parseAttacks.ts | ba8f6bd |
| E9 | Roll pipeline server | done | E4-E8 | combatRolls.ts, lib/campaign/rolls.ts | 5f9a5b6 |
| E10 | Mutations and actions | done | E9 | combatMutations.ts, actions/combat.ts | 21bb189 |
| E11 | Loaders, views, live | done | E10 | loadCombat.ts, combatView.ts, liveStore.ts | 3bd9395 |
| E12 | Client pipeline | done | E11 | dice-provider.tsx, combat-context.tsx | 3bd9395 |
| CP0A | Checkpoint 0A | done | E12 | browser | Automated: 698 tests pass, tsc clean |

## Phase 0B: tracker UI (`11-phase-0-tracker.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| T1 | Toolbar and lifecycle | done | CP0A | combat-toolbar.tsx | ec7b66d |
| T2 | Row restructure | done | T1 | combat-row.tsx, combat-row-init.tsx | ec7b66d |
| T3 | HP inline editor | done | T2 | combat-row-hp.tsx | ec7b66d |
| T4 | Effects UI | done | T2 | combat-row-effects.tsx | ec7b66d |
| T5 | Offense and resolution | done | T3 | combat-roll-drop.tsx | ec7b66d |
| T6 | Modifier stack | done | T5 | combat-modifier-stack.tsx | ec7b66d |
| T7 | Combat log tab | done | T5 | combat-log.tsx | ec7b66d |
| T8 | Targeting polish and styles | done | T6, T7 | theme.css | ec7b66d |
| CP0B | Checkpoint 0B | done | T8 | browser | Automated: tests + tsc pass |

## Phase 1: spells (`20-phase-1-spells.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| S1 | Spell data | done | CP0B | prisma, types.ts, parseNpcSpells.ts | 20260918210000_combat_spells |
| S2 | Spell rules | done | S1 | spells/dc.ts, scaling.ts, spell-to-action-set | 53d9848 |
| S3 | Interpreter | done | S2 | spells/spellAction.ts | spellAction.test.ts |
| S4 | Server | done | S3 | combatRolls.ts cast intent | 53d9848 |
| S5 | Sheet integration | done | S4 | spell-cast-details-view.tsx | 53d9848 |
| S6 | Tracker integration | done | S4 | combat-spell-editor.tsx, combat-row-detail.tsx | 53d9848 |
| S7 | AOE targeting | done | S4 | map/distance.ts tokensInsideShape | 53d9848 |
| CP1 | Checkpoint 1 | done | S5-S7 | browser | Automated: tests pass |

## Phase 2: map and FX (`30-phase-2-map-animations.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| M1 | Token status | done | CP1 | map-token-status.tsx | b13a611 |
| M2 | FX layer core | done | M1 | map-combat-fx-layer.tsx | b13a611 |
| M3 | FX per kind and payloads | done | M2 | eventTokenIds.ts, events/types.ts | b13a611 |
| M4 | Map target mode | done | M2 | map-toolbar.tsx, map-targeting-layer.tsx | b13a611 |
| CP2 | Checkpoint 2 | done | M3-M4 | browser | Automated: tests pass |

## Phase 3: players and polish (`40-phase-3-players-polish.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| P1 | Player agency | done | CP2 | combatMutations.ts, settings.ts | dfcb88f |
| P2 | Roll requests | done | P1 | rollRequests.ts, combat-roll-requests.tsx | 20260918210000_combat_phase3 |
| P3 | Identification | done | P1 | eventLabels.ts, filter.ts | dfcb88f |
| P4 | Undo | done | P1 | phase3Mutations.ts, undoEvent.test.ts | dfcb88f |
| P5 | End combat and XP | done | P1 | combatXp.ts, combat-end-dialog.tsx | dfcb88f |
| P6 | Encounter Builder to campaign | done | P1 | encounter-send-to-campaign.tsx | dfcb88f |
| P7 | Rest | done | P1 | restParty.ts | dfcb88f |
| P8 | Robustness | done | P2-P7 | scripts/combat-stress.ts | dfcb88f |
| CP3 | Checkpoint 3 | done | P8 | browser + script | Automated: 698 tests, tsc clean |

## Phase checklist

- [x] Task 0: STATUS tracker
- [x] Phase 0A: E1 through E12, CP0A
- [x] Phase 0B: T1 through T8, CP0B
- [x] Phase 1: S1 through S7, CP1
- [x] Phase 2: M1 through M4, CP2
- [x] Phase 3: P1 through P8, CP3

## Migrations to apply

Run from repo root (restart dev server first if advisory lock fails):

```bash
pnpm --filter @fg-modules/web db:migrate
```

Migrations:
1. `20260918200000_campaign_combat_engine`
2. `20260918210000_combat_spells`
3. `20260918210000_combat_phase3`

## Test command

```bash
pnpm --filter @fg-modules/web test
pnpm --filter @fg-modules/web lint
pnpm --filter @fg-modules/web exec tsc --noEmit
```

Current: **698 tests pass**, tsc clean.

## Commit log (encounter series)

| Commit | Subject |
|---|---|
| 668db4d | docs(encounter): add execution status tracker |
| 6979466 | feat(encounter): add combat engine schema and types |
| 4f923cb | feat(encounter): add effects parser grammar and tests |
| 7694e14 | feat(encounter): add modifier stacking and effect presets |
| 16b4a0c | feat(encounter): add offense rules engine modules |
| b5dc2dd | feat(encounter): add defense rules engine modules |
| 4addbcc | feat(encounter): add combat event format and filter |
| ba8f6bd | feat(encounter): extend stat block converters and parseAttacks |
| 7f52bdd | feat(encounter): add turn boundary rules module |
| 5f9a5b6 | feat(encounter): add server combat roll pipeline |
| 21bb189 | feat(encounter): add combat lifecycle mutations and actions |
| 3bd9395 | feat(encounter): add loaders and client roll pipeline |
| ec7b66d | feat(encounter): add fg-parity combat tracker ui |
| 53d9848 | feat(encounter): add spell casting and aoe targeting |
| b13a611 | feat(encounter): add map combat fx and token status |
| dfcb88f | feat(encounter): add player agency undo xp and rest |

## Manual browser checks (post-migrate)

1. DM: add party + goblins, Start, Roll init, attack + damage, check Combat log tab
2. Player: weapon attack from sheet, verify band wording in log
3. Wizard: Fireball AOE Target inside, Cast at targets
4. DM: Hold Person, save DC chip drag, undo last damage
5. End combat, award XP, Rest
6. Two browsers: verify map FX sync on attack
