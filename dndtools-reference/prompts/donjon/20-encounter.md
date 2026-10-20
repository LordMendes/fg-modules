# Encounter Generator

Read `00-shared.md` first. Implement only this tool. Treasure Generator is not required.

## Catalog

- key: `encounter-generator`
- label: Encounter Generator
- href: `/tools/encounter-generator`
- description: Pick a wilderness or planar encounter by level, climate, and terrain, then see its EL and XP.
- source: `DMG`

## Goal

Choosing a level and a locale returns one encounter: a short description, one or more monster groups with counts, the actual EL, and XP for a stated party. Changing the locale rerolls. Underground ignores climate. A plane other than the prime world ignores climate and terrain.

## Data

Use the `Monster` table through a server action. Fields already on the model: `name`, `slug`, `challengeRating`, `challengeRatingNum`, `creatureType`, `subtypes`, `size`, `environment`, `treasure`, `hitDice`.

Do not paste stat blocks into the page. Link the name to `/monsters/<slug>`.

Environment strings in the database are messy (`Plains`, `Undergrounds`, often null). Normalize in `src/lib/encounter-generator/environment.ts`:

- Climate: `cold`, `temperate`, `warm`, or `any`. Match if `environment` contains that word. Null environment matches any climate.
- Terrain: `aquatic`, `desert`, `forest`, `hill`, `marsh`, `mountain`, `plain`, `underground`. Map synonyms: plains to plain, undergrounds / dungeon / cave to underground, hills to hill, mountains to mountain, swamp / bog to marsh, sea / ocean / water to aquatic, woods to forest.
- Plane `prime`: climate and terrain apply.
- Plane `abyssal`: ignore climate and terrain. Prefer monsters whose environment, subtypes, or name mention abyss, tanar'ri, or demon. If fewer than 8 matches, fall back to `creatureType` outsider or subtypes containing Evil and Extraplanar.
- Plane `infernal`: same, with hell, baatezu, or devil.

## Input

```ts
type EncounterInput = {
  level: number; // 1-20, this is the target EL
  plane: "prime" | "abyssal" | "infernal";
  climate: "cold" | "temperate" | "warm";
  terrain: "aquatic" | "desert" | "forest" | "hill" | "marsh" | "mountain" | "plain" | "underground";
  partySize: number; // 1-12, default 4
  partyLevel: number; // 1-20, default equals level
};
```

## Selection

`generateEncounter(candidates, input, rng)` is pure. The server action loads a slim candidate list (slug, name, cr number, environment, subtypes, creatureType, treasure) and calls it.

1. Filter candidates with `challengeRatingNum` from `level - 4` through `level + 2`, and matching locale rules above. Drop nothing with a null CR.
2. If the pool has fewer than 5 monsters, widen the CR window by 2 and try again, once.
3. Pick a lead monster. Weight is higher when CR is closer to `level` (weight `5 - abs(cr - level)`, minimum 1) and when `environment` is non-null (weight times 2).
4. Choose a count so the group's EL is as close as possible to `level` without going more than 2 over it. Use `elForSameCrGroup` and `elOffsetForCount` from `src/lib/encounter/encounterNumbers.ts`. Count is 1, 2, 3, 4, 6, 8, or 12.
5. 25% of the time, if another monster in the pool has CR at least 2 under the lead, add a second group of that monster. Recompute the combined EL with `calculateEncounterEl`.
6. Actual EL is `calculateEncounterEl` of the groups. Show one decimal only when the helper already returns a fraction the UI knows (`formatEl`).

Description line: `2 x Goblin` or `1 x Wolf, 4 x Goblin`. That string is the heading.

## XP

Add `xpForPartyLevel(partyLevel, cr)` in `src/lib/encounter/xpTable.ts`. This is the DMG award for one creature when the party level is not equal to CR. The existing `xpForCR` stays the award for a party of 4 facing that CR (the diagonal).

Table, rows are party level 1 through 20, columns are CR 1 through 20. Use these rows (CR 1 through 20). Fractional CR uses the CR 1 cell divided by 8, 6, 4, 3, or 2 for CR 1/8, 1/6, 1/4, 1/3, 1/2.

