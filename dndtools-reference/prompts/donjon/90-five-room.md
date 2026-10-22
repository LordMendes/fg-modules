# Five Room Dungeon

Read `00-shared.md` first. Implement only this tool. If Treasure Generator or Encounter Generator libs exist, call them. If they do not, use the fallbacks in this file. Do not implement those tools here.

## Catalog

- key: `five-room-dungeon`
- label: Five Room Dungeon
- href: `/tools/five-room-dungeon`
- description: Build a five-room dungeon: entrance, puzzle, setback, climax, and reward.
- source: `Site tables`

## Goal

One dungeon with a name, a motif, and five keyed rooms. Each room has a purpose, a challenge, and an outcome. The structure is fixed. The sentences are original.

## Rooms

Always these five, in order:

1. Entrance and guardian. A reason the door is dangerous, a creature or hazard, a way past that is not only "kill them".
2. Puzzle or roleplay. A problem that talking or thinking can solve. Include a wrong answer that costs something.
3. Setback. A trick, reversal, or loss. The party cannot simply rest through it.
4. Climax. The motif's main foe or threat, plus a battlefield detail.
5. Reward and revelation. Treasure plus a fact that reframes room 1 or 3.

## Motif

Select: None, Abandoned, Aberrant, Giant, Undead, Vermin, Aquatic, Desert, Underdark, Arcane, Fire, Cold, Abyssal, Infernal.

The motif picks the noun lists for guardians, puzzles, setbacks, and climax foes. None uses a mixed list. Write at least 8 options in each list per motif in `src/lib/five-room/tables.ts`. Short phrases, original.

Dungeon name: click the name to reroll it. Use `src/lib/names` dungeon catalog if that module exists. Otherwise a local list of 40 two-word dungeon names.

## Level and links

Optional dungeon level 1-20, default 1. Party size default 4.

- Room 1 and room 4 each name a monster. If `generateEncounter` from `src/lib/encounter-generator` can be imported without a database (the pure function), the page's server action passes a candidate slice and uses the result. If the import is impossible, the room uses a motif noun and the text "Choose a CR {level} creature."
- Room 5 names a treasure. If `generateTreasure` exists, call it with one hoard at this level, coins standard, valuables standard, items standard, and summarize the first three entries. If it does not exist, say "Roll treasure for level {level}."

Do not fetch the whole monster table on the client.

## UI

- Name (button to reroll), motif select, level, party size, seed, Generate.
- Five sections. Each section heading is the room role. Body is two or three sentences. A Reroll room button rerolls only that room (`seed + roomIndex`).
- Class prefix: `.five-room`.
- Query: `motif`, `level`, `seed`.

## Tests

- Result always has 5 rooms in the fixed order of roles.
- Motif `undead` never pulls a string that the test marks as belonging only to `fire`. Tag each phrase with its motif in the data so this is a real assertion.
- Same seed returns the same five bodies.
- Rerolling room 3 does not change room 1 for the same base seed. Test the pure function with `seed + 3` versus `seed + 1`.

## Acceptance

- Page on `/tools` with five visible rooms.
- Tests and typecheck pass.

## Suggested commit

`feat(five-room): add five room dungeon generator`
