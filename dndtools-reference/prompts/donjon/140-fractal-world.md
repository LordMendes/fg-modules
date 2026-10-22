# Fractal World

Read `00-shared.md` first. Implement only this tool. Reuse `src/lib/world/noise.ts` if World Generator already added it. If not, add that file here with the same value-noise behavior described in `130-world.md`.

## Catalog

- key: `fractal-world`
- label: Fractal World
- href: `/tools/fractal-world`
- description: Render a seeded world in several map projections and color palettes.
- source: `Site tables`

## Goal

A globe of height and temperature, drawn into a canvas or SVG with a chosen projection and palette. This page has no cities, labels, or rivers.

## Input

```ts
type FractalInput = {
  projection:
    | "square"
    | "mercator"
    | "transverse-mercator"
    | "icosahedral"
    | "mollweide"
    | "sinusoidal"
    | "spherical"
    | "polar-orthographic"
    | "polar-stereographic"
    | "polar-gnomonic";
  palette: "atlas" | "antique" | "barren" | "martian" | "chthonian" | "greyscale" | "landmask";
  water: number; // percent, default 60
  ice: number; // percent of land, default 8
  height: number; // output image height in px, 240-800, default 480
  iterations: number; // noise octaves, 1-6, default 4
  rotation: number; // degrees, 0-359
};
```

Width is `height * 2` for square, mercator, transverse mercator, mollweide, and sinusoidal. Polar projections and spherical use a square `height` by `height`. Icosahedral uses `height` by `height` and draws a net of 20 triangles.

Skip an animated globe. There is no animation on this page.

## Sampling

Longitude and latitude come from the projection's inverse, in degrees. If the inverse is outside the earth, the pixel is empty (page background).

Rotation adds degrees to longitude before sampling.

Noise coordinate: `cos(lat) * cos(lon)`, `cos(lat) * sin(lon)`, `sin(lat)`, times 2. Octaves sum and normalize. Sea and ice thresholds work like the world map: water percent, then ice percent of land.

Projections to implement, standard formulas, y down:

- Square: equirectangular. x maps to longitude, y to latitude.
- Mercator: longitude linear, latitude `atan(sinh(y))`. Clip to +/- 85 degrees.
- Transverse mercator: swap the roles of longitude and latitude in the mercator sample, then rotate by the rotation field.
- Mollweide: use the standard auxiliary-angle iteration (at most 10 steps) or the common approximation `lat = asin((2 * theta + sin(2 * theta)) / pi)` with `theta = asin(y)`. Pixels outside the ellipse are empty.
- Sinusoidal: `lon = x / cos(lat)`, empty outside the cosine envelope.
- Spherical: orthographic globe, front hemisphere only. Limb pixels are empty.
- Polar orthographic, stereographic, and gnomonic: north pole at center. Orthographic shows the northern hemisphere. Stereographic shows down to about 80 degrees south and marks the rest empty. Gnomonic clips to 80 degrees from the pole.
- Icosahedral: 20 triangles in a net. Map each triangle's barycentric coordinates to a face of a regular icosahedron, then to lon/lat. A published net layout is fine. Faces that do not contain the pixel stay empty.

## Palettes

Each palette is an array of stops for bathymetry, lowland, highland, and ice. Define them in `src/lib/fractal-world/palettes.ts` as RGB triples. These are map inks, so hex in that one data file is allowed. Components must not inline hex.

- Atlas: deep blue, green, brown, white.
- Antique: indigo, olive, tan, cream.
- Barren: grey-blue, tan, rust, pale tan.
- Martian: black-red, rust, orange, pale orange. Ice is pale, not white-blue.
- Chthonian: near-black, dark red, ember, ash.
- Greyscale: four greys.
- Landmask: black water, white land, light grey ice.

## UI

- The selects and sliders or number inputs above.
- Seed, Generate.
- Render to a `<canvas>`. Offer Download PNG via `canvas.toBlob`.
- Changing projection or palette regenerates.
- Class prefix: `.fractal-world`. Keep the canvas responsive (`max-width: 100%`).

## Tests

- Equirectangular: a known lat/lon maps inside the bitmap. Test the inverse at the center pixel (lat near 0, lon near 0 plus rotation).
- Mollweide corner pixel is empty.
- Water ratio on the equirectangular grid, before projection, is within 10 points of the requested percent.
- Rotation 90 changes the height sampled at lon 0. Compare one noise sample.
- Icosahedral net covers at least 10 faces with some land or sea pixel. A face with zero samples fails the test.

## Acceptance

- Every projection in the select draws without throwing.
- PNG download works in the browser.
- Tests and typecheck pass.

## Suggested commit

`feat(fractal-world): add projected world renderer`
