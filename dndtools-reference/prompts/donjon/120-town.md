# Town Generator

Read `00-shared.md` first. Implement only this tool. Do not add a new npm dependency. A grid town is the right implementation. Do not import d3.

## Catalog

- key: `town-generator`
- label: Town Generator
- href: `/tools/town-generator`
- description: Generate a town map with districts, roads, walls, and a labeled gazetteer.
- source: `Site tables`

## Goal

An SVG town and a gazetteer. Size changes how many districts and buildings appear. Walls, a river, and the coastline are options. Labels can be turned off.

## Input

```ts
type TownInput = {
  name: string;
  environment: "arctic" | "desert" | "forest" | "grassland" | "mountain" | "subterranean";
  topography: "inland" | "coastal" | "island";
  river: boolean;
  size: "thorp" | "hamlet" | "village" | "small-town" | "large-town" | "small-city" | "large-city" | "metropolis";
  walled: boolean;
  labels: boolean;
  race: "any" | "human" | "dwarf" | "elf";
  culture: string; // a short label stored on the result, used only to pick name flavor
};
```

Culture select: Default, plus the place-name flavors already in `src/lib/names` if that module exports catalogs. If it does not, offer Default only and ignore culture for names. Do not add real-world language corpora.

District counts: thorp 1, hamlet 2, village 3, small town 4, large town 6, small city 8, large city 10, metropolis 14.

## Map

View box 900 by 900.

- Inland: buildings sit in the middle 80%.
- Coastal: the bottom 25% is water. Town sits above a jagged shore.
- Island: water around an oval of land inset 12%.
- River, when on: a polyline from a random top or side edge to the opposite side, 3-5 bends, 28px wide. Bridges replace the road where a road crosses water. Two bridges is enough.
- Walls, when on: a rounded rectangle or the island shore, with a gate on the road that leaves town. Thorp and hamlet still draw a palisade (dashed stroke) rather than a stone wall. Say which in the gazetteer.
- Roads: one main street across town, plus a cross street once the district count is 4 or more. Districts are blocks between the roads. Number them.
- Buildings: each district gets 3 to 8 rectangles. Do not overlap the river. Leave a market block empty of buildings in the center when districts are 4 or more, and label it Market.
- Environment changes the ground fill class: `.town-gen-arctic`, `.town-gen-desert`, and so on. Set those fills from existing CSS variables with a slight filter or opacity. No new hex values. Subterranean uses a darker surface and no shore even if coastal was selected. If subterranean and coastal conflict, subterranean wins and the UI disables topography.

## Gazetteer

For each district, one row: name, and a building type (smith, shrine, inn, warehouse, homes, mill, barracks, well). The center market is always "Market".

District names: `{town} {Quarter|Row|Yard|Gate}` or a generated short name. Race `dwarf` prefers Yard, Delve, Hall. `elf` prefers Glade, Court, Lantern. `human` and `any` use the default set.

Town name rerolls from `src/lib/names` town catalog or a local list of 40 names.

## UI

- The selects and checkboxes above. Walled defaults on for small city and larger, off otherwise, until the user toggles it.
- Labels checkbox default on.
- Seed, Generate, Download SVG.
- Gazetteer is a table under the map: District, Notes.
- Class prefix: `.town-gen`.

## Tests

- Village produces 3 districts.
- Metropolis produces 14.
- River on: the result includes a river polyline with at least 2 points.
- Coastal: there is a water region.
- Subterranean forces inland geometry even if topography is island. Test the normalize function.
- Labels off: SVG title may remain, district `<text>` nodes are absent. Test a flag on the draft, and that the component would skip text. The pure function returns `labels: false`.

## Acceptance

- A walled coastal town shows water, a wall, a gate, and a gazetteer.
- Tests and typecheck pass.

## Suggested commit

`feat(town): add town map generator`
