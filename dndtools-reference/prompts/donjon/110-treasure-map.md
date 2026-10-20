# Treasure Map

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `treasure-map`
- label: Treasure Map
- href: `/tools/treasure-map`
- description: Draw a treasure map with a path of labeled markers and a clue for each one.
- source: `Site tables`

## Goal

A parchment-colored map in an SVG, with 4, 5, or 6 markers, a route, and a clue list. The route direction is one of: random, left to right, top to bottom, right to left, bottom to top. Random picks one of the four directions from the seed.

## Geometry

- View box 800 by 1000.
- Coast or clearing: a filled blob from 6-8 noisy radii around the center so the edge is not a rectangle. Use the seeded rng. Fill with a paper color from `var(--color-surface)` or the nearest existing surface token. Ink uses the normal text color.
- Markers sit on a loose diagonal for the chosen direction, with `rng.pickInt(-40, 40)` jitter. Keep 80px away from the view box edge.
- Draw a dashed path through the markers in order. Do not cross the same marker twice.
- Each marker is a circle with the index. Under it, a short place name. Names come from `src/lib/names` wilderness or town catalogs when that module exists. Otherwise use a local list of 40 original place names.
- One marker, chosen by the seed, is the hoard and uses a star or an X made of two lines. The others are landmarks.

## Clues

One sentence per marker, in order. The last clue describes the hoard marker relative to the previous one ("two days past the standing stones"). Earlier clues describe the landmark itself.

Write 20 landmark types and 12 travel fragments in `src/lib/treasure-map/clues.ts`. Combine them. Do not mention distances in miles smaller than 1. Use days, ridges, rivers, and coasts.

A title sits at the top: "Map of {place}" using the hoard name.

## UI

- Marker count: Random, 4, 5, 6. Random means `pickInt(4, 6)`.
- Layout select with the five choices.
- Seed, Generate, Download SVG, Print. Print calls `window.print()` and a `.treasure-map-print` rule hides the form.
- The clue list is under the SVG, an ordered list.
- Class prefix: `.treasure-map`.

## Tests

- Left to right: marker i+1 has a greater x than marker i, before jitter is not the assertion. Assert the base x increases, and store base x on the result.
- Count is 4, 5, or 6.
- The hoard index is within the marker list.
- Same seed returns the same place names.

## Acceptance

- Page shows a map and clues.
- Download SVG saves a file that includes the title text.
- Tests and typecheck pass.

## Suggested commit

`feat(treasure-map): add treasure map generator`
