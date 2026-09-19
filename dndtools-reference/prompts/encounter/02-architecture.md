# 02. Architecture

## Principles

1. **Pure rules, impure edges.** All 3.5e math lives in `src/lib/combat/rules/*` as pure functions over plain objects with unit tests. Prisma, auth and publishing live in `combatMutations.ts` and `src/actions/*`.
2. **Server-authoritative rolls.** A combat roll is one Server Action call: the server generates faces (`rollFaces.ts`), resolves the outcome with the rules engine, writes `CampaignRoll` plus one or more `CampaignCombatEvent` rows, updates combatants, publishes live events, and returns `{ roll, outcome }`. The client animates dice-box on the returned faces and shows the outcome.
3. **Events are the log and the animation source.** Every mutation that matters writes a `CampaignCombatEvent`. The combat log renders events. Phase 2 animations subscribe to the same events. Undo (Phase 3) reverts an event.
4. **Snapshots for state, events for changes.** Clients keep the `combatSnapshot` pattern for full state. Events are additive and do not replace snapshots.
5. **Per-viewer filtering on the server.** `loadCombatForViewer` and the event filter decide what a player sees. Never send exact NPC HP or GM effects to players.

## Code layout

```
src/lib/combat/
  types.ts                  existing views + new Effect, Defenses, Event, Outcome types
  rules/
    modifiers.ts            3.5e bonus type stacking, penalty stacking
    attack.ts               resolveAttack(attacker, target, line, faces, ctx) -> AttackOutcome
    critical.ts             threat range, confirmation, multiplier, crit-only dice
    damage.ts               DamagePacket, applyDefenses (DR, resist, immune, vuln), nonlethal, temp HP
    healing.ts              heal, temp HP, remove nonlethal
    saves.ts                resolveSave(target, type, dc, faces, ctx) -> SaveOutcome
    spellResistance.ts      resolveSr(casterLevel, faces, sr)
    concealment.ts          miss chance roll
    death.ts                hp state -> dying / dead / disabled / stable, massive damage
    initiative.ts           rollInitiative, ordering, tiebreak, delay/ready reorder
    turn.ts                 nextActor, effect ticking, regen/fast heal, ongoing damage
    engineContext.ts        build EngineContext from combatant + active effects
  effects/
    grammar.ts              tag list, bonus types, damage types, descriptors
    parseEffect.ts          "Bless; ATK: 1 morale; SAVE: 1 morale" -> EffectComponent[]
    formatEffect.ts         components -> canonical string (for display and dedupe)
    presets.ts              3.5e conditions -> effect strings (Prone, Stunned, ...)
    applyEffects.ts         collect components by tag for actor/target with filters
    duration.ts             decrement, expiry rules
  events/
    types.ts                CombatEventKind, payload per kind
    format.ts               event -> log line(s) for DM and for player (per-viewer)
    filter.ts               filterEventForViewer
  spells/                   (Phase 1)
    spellAction.ts          SpellActionSet interpreter -> resolutions
    dc.ts                   save DC from spell level + stat + effects
    scaling.ts              dice by CL with caps
  combatMutations.ts        existing + new mutations (start/end, init, delay, heal, effects, events)
  combatRolls.ts            startCombatRoll: faces + resolve + persist + publish
  loadCombat.ts             include effects and recent events
  combatView.ts             extend view with effects, nonlethal, bands, defenses summary
src/actions/
  combat.ts                 thin wrappers (auth) for mutations
  combatRolls.ts            Server Action entry for startCombatRoll
src/components/combat/
  campaign-combat-drawer.tsx      tracker (extend)
  combat-context.tsx              client API: rollAttack, rollDamage, rollSave, heal, addEffect, modifier stack
  combat-row-effects.tsx          effect chips + add effect input
  combat-log.tsx                  event list (rail panel)
  combat-modifier-stack.tsx       FG modifier box
  combat-roll-drop.tsx            drag payload helpers (result -> row)
src/components/map/
  map-token-status.tsx            (Phase 2) HP bar, effect icons
  map-combat-fx-layer.tsx         (Phase 2) animations
```

## Roll pipeline

Today: `useDice().roll(request, cb)` -> provider calls `startCampaignRoll` (server faces) -> dice-box animates -> `cb(result)` -> client code applies things.

New (combat rolls only):

```
client: combatCtx.rollAttack({ attackerId, attackLine, attackType, targetIds, modifiers })
  -> Server Action startCombatRoll(input)
       1. requireCombatActor + permission (04-permissions.md)
       2. load combat, attacker, targets, active effects
       3. faces = rollFaces(pool)
       4. outcome = rules.resolveAttack(...) per target
       5. persist CampaignRoll (existing shape) + CampaignCombatEvent[]
       6. apply state changes (targets, pending crit, damage, effects)
       7. publish: roll event (existing), combatEvent[], combatSnapshot
       8. return { roll, outcome }
  <- provider: dice-box lands on roll.faces, then shows outcome (log + row highlight)
```

