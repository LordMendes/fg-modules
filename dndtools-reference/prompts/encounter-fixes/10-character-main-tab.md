# 10. Character Main tab layout

**Prompt:** Implement this file only. Update [`STATUS.md`](./STATUS.md) row F10 when done.

## Goal

Rework the PC character sheet **Main** tab so it uses horizontal space better in the campaign floating window and standalone planner. The tab should feel less cramped without changing sheet data, other tabs, or combat behavior.

## Current behavior

Main tab lives in `dndtools-reference/web/src/components/tools/pc-sheet.tsx` (`sheetTab === "main"`).

Problems today:

1. **Single vertical column.** Header, classes, senses, physical details, and ability scores all stack in one scroll.
2. **Narrow campaign window.** `.campaign-pc-window` in `theme.css` caps at ~42rem width and 78dvh height.
3. **Header wastes width.** `.pc-main-header > .pc-main-meta` uses `flex: 1 1 100%`, forcing race and alignment onto their own full-width row below the name.
4. **Cramped abilities.** `.npc-sheet-abilities` is a 3-column grid; each `.pc-ability-row` has five sub-columns (Score, Dmg, Drain, Mod) that barely fit at 42rem.
5. **Missing CSS.** `.pc-physical-grid` is used in `pc-identity-extra.tsx` but has no styles in `theme.css`, so physical detail fields likely stack awkwardly.
6. **Redundant level display.** Level appears in the identity line, classes header badge, and elsewhere.

Relevant CSS blocks: `.pc-sheet-page`, `.pc-main-header`, `.npc-sheet-abilities`, `.pc-ability-row`, `.campaign-pc-window`.

## Desired behavior

### User stories

1. As a player, opening my character sheet on the campaign table shows identity and abilities without excessive scrolling at default window size.
2. As a DM, the same layout works in the standalone PC planner (`pc-planner.tsx`).
3. As anyone on a narrow viewport, the layout collapses to a single column without broken overflow.

### Layout spec

At campaign window width (>= ~640px inner content):

```
+------------------------------------------+
|  [profile] [token]   STR  INT  CHA        |
|  Name                DEX  WIS            |
|  identity line       CON                 |
|  Race / Alignment                        |
|  Classes (compact list)                  |
+------------------------------------------+
|  Senses / languages  |  Physical details |
|  (compact block)     |  (pc-physical-grid)|
+------------------------------------------+
|  Alias shortcut (collapsed details)      |
+------------------------------------------+
```

Concrete rules:

- **Two-column top zone:** left = images, name, identity line, race, alignment, classes. Right = ability scores in a 2x3 or 3x2 grid that fits the column (prefer 2 columns x 3 rows in the right column).
- **Bottom zone:** senses/languages and physical details side by side in a responsive grid, not a third full-width stack.
- **Widen default window:** change `.campaign-pc-window` width from `min(42rem, ...)` to about `min(52rem, ...)` and adjust `left` offset if needed so it still clears the rail. Window remains resizable via existing resize handle.
- **Standalone planner:** `.pc-sheet-page` may use the same two-column Main layout; `max-width: 48rem` can increase slightly (e.g. 56rem) if needed for the grid.
- **Collapse:** below ~640px content width, revert to single column (abilities below header, details stack).
- **Remove duplicate level badge** from the classes block header if level is already in the identity line (keep one canonical level display in the header zone).
- **Do not move** divine/arcane options, alias, or tab structure. Keep all existing inputs and patch handlers.

## MUST

- Touch only Main tab markup in `pc-sheet.tsx` and related CSS in `theme.css`. Adjust `.campaign-pc-window` width in `theme.css` or `campaign-pc-window.tsx` if needed.
- Add `.pc-physical-grid` styles (2-column form grid on wide, 1 column on narrow).
- Preserve read-only mode (`readOnly` prop): no new editable affordances.
- Use existing classes (`.npc-sheet-block`, `.pc-sheet-input`, `.tool-input`) for visual consistency.
- Verify in browser: campaign table with an open PC sheet **and** standalone `/tools/pc-planner` if available.

## MUST NOT

- Change Combat, Status, Skills, Abilities, Inventory, Notes, or Actions tabs.
- Change `PcPlanState` schema or save/load logic.
- Add new dependencies.
- Use em dash in any user-facing string.

## Implementation order

### 1. Markup structure (`pc-sheet.tsx`)

- Wrap Main tab content in a container, e.g. `.pc-main-layout`.
- Split into `.pc-main-layout-top` (two columns) and `.pc-main-layout-bottom` (senses + physical).
- Move ability scores block into the right column of the top zone.
- Keep classes in the left column below race/alignment.
- Remove or consolidate redundant level badge in classes header.

### 2. CSS (`theme.css`)

- Add `.pc-main-layout`, `.pc-main-layout-top`, `.pc-main-col-left`, `.pc-main-col-right`, `.pc-main-layout-bottom`.
- Use CSS grid or flex with `gap` consistent with `.pc-sheet-section` (0.75rem).
- Add `.pc-physical-grid`: `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 0.75rem;` with a `@media (max-width: 640px)` single column fallback.
- Relax `.pc-main-header > .pc-main-meta` full-width rule so race/alignment sit beside name on wide layouts.
- Simplify `.pc-ability-row` grid inside the narrower right column (consider hiding Dmg/Drain labels on very narrow ability cells, or stack mod/drain under score).
- Update `.campaign-pc-window` width to ~52rem default.
- Add `@media` breakpoint for single-column collapse.

### 3. Campaign window default size

- If `campaign-pc-window.tsx` stores default size in localStorage keys, consider bumping default width in the initial size fallback so first-time users get the wider layout. Do not break existing saved sizes.

## Tests

No new unit tests required unless you extract layout helpers. Manual browser verification is the acceptance gate.

## Browser checks

1. Open campaign table as DM, open a PC sheet, Main tab: two columns visible at default window width, no horizontal scroll on abilities.
2. Resize window narrow: layout collapses cleanly.
3. Resize window wider: layout uses space, abilities readable.
4. Read-only sheet (if testable): same layout, inputs disabled.
5. Standalone PC planner Main tab: same structure, no regression on other tabs.

## Done when

- [ ] Main tab uses two-column top layout (identity left, abilities right) at default campaign window width.
- [ ] Senses and physical details share a compact bottom row on wide layouts.
- [ ] `.pc-physical-grid` has working CSS.
- [ ] Campaign PC window default width is ~52rem (resizable unchanged).
- [ ] Single-column fallback works below ~640px.
- [ ] No changes to other tabs or data model.
- [ ] Browser checks above pass.
- [ ] STATUS.md F10 marked `done`.