- Level 1-3: 300, 600, 900, 1350, 1800, 2700, 3600, 5400, 7200, 10800, then 0 through CR 20.
- Level 4: 300, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, then 0.
- Level 5: 300, 500, 750, 1000, 1500, 2250, 3000, 4500, 6000, 9000, 12000, 18000, then 0.
- Level 6: 300, 450, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 21600, then 0.
- Level 7: 263, 350, 525, 700, 1050, 1400, 2100, 3150, 4200, 6300, 8400, 12600, 16800, 25200, then 0.
- Level 8: 200, 300, 400, 600, 800, 1200, 1600, 2400, 3600, 4800, 7200, 9600, 14400, 19200, 28800, then 0.
- Level 9: 0, 225, 338, 450, 675, 900, 1350, 1800, 2700, 4050, 5400, 8100, 10800, 16200, 21600, 32400, then 0.
- Level 10: 0, 0, 250, 375, 500, 750, 1000, 1500, 2000, 3000, 4500, 6000, 9000, 12000, 18000, 24000, 36000, then 0.
- Level 11: 0, 0, 0, 275, 413, 550, 825, 1100, 1650, 2200, 3300, 4950, 6600, 9900, 13200, 19800, 26400, 39600, then 0.
- Level 12: 0, 0, 0, 0, 300, 450, 600, 900, 1200, 1800, 2400, 3600, 5400, 7200, 10800, 14400, 21600, 28800, 43200, then 0.
- Level 13: 0, 0, 0, 0, 0, 325, 488, 650, 975, 1300, 1950, 2600, 3900, 5850, 7800, 11700, 15600, 23400, 31200, 46800.
- Level 14: 0, 0, 0, 0, 0, 0, 350, 525, 700, 1050, 1400, 2100, 2800, 4200, 6300, 8400, 12600, 16800, 25200, 33600.
- Level 15: 0, 0, 0, 0, 0, 0, 0, 375, 563, 750, 1125, 1500, 2250, 3000, 4500, 6750, 9000, 13500, 18000, 27000.
- Level 16: 0, 0, 0, 0, 0, 0, 0, 0, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 7200, 9600, 14400, 19200.
- Level 17: 0, 0, 0, 0, 0, 0, 0, 0, 0, 425, 638, 850, 1275, 1700, 2550, 3400, 5100, 7650, 10200, 15300.
- Level 18: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 450, 675, 900, 1350, 1800, 2700, 3600, 5400, 8100, 10800.
- Level 19: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 475, 713, 950, 1425, 1900, 2850, 3800, 5700, 8550.
- Level 20: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500, 750, 1000, 1500, 2000, 3000, 4500, 6000.

A 0 cell means the encounter is too weak or too strong to award XP. Show "0" and a short note: "No XP for this party level and CR."

Total XP is the sum of `count * xpForPartyLevel(partyLevel, cr)` across groups. XP per PC is `Math.floor(total / partySize)`.

Party size and party level do not change which monsters were picked. They only change XP. Do not reroll when those two fields change.

## UI

- Level 1-20, plane (Prime world, Abyssal plane, Infernal plane), climate, terrain.
- When plane is not prime, disable climate and terrain.
- When terrain is underground and plane is prime, disable climate.
- Button Select (`tool-btn-primary`). Changing level, plane, climate, or terrain also rerolls.
- Result heading is the description. Under it, each group: count, linked name, CR, size, type. If `treasure` is non-empty, show it as plain text.
- Readouts: Actual EL, Total XP, XP per PC.
- Party size and party level sit with the XP readouts.
- Empty pool: "No monsters in the compendium match this level and locale."
- Link "Open in Encounter Builder" is out of scope. Do not import the encounter builder draft store.

Class prefix: `.encounter-gen`.

Query string: `level`, `plane`, `climate`, `terrain`, `seed`.

## Tests

- Prime, underground, level 1 never reads climate (pass two climates and the same seed, get the same monsters). A unit test can call the filter directly.
- Abyssal plane ignores terrain.
- Group EL for a CR 1 monster with count 4 is the value `elForSameCrGroup(1, 4)` already returns.
- `xpForPartyLevel(1, 1)` is 300. `xpForPartyLevel(8, 1)` is 200. `xpForPartyLevel(5, 1/2)` is `Math.floor(300 / 2)`.
- Same seed and same candidates return the same slugs.

## Acceptance

- Page is on `/tools` and uses the shared shell.
- Select returns monsters that exist in the database, with working links.
- Tests and typecheck pass.

## Suggested commit

`feat(encounter): add random encounter generator`