Implementation detail: extract the persist/publish part of `startCampaignRoll` (`src/actions/campaigns.ts`) into `src/lib/campaign/rolls.ts` so `startCombatRoll` reuses it. `RollRequest` gains an optional `combat?: CombatRollIntent` that the dice provider passes through; when present the provider calls `startCombatRoll` instead of `startCampaignRoll`. The `RollResult` callback receives `result.combat = outcome`.

Every combat roll kind:

| Intent | Faces | Resolution | Writes |
|---|---|---|---|
| `initiative` | 1d20 per combatant | `init = face + initMod + initMod/100` | combatant.init, event `init` |
| `attack` | one d20 per attack in line (iterative) | vs each target AC by type, effects, nat 1/20, threat | event `attack` per target, `pendingCrit` on attacker, `pendingDamageTargets` (server side, on attacker row) |
| `confirm` | 1d20 | vs same AC, applies crit flag | event `critConfirm` |
| `damage` | dice from line or packet, multiplied if crit | `applyDefenses` per target, HP change, death state | events `damage`, maybe `death` |
| `save` | 1d20 per target | vs DC with effects | event `save` per target, optional half damage / effect apply |
| `sr` | 1d20 | CL + face vs SR | event `sr` |
| `heal` | dice | heal rules | event `heal` |
| `concealment` | d100 | miss chance | folded into `attack` event |
| `stabilize` | d100 | 10% | event `stabilize` |

Non-roll mutations (add effect, remove effect, next actor, set HP) call regular Server Actions and also write events.

## Engine context

`engineContext.ts` builds a flat `EngineContext` for a combatant from row fields, `snapshot`, `defenses`, and **active effects**, so the rules never read Prisma rows:

```ts
type EngineContext = {
  id: string; name: string; kind: "pc" | "npc";
  ac: { normal: number; touch: number; flat: number };
  saves: { fort: number; ref: number; will: number };
  attackMods: { melee: number; ranged: number; grapple: number };
  hp: { max: number; wounds: number; temp: number; nonlethal: number };
  defenses: Defenses;            // DR, resist, immune, vuln, sr, regen, fastHeal
  conditions: Set<ConditionKey>; // prone, flatFooted, stunned, helpless, invisible, ...
  effects: ParsedEffect[];       // for tag lookups with descriptors
  size: SizeKey; reachFeet: number;
  casterLevel?: number; abilityMods?: Record<Ability, number>;
};
```

`applyEffects.ts` exposes `sumTag(ctx, "ATK", { attackType: "melee", vsTarget })` and similar with 3.5e stacking from `modifiers.ts`.

## Live sync

Existing: `combatSnapshot` after every mutation. Keep it.

Add events (see `03-data-model.md`):

- `combatEvent` : one persisted `CampaignCombatEvent`, filtered per viewer. The log appends it. Phase 2 FX layer consumes it.
- `combatEffectUpsert` / `combatEffectRemove` : optional finer-grained updates; snapshot is enough for Phase 0.
- `combatRollRequest` (Phase 3) : DM asks a player to roll a save.

Redis fan-out already exists in `liveHub.ts`; do not add new transports.

## Client state

`liveStore.ts` mirrors `combat` from snapshots. Add `combatEvents: CombatEventView[]` (ring buffer, last 200) filled from the initial table payload and `combatEvent` messages. `combat-context.tsx` exposes the roll API and reads store state. Keep `pendingDamageTargets` but source it from the attacker row (`pendingTargets` on the server) so a page reload does not lose "who did I just hit".

## Modifier stack

FG's modifier box: the user types or clicks +2 / -2 and the next roll consumes it. Implement as client state in `combat-context.tsx` (`modifierStack: { value: number; label: string }[]`) that is sent with the next `startCombatRoll` intent and cleared after. The server logs it in the event payload (`adhocModifiers`). Shift+click on the tracker's +/- buttons keeps it sticky (FG behavior) until cleared.

## Dice-box faces

`startCombatRoll` returns `roll.faces` in the same order as the pool. Iterative attacks use `iterativeModifiers` and `attackTotals` exactly as today. Confirmation rolls are separate requests so the player sees the threat first, like FG.

## Concurrency

All combat mutations run inside a `prisma.$transaction` keyed by `combatId`. Two players rolling at the same second must not lose an HP update. Use `SELECT ... FOR UPDATE` on `CampaignCombat` (`prisma.$queryRaw`) or re-read inside the transaction before writing wounds.
