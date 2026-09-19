# 30. Combat hit/miss log and damage application

**Prompt:** Implement this file only. Update [`STATUS.md`](./STATUS.md) row F30 when done. Prefer completing [20-token-targeting.md](./20-token-targeting.md) first.

## Goal

Make combat attacks show clear hit/miss feedback in the logs and make weapon damage reliably change HP for PC to NPC and NPC to PC. The rules engine already computes hit/miss and applies damage; this fix is about **routing, targeting prerequisites, and UX** so users do not silently get local dice rolls with no combat events.

## Current behavior

### Hit/miss (already works when combat roll runs)

- `resolveAttack()` in `lib/combat/rules/attack.ts` sets `hit`, `autoHit`, `autoMiss`, `threat`.
- `formatAttack()` in `lib/combat/events/format.ts` appends `[HIT]`, `[MISS]`, `[AUTOMATIC HIT]`, `[AUTOMATIC MISS]`, `[CRITICAL THREAT]` with tone classes.
- `CombatLog` and row flash animations use these tones.

### Damage (already works when combat damage roll runs)

- `resolveDamageIntent()` in `combatRolls.ts` calls `applyCombatDamageInTx()` for each target.
- `applyDefenses()` handles DR, resist, immune, temp HP, wounds.
- PC targets sync HP back to PC plan via `syncPcPlanHpFromCombatant()`.

### Why it feels broken

| Symptom | Cause |
|---|---|
| No hit/miss in log | Attack never reached server: local dice fallback, or zero targets so no events written |
| Damage does not change HP | `rollDamage` fell back to local dice when `targetIds` and `pendingTargetIds` empty, or `attackIndexForWeapon` returned -1 |
| User looks at Rolls tab | `DiceLogTray` defaults to `"rolls"` tab; combat events only on `"combat"` tab |

### PC sheet fallback (`pc-weapon-attacks-list.tsx`)

```tsx
if (inCombat && combatCtx && combatant && attackIndex >= 0) {
  combatCtx.rollAttack({ ... targetIds: combatant.targetIds });
  return;
}
roll(iterativeD20Checks(...)); // local only, no combat log

if (inCombat && ... && targetIds.length > 0) {
  combatCtx.rollDamage({ ... });
  return;
}
roll({ kind: "damage", ... }); // local only, no HP change
```

### Weapon index mapping

- `attackIndexForWeapon()` matches by **name only** against `combatant.attacks`.
- `weaponRowsToCombatAttacks()` in `combatMutations.ts` builds attacks from inventory but does not store `inventoryIndex` on `CombatAttackLine`.
- Name mismatch => index -1 => local dice.

### Attack with no targets

- `resolveAttackIntent()` loops `intent.targetIds`. Empty list => zero events.
- `formatAttack()` supports `targetName ?? "No target"` but that path may not run without a target loop entry.

### Two-step workflow

- Attack sets `pendingTargetIds` on hit. Damage is a separate button click (FG-style). Do not change this unless explicitly adding an optional auto-prompt (out of scope).

## Desired behavior

### User stories

1. As DM, I target an NPC at a PC, click Attack in the tracker, and the Combat log shows `[HIT]` or `[MISS]` with the roll total.
2. As DM, I click Damage after a hit and the PC's wounds decrease; the log shows damage math.
3. As a player, I attack from my sheet with a target selected and see hit/miss in the Combat log, then apply damage on hit.
4. As anyone, if I try to attack or damage in combat without valid routing, I see a clear message instead of a silent local roll.
5. As anyone, after a combat roll completes, the dice log tray switches to (or highlights) the Combat tab so hit/miss is visible without manual tab hunting.

### Concrete requirements

1. **No silent local fallback in combat.** When `inCombat && combatCtx && combatant`, Attack and Damage must call `combatCtx.rollAttack` / `rollDamage` or show an inline error/toast. Never call bare `roll()` for weapon attacks in that state.
2. **Attack with no targets** still writes a combat event: actor, attack name, "No target", no hit resolution. Use existing format patterns.
3. **Damage with no targets:** show UI error ("Select a target first" or server message). Do not roll local damage.
4. **Stable attack index:** add optional `inventoryIndex` (or stable id) to `CombatAttackLine` when syncing PC weapons. Match `attackIndexForWeapon` by index first, name second. Update `weaponRowsToCombatAttacks()` accordingly.
5. **Combat tab visibility:** after `startCombatRoll` resolves in `dice-provider.tsx` or `combat-context.tsx`, dispatch an event or call a callback so `DiceLogTray` switches to `"combat"` tab and expands if collapsed. Prefer a small custom event or context flag over tight coupling.
6. **NPC to PC and PC to NPC:** verify both directions in integration test with real mutation path (can use test DB or mocked prisma pattern used elsewhere).
7. **Do not auto-apply weapon damage on hit.** Keep separate Damage click.

