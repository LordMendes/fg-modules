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
| Extend, do not duplicate | `combatMutations.ts` (`ensureCombat`, `applyCombatDamage`, `toggleCombatTarget`, `advanceCombatTurn`, `setCombatantInit`, `pcPlanToCombatStats`), `actions/combat.ts` (`requireCombatActor`, `combatNextTurn`, `combatApplyDamage`, `loadCombatState`). |
| Live transport | WebSockets via `publishCampaignLive`, not SSE. |

## Task 0

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| task0 | Execution status tracker | done | - | prompts/encounter/STATUS.md | Committed 668db4d |

## Phase 0A: engine (`10-phase-0-engine.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| E1 | Schema and types | done | task0 | prisma/schema.prisma, src/lib/combat/types.ts | Migration `20260918200000_campaign_combat_engine` |
| E2 | Effects parser | done | E1 | src/lib/combat/effects/grammar.ts, parseEffect.ts, formatEffect.ts, *.test.ts | 35 tests |
| E3 | Effects support | done | E2 | rules/modifiers.ts, effects/presets.ts, applyEffects.ts, duration.ts, pc-planner/conditions.ts | 23 new tests |
| E4 | Rules, offense | done | E3 | rules/engineContext.ts, initiative.ts, attack.ts, critical.ts, concealment.ts | |
| E5 | Rules, defense | done | E3 | rules/damage.ts, healing.ts, death.ts, saves.ts, spellResistance.ts | |
| E6 | Rules, turn | done | E3, E5 | rules/turn.ts | 5 tests |
| E7 | Events | done | E4 | events/types.ts, format.ts, filter.ts | Commit 4addbcc (mislabeled turn) |
| E8 | Converters | done | E1 | converters/parseDefenses.ts, converters.ts, parseAttacks.ts, combatMutations.ts | |
| E9 | Roll pipeline server | pending | E4-E8 | lib/campaign/rolls.ts, combatRolls.ts, combatMutations.ts, actions/combatRolls.ts | Row lock, rewrite applyCombatDamage |
| E10 | Mutations and actions | pending | E9 | combatMutations.ts, actions/combat.ts | Full lifecycle + permissions matrix |
| E11 | Loaders, views, live | pending | E10 | loadCombat.ts, combatView.ts, campaign/types.ts, liveStore.ts | Per-viewer filtering, combatEvents |
| E12 | Client pipeline | pending | E11 | dice-provider.tsx, combat-context.tsx, pc-weapon-attacks-list.tsx, campaign-combat-drawer.tsx | Minimal Combat tab in rail |
| CP0A | Checkpoint 0A | pending | E12 | browser | DM + player tabs, WS payload leak check |

## Phase 0B: tracker UI (`11-phase-0-tracker.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| T1 | Toolbar and lifecycle | pending | CP0A | campaign-combat-drawer.tsx | Start/End, Roll init menu, N key |
| T2 | Row restructure | pending | T1 | combat-row.tsx, combat-row-init.tsx, combat-row-detail.tsx | Status strip, faction cycle, dead styling |
| T3 | HP inline editor | pending | T2 | combat-row-hp.tsx | Five actions, player subset |
| T4 | Effects UI | pending | T2 | combat-row-effects.tsx | Chips, presets, parse preview, Shift+Enter |
| T5 | Offense and resolution | pending | T3 | combat-roll-drop.tsx, campaign-combat-drawer.tsx, campaign-map-board.tsx | Drag + click, map token drops |
| T6 | Modifier stack | pending | T5 | combat-modifier-stack.tsx, combat-context.tsx | Sticky, rail badge |
| T7 | Combat log tab | pending | T5 | combat-log.tsx | Tones, jump to latest, row focus |
| T8 | Targeting polish and styles | pending | T6, T7 | theme.css, campaign-combat-drawer.tsx | Crosshair toggle, --combat-* tokens |
| CP0B | Checkpoint 0B | pending | T8 | browser | Visual compare with NPC drawer |

