# 11. Phase 0B: Fantasy Grounds parity tracker UI

**Prompt:** Implement this file only, after `10-phase-0-engine.md` is merged. Read `README.md`, `02-architecture.md`, `04-permissions.md`, `05-effects-dsl.md`, `06-ui-ux.md`, and `07-automation-rules.md` first.

## Goal

The combat drawer looks and behaves like the Fantasy Grounds 3.5E combat tracker: toolbar with combat lifecycle actions, rows with init, wounds/temp/nonlethal, health band, effect chips with durations, expanded defense/offense/effects sections, an effect input with presets and autocomplete, a modifier stack, and drag or click resolution of attack, damage, heal and effect onto rows. The combat log becomes a first-class rail tab. All of it stays visually consistent with the existing table (`06-ui-ux.md`).

## User stories

1. As DM, the toolbar lets me Start, Roll init (all / NPCs / PCs), Next, Clear targets, and open a menu with Remove dead NPCs, Clear all effects, End, Reset.
2. As DM, each row shows init, `cur/max (+temp) NL n`, band, and chips like `Bless 9r`, `Prone`, `Dying`.
3. As DM, I expand a row: Defense (AC 15 / T 12 / FF 13, Fort +3 Ref +5 Will +1, DR 5/magic, Resist fire 10, SR 12), Offense (attack lines with M/R/T badges and typed damage, iterative bonuses shown as `+9/+4`), Effects (list with active toggle, visibility, duration edit, remove; add input).
4. As DM, I type `Sha` in the add-effect input and pick "Shaken" from the list; Enter applies to that row; Shift+Enter applies to the actor's targets.
5. As DM, I drag the scimitar attack button onto a PC row; it resolves against that PC only (drag targets override current targets for that roll). I drag damage onto another row; it applies there.
6. As DM, I set -2 on the modifier stack and the next attack shows "Ad hoc -2" in its tooltip; the pill clears afterwards unless sticky.
7. As a player, I see my own row fully, others as bands and visible effect labels, and the Combat log tab in the rail with per-viewer wording.
8. As DM, I delay a goblin and later click "Act now"; it acts and re-sorts.
9. As DM, I click a row's HP and use the inline editor: Damage 5, Heal 3, Temp 8, Nonlethal 2, Set 10.

## Implementation order

### 1. Drawer toolbar and lifecycle

- Top toolbar per `06-ui-ux.md`. Buttons call `startCombat`, `rollInitiativeFor`, `advanceCombatTurn`, `clearTargets`, and a small menu (`.combat-menu`, reuse any existing popover pattern in the table; if none, a simple absolutely positioned list with Escape to close).
- Subtitle: `Round 3 · Goblin 2` when active, `Idle` when not started, `Ended` after End.
- Footer: keep the wide Next actor button (DM only). Players see "Waiting for <name>" text.
- Keyboard: `N` next actor when the drawer is open and focus is not in an input.

### 2. Rows

- Restructure `CombatantRow` into `combat-row.tsx` with subcomponents: `combat-row-init.tsx` (number, click to edit for DM, Shift+click roll, arrow icon marks active actor; click the arrow to set active), `combat-row-hp.tsx` (cell + inline editor popover), `combat-row-effects.tsx` (chips + add input), `combat-row-detail.tsx` (Defense, Offense, Effects sections).
- Status strip under the name: chips for effects (`label Nr`, tooltip full string + source), `Delayed` / `Readied`, `Unplaced`, `Hidden` (eye-off icon, DM only), `Unidentified` (DM only).
- Faction click (DM) cycles friend / foe / neutral.
- Row context actions in the expanded footer: Remove, Toggle visible, Toggle identified, Delay, Ready, Act now (when delayed/readied), Stabilize check (when dying).
- Dead rows: `.combat-row--dead` (muted, strikethrough name), still expandable.

### 3. HP inline editor

- `.combat-hp-editor` popover with five actions each with a number input and a button: Damage (typed, default `untyped`; small select for type), Heal, Temp, Nonlethal, Set (DM only). Calls the Phase 0A mutations. Escape closes, Enter applies the focused action.
- Players see the editor only on their own row with Heal and Temp.

### 4. Effects UI

- `combat-row-effects.tsx`:
  - Chips render from `CombatEffectView`. Click a chip to open a tiny editor: duration, expiry, visibility, active toggle, remove. DM only, or owner for own non-system visible effects.
  - Add input: `.tool-input` with datalist-like dropdown built from `presets.ts` labels plus recently used strings in this campaign (client memory). Free text allowed. Duration field (number) and unit select next to it. Source defaults to the current actor.
  - Enter applies to the row; Shift+Enter applies to the current actor's targets; a "to targets" button does the same for mouse users.
  - Parse preview: as the user types, call `parseEffect` client-side (same pure module) and show the recognized components under the input as small tags (`ATK +1 morale`, `COND Shaken`), with warnings in muted text. The server re-parses; the preview is just feedback.
