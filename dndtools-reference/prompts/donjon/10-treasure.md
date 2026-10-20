# Treasure Generator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `treasure-generator`
- label: Treasure Generator
- icon: use a gem-style icon character, same pattern as other `TOOLS` entries
- href: `/tools/treasure-generator`
- description: Roll Dungeon Master's Guide treasure by level: coins, gems, art, mundane gear, and magic items.
- source: `DMG`

## Goal

A DM enters one or more hoards and gets coins, valuables, and items from the 3.5 treasure tables. Same inputs always produce the same hoard when the seed matches.

## Data

Copy these files into `src/lib/treasure/data/` (the web app must not import from `modules/` at runtime):

- `modules/dmg-treasure/data/treasure_levels.json`
- `modules/dmg-treasure/data/gems.json`
- `modules/dmg-treasure/data/art_objects.json`
- `modules/dmg-treasure/data/mundane.json`
- `modules/dmg-treasure/data/mundane_weapons.json`
- `modules/dmg-treasure/data/mundane_armor.json`
- `modules/dmg-treasure/data/random_magic_categories.json`
- `modules/dmg-treasure/data/treasure_epic.json`
- everything under `modules/dmg-treasure/data/magic_items/`

Read two or three files before coding. Row actions are only `item`, `roll_again`, `roll_twice`, and `subtable`.

## Dice parser

Create `src/lib/dice/roll-expression.ts` and `roll-expression.test.ts`.

- Accept `1d6`, `2d8`, `1d4+1`, `2d6-1`, `1d6 × 1,000`, unicode `×` and ascii `x`, and a trailing coin or gp suffix (`cp`, `sp`, `gp`, `pp`).
- `rollExpression(expr, rng)` returns `{ count, unit, gp }`. Conversion: 100 cp = 10 sp = 1 gp = 0.1 pp.
- `averageExpression(expr)` returns the mean without rolling.
- Reject empty and non-dice text by throwing a typed error the generator catches and renders as the raw label.

## Input

```ts
type CoinMode = "none" | "tenth" | "half" | "standard" | "double" | "triple";
type GoodsMode = "none" | "half-chance" | "standard" | "double" | "triple";

type HoardRow = {
  count: number; // 1 to 20
  level: number; // 1 to 20
  coins: CoinMode;
  valuables: GoodsMode;
  items: GoodsMode;
};

type TreasureInput = {
  rows: HoardRow[];
  moreRandomCoins: boolean;
  salvagePercent: number; // 0, 10, 20, ... 100
  gems: boolean;
  art: boolean;
  magicTypes: {
    armor: boolean;
    weapon: boolean;
    potion: boolean;
    ring: boolean;
    rod: boolean;
    scroll: boolean;
    staff: boolean;
    wand: boolean;
    wondrous: boolean;
  };
  ranks: { minor: boolean; medium: boolean; major: boolean };
  maxGp: number | null;
  combine: boolean;
};
```

Default: one row, count 1, level 1, coins standard, valuables standard, items standard, gems and art on, all magic types and ranks on, salvage 0, more random off, combine off, max gp empty.

## Roll rules

Repeat each row `count` times. If `combine` is on, sum coins and concatenate goods and items into one hoard labeled "Combined hoard". Otherwise title them "Hoard 1", "Hoard 2", and so on.

Level selects `treasure_levels.json[level]`.

**Coins.** `none` skips. `standard` rolls once, `double` twice, `triple` three times. `tenth` and `half` roll once, then multiply the gp value by 0.1 or 0.5 and convert back into the largest coins that keep the value (pp, then gp, then sp, then cp). Each roll is d100 against `coin_range`. A miss yields no coins for that roll. A hit rolls the `coins` expression. If `moreRandomCoins` is on, multiply the rolled coin count by `0.5 + rng.next()` (range 0.5 to 1.5) and round to the nearest whole coin. Empty results show "No coins".

**Valuables.** `none` skips. `half-chance` rolls d100 and continues only on 51-100, then one goods roll. `standard` / `double` / `triple` are 1 / 2 / 3 goods rolls. Each goods roll is d100 on `goods_range`. If the cell says gems and gems are off, use art when art is on, otherwise skip. The reverse for art. A cell like `1d4 gems` rolls that many entries. Each entry rolls d100 on `gems.json` or `art_objects.json`, rolls the value expression, and picks one example name by splitting the examples on semicolons and commas. Show name, rolled value, and the table average as secondary text.

**Items.** Same attempt counts as valuables. Each hit rolls the `items` cell (`1 mundane`, `1 minor`, `1d3 medium`, and so on). Mundane rolls `mundane.json`, then the weapon or armor subtable when the row says so. Magic rolls `random_magic_categories.json` for that rank, then the matching file under `magic_items/`.

- `item`: use the label and price.
- `roll_again`: roll the same table once more and append both.
- `roll_twice`: roll the same table twice.
- `subtable`: roll the named table. Follow nested weapon and armor bonus tables until an `item` label remains. Include special-ability rows the JSON points at.

If the rolled rank or magic type is unchecked, reroll that item up to 20 times, then drop it. If `maxGp` is set, drop and reroll items whose parsed price is above it, up to 20 times. Scrolls that name a spell link to `/spells/<slug>` when the slug exists. Other items link to `/items/<slug>` when `name` or `label` matches an item name case-insensitively. No match stays plain text.

**Salvage.** After coins are totaled, convert `salvagePercent` of the gp value into mundane items. Buy the most expensive mundane row that fits, repeat until the budget is under the cheapest row or the budget is 0. List those rows as "Salvage" and reduce the coin pile by the gp spent.

**Epic.** Do not add a 21st level. `treasure_epic.json` stays unused in this tool.

## UI

Form:

- Seed (number) and Reroll seed (`tool-btn--ghost`).
- A table of hoard rows: count, level, coins, valuables, items, and a remove button (lucide `Trash2`). Add hoard adds a row copied from the last one. Cap 12 rows.
- Checkbox "More random coin amounts".
- Salvage select, 0% through 100% by 10. Label: "Trade coins for salvage".
- Checkboxes for gems, art, each magic type, and minor / medium / major.
- Optional "Maximum item value (gp)".
- Checkbox "Combine hoards into one".
- Generate (`tool-btn-primary`) and Clear.

Result, under the form:

- One card per hoard. Header is the title and the level.
- Lines: Coins, Total value in gp, then a list of gems, art, salvage, and items. Each item shows its price.
- Empty category is omitted, not "none", except coins which always show.
- Copy button copies plain text of the result.

Sync `seed` and the first row's level to the query string (`seed`, `level`) so a reload repeats the roll. Extra rows stay in component state.

Class prefix: `.treasure-gen`.

## Tests

`src/lib/treasure/generate.test.ts` and the dice parser tests.

- Seed 1, one level-1 standard hoard, is stable across two calls.
- `coins: "none"` yields zero coin gp.
- `coins: "tenth"` gp is about one tenth of `standard` across 200 seeds (mean within 25%).
- `valuables: "none"` yields no gems or art.
- Unchecking potions never returns a label that contains "potion" over 50 seeds at level 5 with only potions disabled and all ranks on.
- `maxGp: 100` never returns an item whose parsed price is over 100.
- `combine` with two rows returns one hoard whose coin gp equals the sum of the two separate hoards for the same seed.

## Acceptance

- `/tools/treasure-generator` is on the tools index and matches the Turn Undead page shell.
- Generate, Add hoard, Combine, and Copy work.
- Tests and typecheck pass.
- No em dash. No mention of an external generator.

## Suggested commit

`feat(treasure): add dmg treasure generator`