## Phase 1: spells (`20-phase-1-spells.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| S1 | Spell data | pending | CP0B | prisma/schema.prisma, types.ts, converters.ts | Migration `campaign_combat_spells` |
| S2 | Spell rules | pending | S1 | spells/dc.ts, scaling.ts, spell-cast-details.ts, effects/grammar.ts | DC tag, spellToActionSet |
| S3 | Interpreter | pending | S2 | spells/spellAction.ts | Fireball, Hold Person, CLW, Bless tests |
| S4 | Server | pending | S3 | combatRolls.ts, combatMutations.ts | cast/save/sr intents, slot sync |
| S5 | Sheet integration | pending | S4 | spell-cast-details-view.tsx | Cast at targets, editable action set |
| S6 | Tracker integration | pending | S4 | campaign-combat-drawer.tsx, combat-spell-editor | Spells list, save DC chip drag |
| S7 | AOE targeting | pending | S4 | map/distance.ts, campaign-map-board.tsx | tokensInsideShape, Target inside |
| CP1 | Checkpoint 1 | pending | S5-S7 | browser | Non-campaign spell pages unchanged |

## Phase 2: map and FX (`30-phase-2-map-animations.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| M1 | Token status | pending | CP1 | map-token-status.tsx | Quantized bars, icon strip, dead/prone |
| M2 | FX layer core | pending | M1 | map-combat-fx-layer.tsx | seq subscription, rollId grouping, reduced motion |
| M3 | FX per kind and payloads | pending | M2 | map-combat-fx-layer.tsx, events/types.ts | Arc, projectile, burst, payload token ids |
| M4 | Map target mode | pending | M2 | campaign-map-board.tsx, map-targeting-layer.tsx | T toggle, arrowheads, token drops |
| CP2 | Checkpoint 2 | pending | M3-M4 | browser | Two clients, reduced motion, AOE DOM baseline |

## Phase 3: players and polish (`40-phase-3-players-polish.md`)

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| P1 | Player agency | pending | CP2 | combatMutations.ts, combat-context.tsx | Off-turn targeting, strictTurns option |
| P2 | Roll requests | pending | P1 | prisma/schema.prisma, live events, UI | CampaignCombatRollRequest table |
| P3 | Identification | pending | P1 | combatView.ts, campaign-combat-drawer.tsx | New-event naming, Reveal helper |
| P4 | Undo | pending | P1 | combatMutations.ts, combat-log.tsx | Most-recent-only rule |
| P5 | End combat and XP | pending | P1 | combatMutations.ts, src/lib/encounter/ | Award to PcPlan.state |
| P6 | Encounter Builder to campaign | pending | P1 | encounter-builder, campaign-npcs-drawer.tsx | Send to campaign, EL display |
| P7 | Rest | pending | P1 | combatMutations.ts | restParty night/full |
| P8 | Robustness | pending | P2-P7 | scripts/combat-stress.ts, a11y pass | Reconnect, retention, cascade cleanup |
| CP3 | Checkpoint 3 | pending | P8 | browser + script | Full encounter, stress script |

## Phase checklist

- [ ] Task 0: STATUS tracker
- [ ] Phase 0A: E1 through E12, CP0A
- [ ] Phase 0B: T1 through T8, CP0B
- [ ] Phase 1: S1 through S7, CP1
- [ ] Phase 2: M1 through M4, CP2
- [ ] Phase 3: P1 through P8, CP3

## Test command

From repo root:

```bash
pnpm --filter @fg-modules/web test
pnpm --filter @fg-modules/web lint
pnpm --filter @fg-modules/web exec tsc --noEmit
```

Register new test files in `web/package.json` `test` script.

## Suggested commits

Use `feat(encounter): <subject>` per completed task. Task 0 uses `docs(encounter): add execution status tracker`.
