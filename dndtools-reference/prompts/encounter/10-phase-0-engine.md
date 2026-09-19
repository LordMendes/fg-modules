# 10. Phase 0A: rules engine, effects, roll pipeline, combat log

**Prompt:** Implement this file only. Read `README.md`, `00-context.md`, `02-architecture.md`, `03-data-model.md`, `04-permissions.md`, `05-effects-dsl.md`, `06-ui-ux.md`, and `07-automation-rules.md` first. Phase 0B (`11-phase-0-tracker.md`) builds the UI on top of this; keep the existing drawer working while you replace its internals.

## Goal

The server can run a full melee encounter with Fantasy Grounds semantics: start combat, roll initiative, take turns, resolve attacks against the right AC with crits, apply typed damage through DR and resistances, heal, track dying and death, and apply effect strings that change every roll and expire on time. Every step is a persisted event that the log can show. Existing buttons (PC weapon attacks, NPC attack and damage, Next actor) are rewired to the new pipeline so the table keeps working during the phase.

## User stories

1. As DM, I click Start, roll initiative for everyone, and the order sorts with tiebreaks.
2. As DM, I expand a goblin and click its scimitar; the roll resolves against every target's correct AC, logs hit or miss, and flags a threat.
3. As DM, I click damage; the goblin's pending targets take slashing damage minus their DR, the log shows the math, and a target at -3 gains the Dying effect.
4. As DM, I type `Bless; ATK: 1 morale; SAVE: 1 morale vs fear` on a PC, and the next attack roll from that PC includes +1 with the tooltip naming Bless. Ten rounds later it expires on the cleric's turn with a log line.
5. As a player, my weapon attack from the sheet resolves on the server; I see hit or miss per target and the damage button applies to the ones I hit.
6. As a player, I see "Goblin 2: Heavy" while the DM sees "Goblin 2 takes 9 (DR 5 -> 4), 3/12".

## Implementation order

### 1. Schema

- Add `CampaignCombatEffect`, `CampaignCombatEvent`, and the new `CampaignCombat` / `CampaignCombatant` columns from `03-data-model.md` (Phase 0 block only).
- Migration name: `campaign_combat_engine`.
- Backfill: none. Existing combats get `state = "active"` if they have combatants, else `idle` (a one-line data migration is fine).

### 2. Effects library (`src/lib/combat/effects/`)

- `grammar.ts`: tag list, bonus types, damage types with aliases, attack and save descriptors, condition keys.
- `parseEffect.ts`: implement the grammar from `05-effects-dsl.md`. Return `{ components, warnings }`. Never throw on user text.
- `formatEffect.ts`: canonical string.
- `presets.ts`: every condition in the table with its preset string and a lucide icon name. Export `CONDITION_PRESETS` compatible with `src/lib/pc-planner/conditions.ts` and make that file re-export from here (keep its `aggregateConditionEffects` for the sheet, but source the table from presets).
- `applyEffects.ts`: `collect(ctx, tag, filter)` returning itemized parts, using `rules/modifiers.ts` stacking.
- `duration.ts`: convert minutes/hours/days to rounds on creation; `tick(effect)`; `shouldTick(effect, actorInit, boundary)`.
- Tests: every example row in `05-effects-dsl.md`, stacking (two morale bonuses take the higher, dodge stacks, penalties stack), aliases, garbage input returns label only with a warning.

### 3. Rules library (`src/lib/combat/rules/`)

Implement the modules in `02-architecture.md` with the math in `07-automation-rules.md`:

- `modifiers.ts`, `engineContext.ts`, `initiative.ts`, `turn.ts`, `attack.ts`, `critical.ts`, `damage.ts`, `healing.ts`, `death.ts`, `saves.ts`, `spellResistance.ts`, `concealment.ts`.
- All pure. Inputs are `EngineContext` plus plain params and pre-rolled faces. Outputs are payload objects from `events/types.ts` plus a list of state patches (`{ combatantId, wounds?, hpTemp?, nonlethal?, pendingTargetIds?, pendingCrit?, addEffects?, removeEffectIds?, turnState?, deathState? }`).
- Tests (see `90-testing.md` matrix): at least one test per row of the matrix.