## MUST

- Extend `CombatAttackLine` type if adding `inventoryIndex`.
- Update PC sync path (`weaponRowsToCombatAttacks`, add/update combatant from PC plan) to populate the index.
- Update `pc-weapon-attacks-list.tsx` and `combat-row-detail.tsx` attack/damage handlers consistently.
- Add tests:
  - `events/format.test.ts`: attack lines include `[HIT]` and `[MISS]`.
  - Integration-style test for attack then damage HP change (PC to NPC and NPC to PC), registered in `package.json`.
- Keep server-authoritative resolution. Client only routes intents.

## MUST NOT

- Auto-apply damage on successful attack hit (weapon flow).
- Change spell cast auto-damage behavior (`resolveCastIntent`).
- Remove the two-step attack then damage workflow.
- Use em dash in user-facing strings.

## Implementation order

### 1. Attack line identity (`CombatAttackLine`, `combatMutations.ts`)

- Add `inventoryIndex?: number` to combat attack line type.
- Set it in `weaponRowsToCombatAttacks()` from `row.inventoryIndex`.

### 2. Weapon index lookup (`pc-weapon-attacks-list.tsx`)

- Update `attackIndexForWeapon()`:
  1. Find attack where `inventoryIndex === weapon.inventoryIndex`.
  2. Fallback: match by `name`.
  3. Return -1 only if both fail.

### 3. Remove silent fallback (`pc-weapon-attacks-list.tsx`)

- `rollAttack`: if in combat but index < 0, show error state on the row or toast; do not local roll.
- `rollDamage`: if in combat but no targets and no pending, show error; do not local roll.
- Same pattern in `combat-row-detail.tsx` if it has similar fallback (audit and align).

### 4. Attack with no targets (`combatRolls.ts`)

- In `resolveAttackIntent()`, if `intent.targetIds` is empty after resolution:
  - Write one combat event with kind `attack`, payload indicating no target, or reuse attack format with `targetName: null` and appropriate neutral/miss tone.
  - Do not throw unless you prefer client-side prevention only (prefer server event for log consistency).

### 5. Combat log tab auto-switch

- Option A: `combat-context.tsx` exposes `onCombatRollComplete` callback consumed by `DiceLogTray`.
- Option B: `window.dispatchEvent(new CustomEvent("combat-roll-complete"))` listened to by tray.
- Set tab to `"combat"`, optionally expand tray.

### 6. Error surfacing

- When server returns `"No damage targets"`, show in combat UI (toast or inline on weapon row).
- When attack index missing, message: "Weapon not synced to combat. Re-add to combat or refresh."

### 7. Tests

- Format tests for hit/miss lines.
- Integration test file, e.g. `combat-hit-damage-flow.test.ts`:
  - Setup combat with PC combatant and NPC combatant.
  - Set targets, resolve attack with mocked faces for hit.
  - Resolve damage, assert wounds changed on target.
  - Repeat NPC attacker to PC target.

## Browser checks

1. Start combat. Place tokens. Target NPC at PC (use prompt 20 Ctrl+click or tracker crosshair).
2. Expand NPC row, click Attack: Combat tab shows line with `[HIT]` or `[MISS]`. Dice tray on Combat tab.
3. On hit, click Damage: PC HP drops in tracker and sheet; log shows damage.
4. Reverse: PC sheet or tracker, PC attacks NPC, damage applies to NPC wounds.
5. Attack with no targets: log shows "No target" (or clear error before roll). No silent Rolls-only d20.
6. Damage with no targets: error message, HP unchanged.

## Done when

- [ ] Combat weapon attacks never silently fall back to local dice when in combat.
- [ ] Hit/miss visible on Combat log tab after attack without manual tab switch.
- [ ] Damage changes HP PC to NPC and NPC to PC when targets are set.
- [ ] Attack index matches by inventory index, not name only.
- [ ] Attack with no targets produces a combat log entry or blocking UI error.
- [ ] New tests pass and are registered in `package.json`.
- [ ] Browser checks pass.
- [ ] STATUS.md F30 marked `done`.
