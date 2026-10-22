# Dungeon Generator

Read `00-shared.md` first. Implement only this tool. Stocking may call the pure functions from Encounter Generator and Treasure Generator when those modules exist. If they do not, stock with the fallback text in this file.

## Catalog

- key: `dungeon-generator`
- label: Dungeon Generator
- href: `/tools/dungeon-generator`
- description: Generate a keyed dungeon map with rooms, corridors, doors, stairs, and level-appropriate contents.
- source: `DMG`

## Goal

A seeded map plus a room key. The map is an SVG drawn with theme colors, not a downloaded image from elsewhere. The same seed and options rebuild the same rooms.

Do not add a campaign-map writer in this pass. Export a pure `DungeonDraft` the UI renders. A later change can turn that draft into map walls.

## Parameters

```ts
type DungeonInput = {
  name: string;
  level: number; // 1-20
  partySize: number; // 1-12, default 4
  motif: "" | "abandoned" | "aberrant" | "giant" | "undead" | "vermin" | "aquatic" | "desert" | "underdark" | "arcane" | "fire" | "cold" | "abyssal" | "infernal";
  size: "fine" | "diminutive" | "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal" | "custom";
  cols: number; // used when custom, 20-120
  rows: number;
  layout: "square" | "rectangle" | "box" | "cross" | "dagger" | "saltire" | "keep" | "hexagon" | "round" | "cavernous";
  egress: "none" | "yes" | "many" | "tiling";
  roomLayout: "sparse" | "scattered" | "dense" | "symmetric";
  roomSize: "small" | "medium" | "large" | "huge" | "gargantuan" | "colossal";
  polymorph: "none" | "yes" | "many";
  doors: "none" | "basic" | "secure" | "standard" | "deathtrap";
  corridors: "labyrinth" | "errant" | "straight";
  deadends: "none" | "some" | "all";
  stairs: "none" | "yes" | "many";
  grid: "none" | "square" | "hex" | "verthex";
};
```

Defaults match a first visit: level 1, party 4, motif none, size medium, layout rectangle, egress none, rooms scattered, room size medium, polymorph yes, doors standard, corridors errant, deadends some, stairs yes, grid square.

Cell counts when size is not custom:

| Size | Cols | Rows |
|---|---|---|
| Fine | 20 | 24 |
| Diminutive | 28 | 34 |
| Tiny | 36 | 44 |
| Small | 44 | 54 |
| Medium | 51 | 65 |
| Large | 64 | 80 |
| Huge | 78 | 96 |
| Gargantuan | 92 | 114 |
| Colossal | 110 | 136 |

## Map algorithm

Work in `src/lib/dungeon/generate.ts`. Cells are `floor | wall | door | stairs-up | stairs-down`. Rooms are rectangles of cells, plus an optional list of extra floor cells when polymorph bites.

1. Build a mask of cells where floors are allowed.
   - square: inset the grid so width equals height, centered.
   - rectangle: the full grid inset by 1.
   - box: a hollow rectangle, band width about 18% of the short side, at least 4 cells.
   - cross: full-height vertical bar and full-width horizontal bar, each about 30% of the side.
   - dagger: cross plus one diagonal bar, 3 cells wide.
   - saltire: two diagonal bars.
   - keep: a rectangle with a rectangular courtyard cut from the center.
   - hexagon: cells whose hex distance from center is inside the short radius. On a square grid, use `dx + dy + abs(dx - dy)` or a simple `abs(dx) + abs(dy) <= radius`.
   - round: circle.
   - cavernous: ignore room rectangles. Random-walk about `maskArea * 0.35` floor cells inside a round mask, then fill any floor cell with 5 or more floored neighbors. Skip steps 2 and 3.
