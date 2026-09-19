# 20. Selected-token targeting (Ctrl+click)

**Prompt:** Implement this file only. Update [`STATUS.md`](./STATUS.md) row F20 when done.

## Goal

When token A is selected on the map and the user Ctrl/Cmd+clicks token B, **token A's combatant** should toggle B as a target. Today Ctrl+click always targets from the **current turn actor**, ignoring selection.

## Current behavior

### Map board (`campaign-map-board.tsx`)

- `selectedTokenId` is local React state. Plain click sets it.
- Ctrl/Cmd+click in select mode calls `onToggleCombatTarget(target.id)` where `target` is the clicked token's combatant. Selection is ignored.

```tsx
if ((e.ctrlKey || e.metaKey) && onToggleCombatTarget) {
  const target = combatantForToken(token.id);
  if (target) {
    onToggleCombatTarget(target.id);
    return;
  }
}
```

### Server (`phase3Mutations.ts` `toggleCombatTargetPhase3`)

- **DM:** attacker is always `combat.currentCombatantId`. If none, returns `"No active turn"`.
- **Player:** attacker is their owned PC combatant.
- Updates `targetIds` on the attacker row and writes `target` / `untarget` combat events.

### Target arrows (`map-targeting-layer.tsx`)

- Draws from `combat.currentCombatantId` to each entry in that actor's `targetIds`.
- Does not reflect a selected token as the source.

### Target tool mode

- Toolbar crosshair (`tool === "target"`) toggles target for **current actor**, same as above.

## Desired behavior

### User stories

1. As DM, I select a goblin token, Ctrl+click a PC token, and the goblin now targets that PC (toggle off on second Ctrl+click).
2. As DM, I can set targets for any combatant via selection, not only whoever's turn it is.
3. As a player, I select my PC token and Ctrl+click an enemy to toggle targeting from **my PC only** (same permission as today).
4. As anyone, plain click still selects a token without changing targets.
5. As anyone, target arrows on the map show from the combatant that owns the targets being viewed. When a token is selected, show arrows from **that token's combatant** if it has targets; otherwise fall back to current turn actor for DM.

### Rules

| Actor | Ctrl+click attacker source |
|---|---|
| DM, token A selected, A has combatant | A's combatant |
| DM, no token selected | Current turn combatant (keep today) |
| Player, own PC token selected | Own PC combatant |
| Player, no selection or other token selected | Own PC combatant (keep today) |
| Target tool mode | Prefer selected token's combatant if selected; else current turn |

Tokens with no linked combatant: no-op. Optional: brief muted toast "No combatant for this token". Do not throw.

## MUST

- Extend server mutation to accept an optional `attackerId` (combatant id) when the caller is allowed to set that combatant's targets.
- **DM:** may pass any living combatant id as attacker.
- **Player:** may only pass their own PC combatant id; ignore or reject others.
- Keep existing `combatToggleTarget(campaignId, targetId)` working for combat tracker crosshairs (still uses current actor / owned PC when no attacker specified).
- Update `MapTargetingLayer` actor prop: when a token is selected and has a combatant, use that combatant as arrow source; else current turn for DM.
- Wire `campaign-table.tsx` callback to pass optional attacker from board state.
- Publish combat snapshot / events after toggle so tracker and map stay in sync.
- Add unit test for permission check on `attackerId` (DM any, player own only).

## MUST NOT

- Change how `pendingTargetIds` or attack resolution works (that is prompt 30).
- Allow players to set targets for NPCs or other PCs.
- Require target tool mode for Ctrl+click targeting.
- Use em dash in user-facing copy.

## Implementation order

### 1. Server mutation (`phase3Mutations.ts`)

- Change signature to accept optional `attackerId?: string`.
- Resolve attacker:
  - If `attackerId` provided: load that combatant, verify permissions, use it.
  - Else: existing logic (current turn for DM, owned PC for player).
- Remove or relax DM `"No active turn"` error when `attackerId` is provided and valid.

### 2. Server action (`actions/combat.ts`)

- Update `combatToggleTarget` to accept optional `attackerId`.
- Pass through to mutation.

### 3. Combat context (`combat-context.tsx`)

- Extend `toggleTarget(targetId, attackerId?)` if context wraps the action.

### 4. Map board (`campaign-map-board.tsx`)

- In Ctrl+click handler:
  - Resolve `attackerCombatant` from `selectedTokenId` via `combatantForToken(selectedTokenId)`.
  - If attacker exists, call `onToggleCombatTarget(target.id, attackerCombatant.id)`.
  - Else fall back to existing behavior (no attacker id).
- In target tool mode: same preference for selected token's combatant.
- Update `MapTargetingLayer` `actor` prop logic as described above.

### 5. Table wiring (`campaign-table.tsx`)

- Update `onToggleCombatTarget` prop type and handler to forward optional attacker id.

### 6. Combat tracker (optional consistency)

- No change required for row crosshairs unless you want them to respect map selection (out of scope unless trivial).

## Tests

Add `phase3Mutations.test.ts` or extend existing combat mutation tests:

| Case | Expected |
|---|---|
| DM + attackerId = goblin, target = pc | goblin's targetIds updated |
| DM + no attackerId + no current turn | error (or unchanged behavior) |
| Player + attackerId = own PC | success |
| Player + attackerId = NPC | rejected |

Register the test file in `web/package.json`.

## Browser checks

1. Start combat with at least one NPC and one PC on the map with linked tokens.
2. Select NPC token A. Ctrl+click PC token B. Tracker shows A targeting B. Map arrows from A to B.
3. Ctrl+click B again. Target removed.
4. Without selection, Ctrl+click as DM during someone's turn: targets from current actor (legacy behavior).
5. As player, select own token, Ctrl+click enemy: works. Cannot target from NPC selection.
6. Click token with no combatant + Ctrl+click: no crash.

## Done when

- [ ] Ctrl+click with selected token A targets from A's combatant, not only current turn.
- [ ] DM can target from any selected combatant token.
- [ ] Player can only target from own PC.
- [ ] Map targeting arrows reflect selected token's combatant when applicable.
- [ ] Combat tracker target chips update live.
- [ ] Unit test for attacker permission passes.
- [ ] Browser checks pass.
- [ ] STATUS.md F20 marked `done`.