- Toolbar menu: Clear all effects (confirm dialog).

### 5. Offense section and resolution

- Attack lines from `attacks` (now present for PCs too). Each line: name, attack type badge (M, R, T, RT, G), bonus (iterative shown as `+9/+4`), damage with types, threat/multiplier (`19-20/x2`).
- Buttons: **Attack** (rolls all iteratives), **Damage** (uses `pendingCrit` if set and labels itself "Crit damage x2"), and, when a threat is pending, **Confirm**.
- Click resolves vs current targets (or pending targets for damage). No targets: roll and log "No target".
- **Drag:** attack, damage and heal buttons, plus each effect chip and the add-effect input's "drag handle", are `draggable` with `CombatDragPayload` in `dataTransfer`. Rows accept drops (`onDragOver` highlight `.combat-row--drop`). Drop calls the same intent with `targetIds = [rowId]`. Implement helpers in `combat-roll-drop.tsx`. Map tokens accept the same payload (wire the drop in `campaign-map-board.tsx` to `combatantByTokenId`).
- Grapple lines roll and log only.

### 6. Modifier stack

- `combat-modifier-stack.tsx` at the bottom of the drawer body. Pills `-4 -2 -1 | n | +1 +2 +4`, label input, clear. Shift+click sets sticky. State in `combat-context.tsx` (`modifierStack`, `stickyModifier`). Every roll intent includes `adhoc: { value, label }` and the context clears it after the roll unless sticky.
- Show a small accent badge on the drawer icon in the rail when the stack is non-zero so the user does not forget it (FG shows the box highlighted).

### 7. Combat log tab

- Rail: `Rolls | Combat` tabs where the roll log is. `combat-log.tsx` renders `CombatEventView.lines` with tones (`.combat-log-line--hit` etc.), round separators, and a sticky "Jump to latest" pill. Tooltip on a line lists `payload.modifiers` (DM) or nothing (player).
- Clicking a line highlights the actor and target rows for 900ms (`.combat-row--focus`).
- Initial content from `combatEvents` in the table payload; live from `combatEvent`.

### 8. Targeting polish

- Drawer: when the current actor is the viewer's PC or the viewer is DM, every other row shows a small crosshair toggle on hover to add or remove it as a target (no map required).
- Toolbar Clear targets: DM clears all; player clears own.
- Target chips stay as today under the actor row.

### 9. Styles

- All new classes in `theme.css` next to the existing `.combat-*` block. New tokens under `--combat-*` in `:root`. Row highlight keyframes for `--hit`, `--miss`, `--crit`, `--damaged`, `--healed`, `--drop`, `--focus`. Respect `prefers-reduced-motion` (no keyframes, keep the color).

## Acceptance

- [ ] Toolbar and menu perform every lifecycle action; players see none of the DM buttons.
- [ ] Rows show init, HP with temp and nonlethal, band, effect chips with remaining rounds; dead rows are muted.
- [ ] HP editor: Damage 5 fire on a `RESIST: 10 fire` row applies 0 and logs the adjustment; Heal removes nonlethal too; Temp takes the higher value.
- [ ] Add effect: preset picker inserts `Shaken`; free text `Bless; ATK: 1 morale` previews two components; Shift+Enter applies to all targets and logs one `effectApply` per target.
- [ ] Effect chip editor changes duration and visibility; player client stops seeing a chip switched to `gm`.
- [ ] Attack click with two targets logs two lines; dragging the same attack onto a third row logs one line for that row only and does not change current targets.
- [ ] Confirm button appears after a threat; damage button reads "Crit damage x2" and the log shows multiplied dice.
- [ ] Modifier stack -2 shows in the next roll tooltip and clears; sticky stays across rolls.
- [ ] Delay moves the row out of order; Act now re-inserts before the current actor.
- [ ] Combat tab shows the same events for DM and player with the correct wording differences; Jump to latest works after scrolling up.
- [ ] Keyboard: N advances, Escape closes editors, Enter applies effect.
- [ ] Visual check: spacing, fonts, button styles match the NPC drawer and roll log; no new hard-coded colors.
- [ ] Reload persists everything; the drawer reopens at the same state.

## Out of this phase

Spells and saves UI, AOE targeting, map bars and animations, player save prompts, undo, XP.

## Browser check

1. DM: build an encounter of 3 goblins vs 2 PCs, Start, Roll init all.
2. DM: expand goblin 1, drag the scimitar onto PC 1, confirm a threat if it happens, drag damage onto PC 1. Check row flash, HP, log.
3. DM: add `Prone` to goblin 2 via the picker, roll a PC's melee attack on it and confirm the +4 in the tooltip.
4. DM: set modifier -2 sticky, roll two attacks, confirm both tooltips show it, clear it.
5. DM: delay goblin 3, advance two turns, Act now.
6. Player: open the Combat tab, verify wording; add `Bless` to own row; try to add an effect to a goblin (control must not exist).
7. Both: reload and compare.