2. Room count from layout: sparse `area/400`, scattered `area/250`, dense `area/140`, symmetric same as scattered but rooms are placed in mirrored pairs across the vertical center. Minimum 4 rooms, maximum 80. Area is the number of mask cells.
3. Room size in cells (width and height rolled separately between min and max): small 2-3, medium 3-5, large 4-7, huge 5-9, gargantuan 6-11, colossal 8-14.
4. Place rooms in random mask order. Reject overlaps and rooms that leave the mask. Try 40 times per room. Symmetric layout places the mirror too, or skips that room if the mirror does not fit.
5. Polymorph `yes`: 25% of rooms add a second rectangle sharing an edge. `many`: 50%.
6. Corridors connect room centers with a minimum spanning tree on room-center distance, then add extra edges: labyrinth adds 0, errant adds `rooms * 0.35`, straight adds `rooms * 0.15` but only between rooms whose centers share a row or column within 2 cells. Carve a 1-cell corridor. Straight corridors may only bend once. Errant and labyrinth may bend at each step toward the target with a 20% sideways jitter.
7. Doors: where a corridor cell touches a room cell, place a door. `none` leaves the opening as floor. `basic` is an open passage (still tagged door, kind open). `secure` locks half of them. `standard` is a closed door, and 10% are secret. `deathtrap` is standard plus 20% trapped.
8. Deadends: a corridor cell with only one corridor or door neighbor. `some` deletes about half of those stubs. `all` deletes every stub that is not the only path to a room. Never orphan a room.
9. Stairs: `yes` places one up in the first room and one down in the last room. `many` also places a stair pair in a middle room. `none` places no stairs. Egress `yes` adds one door on the mask edge connected to the nearest room. `many` adds three. `tiling` adds one egress centered on each of the four sides, so maps can sit next to each other. Egress openings are doors on the border cell.
10. Number rooms in reading order (row, then column of the room's top-left).

## Stocking

For each room, in order, using `seed + roomNumber`:

- 40% monster, 20% trap, 15% treasure, 15% empty feature, 10% empty. Room 1 is always a monster or a trap. The last room is always treasure or a climax monster (50/50).
- Monster: call encounter pure function at this dungeon level if it is importable without Prisma. Otherwise write "CR {level} creature appropriate to {motif}."
- Trap: use `rollTrap(level, rng)` from `src/lib/random-tables/traps.ts` if that file exists. Otherwise a one-line trap: "Search DC {15+level}, Disable Device DC {15+level}, {1d6+level} damage."
- Treasure: call treasure generate for one standard hoard of this level if importable. Otherwise "Treasure for level {level}."
- Feature: one original sentence from a list of 20 (pool, mural, collapse, shrine, and so on), biased by motif when the five-room tables exist. A missing module must not break the build. Duplicate a short local list.

Dungeon name: if empty, roll one from `src/lib/names` or from a 40-name local list.

## UI

- Left column on wide screens, stacked on narrow: the form. Use a CSS grid that is one column under 800px. This is still the tools page, not a new app chrome.
- Fields for every parameter above. Custom size shows cols and rows. Cavernous disables room layout, room size, polymorph, and corridor style.
- Seed, Randomize (rerolls seed and every select except name and level), Generate.
- Result: dungeon name as `h2`, SVG, then the key. SVG cells are small rectangles (or hex polygons when grid is hex or verthex). Floors use the card background variable, walls the page background, doors the accent, stairs a second accent if one exists, otherwise a dashed accent stroke. Grid `none` hides the stroke.
- Key: "Room 3. Monster. ..." Secret doors say secret. Locked doors say locked.
- Buttons: Copy key (plain text), Download SVG.
- Class prefix: `.dungeon-gen`.

## Tests

- Medium rectangle, seed 1, produces at least 4 rooms, all inside the mask.
- Every room is reachable from room 1 through doors and floors. BFS in the test.
- `deadends: "all"` leaves no corridor cell with a single neighbor, except cells that are the only connection. Allow the test to ignore egress.
- Cavernous still returns at least one floor region and does not throw.
- Two calls with the same input return the same room count and the same top-left coordinates.

## Acceptance

- `/tools/dungeon-generator` renders a map and a key.
- Randomize changes the seed.
- Tests and typecheck pass.

## Suggested commit

`feat(dungeon): add seeded dungeon generator`