### 4. Events (`src/lib/combat/events/`)

- `types.ts`: kinds and payloads from `03-data-model.md`.
- `format.ts`: `formatEventForViewer(event, viewer)` -> `CombatEventView.lines` following the wording in `06-ui-ux.md`. DM gets numbers, players get bands and no defense amounts.
- `filter.ts`: `filterEventForViewer(event, viewer, combat)` -> `CombatEventView | null` (null when `visibility = dm` or the involved row is hidden).
- Tests: attack hit, crit threat, damage with DR, heal, effect expire, hidden NPC; DM vs player output.

### 5. Persistence and publishing (`combatMutations.ts`, new `combatRolls.ts`)

- `writeCombatEvent(tx, combat, kind, payload, opts)` increments `eventSeq` and inserts. Returns the row.
- After the transaction, publish `combatEvent` to each viewer class (DM payload, player payload) using the existing `publishCampaignLive` and the per-viewer filtering approach already used for `combatSnapshot` (check how `publishCombatSnapshot` sends DM and player versions and mirror it).
- New mutations:
  - `startCombat`, `endCombat` (clears targets, pending, non-permanent effects; keeps rows), `resetCombat` (removes NPC rows, resets round).
  - `rollInitiativeFor(actor, scope)`: server faces, writes `init` events, sets `currentCombatantId` to the top row if none.
  - `setActiveCombatant(actor, id)`.
  - `delayCombatant`, `readyCombatant`, `actNow`.
  - `advanceCombatTurn`: add DM check; run `turn.turnEnd` for the current actor and `turn.turnStart` for the next (effects tick, DMGO, regen, dying loss). Skip `dead` and `removed`. Write `turnStart`, `roundStart` events.
  - `applyHeal`, `applyTempHp`, `setHp` (DM), `applyNonlethal`.
  - `addEffect(actor, combatantIds, input)`, `removeEffect`, `toggleEffectActive`, `clearEffects(scope)`.
  - `clearTargets(actor, scope)`.
  - `setCombatantFlags` (visible, identified, faction, turnState).
  - `removeDeadNpcs`.
  - Rewrite `applyCombatDamage` to accept `DamagePacket[]` and flags, run `rules/damage.ts` + `rules/death.ts`, write events, keep the `PcPlan` HP sync.
- `combatRolls.ts` `startCombatRoll(actor, intent)`:
  - Extract the roll persistence from `startCampaignRoll` into `src/lib/campaign/rolls.ts` (`persistCampaignRoll`, `publishRoll`) and reuse it.
  - Intents: `initiative`, `attack`, `confirm`, `damage`, `save`, `heal`, `stabilize`, `sr` (engine only in Phase 0; UI in Phase 1 for `save` and `sr`).
  - One `prisma.$transaction` per call with a row lock on `CampaignCombat`.
  - Returns `{ roll: CampaignRollView, outcome }`.
- Update `loadCombatForViewer` and `combatView.ts` to include effects, nonlethal, death state, defenses, pending fields, filtered per `04-permissions.md`. Add `loadCombatEvents(campaignId, viewer, limit)`. Add `combatEvents` to `getCampaignTable`.

### 6. Converters

- `monsterToCombatStats`, `npcCreatorToCombatStats`: fill `defenses` and `stats` (`03-data-model.md`). Add `parseDefenses.ts` with tests for the listed phrases.
- `pcPlanToCombatStats`: fill `attacks` from `weaponAttacks.ts` (per-attack bonuses, damage dice, damage types from weapon category and enhancement, `threatMin`, `critMultiplier`), `stats` from ability mods. Extend `CombatAttackLine` with `attackType`, `critMultiplier`, `damageTypes`, `iterativeBonuses`.
- `parseAttacks.ts`: infer `attackType` (`touch` in the name -> mtouch, `ray` -> rtouch) and damage types from the weapon name (`bite`, `claw`, `slam` -> bludgeoning/piercing/slashing per SRD natural weapon table; `longsword` -> slashing; unknown -> untyped). Keep it a small lookup, not a full weapon DB.

