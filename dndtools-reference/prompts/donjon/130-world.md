# World Generator

Read `00-shared.md` first. Implement only this tool. This is the labeled fantasy map, not the projection studio. That is a separate plan.

## Catalog

- key: `world-generator`
- label: World Generator
- href: `/tools/world-generator`
- description: Generate a world map with seas, ice, rivers, and cities on a hex or square grid.
- source: `Site tables`

## Goal

A seeded heightmap rendered to SVG, with optional rivers, cities, and hex labels. Two color themes, Atlas and Antique, built from existing CSS variables plus a small set of fills defined once under `.world-gen`.

## Input

```ts
type WorldInput = {
  name: string;
  water: number; // 10-90, percent of cells below sea level, default 60
  ice: number; // 0-40, percent of land cells that are ice, default 8
  style: "atlas" | "antique";
  geography: boolean; // default true, draws coast and mountain icons
  rivers: "none" | "yes" | "many";
  cities: "none" | "yes" | "many";
  hexGrid: boolean; // default true
  labels: boolean; // default true
};
```

Grid is 64 columns by 40 rows of hexes (pointy top). If `hexGrid` is off, still simulate on that grid but do not stroke the hexes.

## Height

For each hex center, sample value noise. Implement a tiny value-noise function in `src/lib/world/noise.ts`: hash of `floor(x)`, `floor(y)`, and the seed, interpolated with smoothstep. Sample 4 octaves. No new dependency.

Normalize heights to 0-1. Choose a sea threshold so about `water` percent of hexes are sea. Ice is the highest land until about `ice` percent of land is ice. Remaining land splits into lowland and mountain at the 80th percentile of land height.

## Rivers

`none` draws none. `yes` starts 4 rivers. `many` starts 10. A river starts on a mountain hex and walks to the lowest neighbor until it hits sea or a loop. Draw it as a polyline through hex centers. If it cannot reach the sea in 80 steps, discard it.

## Cities

`yes`: 6 cities and 4 ruins. `many`: 14 cities and 8 ruins. Place only on lowland, not on ice, not in the sea, at least 3 hexes apart. One city is the capital, the one with the most land neighbors.

Names from `src/lib/names` kingdom and town catalogs if present, otherwise a local list. The world name follows the same rule.

## Render

- Sea, lowland, mountain, ice, river, city dot, ruin ring, capital star.
- Atlas: cooler contrast. Antique: warmer paper background. Both must stay readable in the site's light and dark themes. Use `color-mix` with existing variables if the file already uses `color-mix`. If it does not, use opacity on currentColor and the surface variable.
- Labels: world name as a title, capital name, and other city names when `labels` is on. Hex grid on draws the hex stroke at low opacity.
- Geography off: no mountain marks and no separate coast stroke. The fill still shows the terrain.

## UI

- Name, seed, water percent, ice percent.
- Style, geography, rivers, cities, hex grid, labels.
- Generate, Download SVG.
- A short legend under the map: sea, land, mountain, ice, capital, city, ruin.
- Class prefix: `.world-gen`.

## Tests

- Water percent 60 on seed 1: sea cells are between 50% and 70% of the grid.
- Ice cells are land, never sea.
- Rivers, when requested, only step onto land or end on sea.
- Cities are at least 3 hexes apart.
- `cities: "none"` returns an empty city list.

## Acceptance

- Page renders a map with a capital when cities are on.
- Tests and typecheck pass.

## Suggested commit

`feat(world): add world map generator`
