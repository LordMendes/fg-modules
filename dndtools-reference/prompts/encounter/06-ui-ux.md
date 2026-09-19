# 06. UI and UX rules

The tracker must feel like part of the existing campaign table, not a bolted-on tool. These rules apply to every phase.

## Reuse, do not reinvent

- Drawers use `CampaignDrawerShell` (`src/components/combat/campaign-drawer-shell.tsx`) with `title`, `subtitle`, `icon`, `footer`. Do not create a new panel chrome.
- Buttons: `.tool-btn`, `.tool-btn--ghost`, `.tool-btn--danger`, `.tool-btn--active`, `.tool-btn-icon`. Rollable things use `.dice-rollable` so they get the existing hover cue.
- Inputs: `.tool-input`, `.tool-input-sm`. Selects: `.pc-sheet-select` style or a `.tool-select` added once in `theme.css`.
- Icons: `lucide-react` only, size 16 in rows, 18 in headers.
- Colors, radii, spacing and fonts come from CSS variables already in `theme.css`. New tokens go in the `:root` block with a `--combat-` prefix. No hard-coded hex in components.
- Health bands keep `.combat-hp-status--{status}`; add the new bands (`light`, `moderate`, `heavy`, `critical`) next to the existing ones.
- Dice go through `useDice()` / `DiceContext`. Never call dice-box or `Math.random` from combat UI.
- Toasts and errors use whatever the table already uses for action errors (check `campaign-table.tsx`). If nothing exists, add one small `.campaign-toast` and use it everywhere in the tracker.

## Density and layout (FG parity without FG clutter)

The tracker is a drawer on the right, same width as today. Keep the row grid: faction, token, name, init, HP, expand. Add:

- A **status strip** under the name: effect chips (label + rounds), death state, "Delayed" / "Readied" badge, unplaced badge. Chips wrap to a second line at most; beyond that show `+N`.
- **Init column** shows the number; the current actor gets a left accent bar and `aria-current="true"`.
- **HP cell** for DM/owner: `cur/max`, temp in parentheses, nonlethal as `NL 5` in muted color. Click opens the inline HP editor (damage, heal, temp, nonlethal, set). For players: band label.
- **Expanded row** (DM, or owner for own PC) has three compact sections in order: **Defense** (AC / touch / FF, saves, DR, resist, immune, SR), **Offense** (attack lines with attack type badge, damage with types, spells in Phase 1), **Effects** (list plus add input). Use a 2-column grid; do not render tables.
- **Toolbar** at the top of the drawer, single row, icon buttons with tooltips: Start/End, Roll init (menu: all, NPCs, PCs), Next actor, Clear targets, Menu (remove NPCs, clear effects, reset). Footer keeps the wide **Next actor** button so the most common action stays in the same place it is today.
- **Modifier stack** is a small pill group at the bottom-left of the drawer body: `-4 -2 -1 | value | +1 +2 +4`, a text field for a label, and a clear button. Shows in an accent color when non-zero. Shift+click any pill keeps it sticky (badge "sticky").

## Drag and click, both always

Fantasy Grounds resolves by dragging a result onto a CT entry. We support both:

- **Drag:** attack, damage, save-DC, heal and effect buttons are `draggable`. Rows and map tokens are drop targets. Drop payload is a JSON `CombatDragPayload` (`kind`, source ids, line). On drop the row briefly outlines in the accent color.
- **Click:** the same buttons resolve against the actor's current targets (or the pending targets for damage). If there are no targets, the click rolls and logs without applying, and the log line says "No target", like FG.

Never require drag for anything. Never require a modifier key for the primary flow.

## Feedback on every automation

- Every server-resolved roll shows: dice animation, a **row highlight** on each affected row (`.combat-row--hit`, `--miss`, `--crit`, `--damaged`, `--healed`, 900ms, CSS keyframes, no JS timers besides cleanup), and a **log line**.
- Log lines follow FG wording with brackets:
  - `[ATTACK (M)] Longsword +9 vs Goblin AC 15 -> 17 [HIT]`
  - `[ATTACK (R)] Longbow -> 3 [AUTOMATIC MISS]`
  - `[ATTACK (M)] Longsword -> 24 [CRITICAL THREAT]`, then `[CONFIRM] -> 18 [CRITICAL HIT]`
  - `[DAMAGE (M)] Longsword [TYPE: slashing, magic (1d8+4=9)] -> Goblin [DR 5 -> 4] Goblin: Heavy`
  - `[SAVE] Reflex DC 15 -> 12 [FAILURE]`, `[HALF]`
  - `[HEAL] Cure Light Wounds (1d8+3=8) -> Aria 15/18`
  - `[EFFECT] Bless; ATK: 1 morale -> Aria (10 rounds)`
  - `[EFFECT EXPIRED] Bless -> Aria`
  - `Round 3`, `Turn: Goblin 2`
- Tooltip on a log line shows the itemized modifiers (base, effects by name, ad hoc, conditions).
- Player wording replaces numbers with bands where `04-permissions.md` says so.
- Failures from the server (permission, validation) show as a toast with the server message, never a silent no-op.

## Log placement

The combat log lives in the left rail where the roll log is, as a second tab: **Rolls | Combat**. Same list styling as the roll log. The Combat tab auto-scrolls to bottom unless the user scrolled up (sticky "Jump to latest" pill). Rows in the log are clickable to highlight the involved tracker rows.

## Keyboard

- `N` next actor (DM), `T` toggle target mode on map, `Esc` clears pending drag, `Enter` in the add-effect input applies, `Shift+Enter` applies to all targets.
- All buttons reachable by Tab with visible focus (existing focus ring variables).

## Loading and optimism

- Use `useTransition` as today. Disable only the button being pressed, not the whole drawer.
- Do not optimistically change HP. Wait for the snapshot (WS round trip is under 200ms locally). Dice animation covers the latency.
- Roll buttons are disabled while `rolling` is true in the dice context (existing behavior).

## Copy

- Plain, short, no exclamation marks, no emojis, no em dashes.
- Titles in sentence case: "Add effect", "Roll initiative", "Next actor".
- Use 3.5e terms: wounds, nonlethal, flat-footed, touch AC, Fortitude, Reflex, Will.

## Map (Phase 2) consistency

- Token bars use the same band colors as `.combat-hp-status--*`.
- Effect icons on tokens are 12px lucide icons in a strip under the token, max 4 then `+N`; the mapping condition -> icon lives in `effects/presets.ts` so the tracker chip and token icon match.
- Animations are CSS or SVG transforms on the existing layers (`map-targeting-layer.tsx` geometry). Respect `prefers-reduced-motion` (skip motion, keep the floater text). Default duration 600 to 900ms, never blocks input.