### 7. Client pipeline

- `RollRequest.combat?: CombatRollIntent`; dice provider routes to `startCombatRoll` when present and attaches `result.combat = outcome`.
- `combat-context.tsx`: replace `resolveAttackTotals` and the client `applyDamage(int)` with `rollAttack`, `rollConfirm`, `rollDamage`, `rollHeal`, `applyEffect`, `removeEffect`, `nextActor`, plus `modifierStack` state consumed by each roll. Keep the same hook name so existing callers compile.
- `pc-weapon-attacks-list.tsx`: build a `CombatRollIntent` from the weapon row when a combat context exists; keep the local crit flash but source `pendingCrit` from the combatant row instead of local state when in combat.
- `campaign-combat-drawer.tsx`: NPC attack and damage buttons use the new intents; Shift+click init writes init through the `initiative` intent; Next actor calls the guarded mutation. Do not redesign the drawer here; Phase 0B does.
- `liveStore.ts`: handle `combatEvent` (append, ring buffer 200), `combatEffectUpsert/Remove` (patch snapshot or ignore and wait for snapshot).
- Minimal log: add the **Combat** tab in the rail with plain lines so the phase is verifiable in the browser. Phase 0B polishes it.

## Acceptance

- [ ] Migration applies; existing campaigns open with no errors and old combats still show their rows.
- [ ] `parseEffect` tests pass for every example in `05-effects-dsl.md`.
- [ ] Rules tests pass for every row in `90-testing.md` "Rules matrix".
- [ ] Roll initiative for all sorts rows; ties broken by initMod; Next actor skips dead rows; round increments on wrap.
- [ ] Goblin scimitar vs a PC in `Mage Armor; AC: 4 armor`: log shows AC 4 higher than the raw row AC and the tooltip lists Mage Armor.
- [ ] Attack with face 20 hits an AC 40 target; face 1 misses AC 5.
- [ ] Threat on 19 with `threatMin 19` sets `pendingCrit`; confirm roll clears or keeps it; damage doubles base dice and modifier only.
- [ ] `9 slashing` vs `DR 5/magic` applies 4; `9 slashing, magic` applies 9; `10 fire` vs `RESIST: 10 fire` applies 0; `IMMUNE: fire` drops the packet; `VULN: cold` makes 10 into 15.
- [ ] Damage taking a PC to -3 adds system effect Dying, log shows it; heal 5 removes Dying and Disabled is not present; -10 marks Dead and Next actor skips it.
- [ ] `Bless` with 10 rounds on the cleric's init expires on the cleric's 11th turn start with an `effectExpire` event; `endOfTurn` variant expires at the end.
- [ ] `REGEN: 5` heals 5 at the troll's turn start and logs it; `DMGO: 1d6 fire` deals damage at the target's turn start.
- [ ] Player client receives no `defenses`, no `gm` effects, no hidden rows, and damage lines with bands.
- [ ] Two clients: a player attack from the sheet appears on the DM's log within a second with the same faces the player saw.
- [ ] `combatNextTurn` from a player account returns a permission error.
- [ ] `pnpm lint`, `pnpm typecheck` (or the repo equivalents), and `pnpm test` pass.

## Out of this phase

Tracker redesign, effect chips UI, modifier stack UI, drag and drop, spells, saves UI, map bars, animations, undo.

## Browser check

1. DM: add party and two goblins from the library, Start, Roll init (all).
2. DM: target a PC with goblin 1 (Ctrl+click), roll scimitar, roll damage. Check log and HP.
3. DM: add `Bless; ATK: 1 morale` to the PC with 2 rounds. Advance turns until it expires. Check log.
4. Player: roll weapon attack from the sheet against goblin 2 (targets via Ctrl+click on own turn), roll damage. Check both logs and HP band vs number.
5. Reload both tabs: rows, effects, and the log persist.
