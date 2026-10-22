import {
  createSeededRng,
  type SeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import { colorForSurface } from "./palettes";
import { inverseProjection, outputDimensions } from "./projections";
import {
  buildHeightThresholds,
  classifyHeight,
  sampleGlobeHeight,
} from "./sampling";
import {
  DEFAULT_FRACTAL_INPUT,
  type FractalInput,
  type FractalProjection,
  type FractalResult,
} from "./types";

function clampInt(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeFractalInput(raw: FractalInput): FractalInput {
  const projection = raw.projection ?? DEFAULT_FRACTAL_INPUT.projection;
  const palette = raw.palette ?? DEFAULT_FRACTAL_INPUT.palette;
  return {
    projection,
    palette,
    water: clampInt(raw.water, 0, 100, DEFAULT_FRACTAL_INPUT.water),
    ice: clampInt(raw.ice, 0, 100, DEFAULT_FRACTAL_INPUT.ice),
    height: clampInt(raw.height, 240, 800, DEFAULT_FRACTAL_INPUT.height),
    iterations: clampInt(
      raw.iterations,
      1,
      6,
      DEFAULT_FRACTAL_INPUT.iterations,
    ),
    rotation: clampInt(raw.rotation, 0, 359, DEFAULT_FRACTAL_INPUT.rotation),
  };
}

export function generateFractalWorld(
  rawInput: FractalInput,
  _rng: SeededRng,
  noiseSeed: number,
): FractalResult {
  const input = normalizeFractalInput(rawInput);
  const seed = noiseSeed >>> 0;
  const { width, height } = outputDimensions(input);
  const thresholds = buildHeightThresholds(
    seed,
    input.water,
    input.ice,
    input.iterations,
    input.rotation,
  );
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const geo = inverseProjection(
        input.projection,
        x,
        y,
        width,
        height,
        input.rotation,
      );
      const i = (y * width + x) * 4;
      if (!geo) {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 0;
        continue;
      }
      const h = sampleGlobeHeight(
        seed,
        geo.lat,
        geo.lon,
        input.rotation,
        input.iterations,
      );
      const kind = classifyHeight(h, thresholds);
      const [r, g, b] = colorForSurface(input.palette, kind);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }

  return { width, height, pixels };
}

/** Render every projection at minimal size to ensure inverses do not throw. */
export function smokeAllProjections(seed: number): void {
  const projections: FractalProjection[] = [
    "square",
    "mercator",
    "transverse-mercator",
    "icosahedral",
    "mollweide",
    "sinusoidal",
    "spherical",
    "polar-orthographic",
    "polar-stereographic",
    "polar-gnomonic",
  ];
  const rng = createSeededRng(seed);
  for (const projection of projections) {
    generateFractalWorld(
      {
        ...DEFAULT_FRACTAL_INPUT,
        projection,
        height: 240,
      },
      rng,
      seed,
    );
  }
}

export function countIcosahedralFacesWithSamples(
  seed: number,
  size: number,
): number {
  const result = generateFractalWorld(
    {
      ...DEFAULT_FRACTAL_INPUT,
      projection: "icosahedral",
      height: size,
    },
    createSeededRng(seed),
    seed,
  );
  const faces = new Set<number>();
  const { width, height } = result;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4 + 3;
      if (result.pixels[i] === 0) continue;
      const geo = inverseProjection(
        "icosahedral",
        x,
        y,
        width,
        height,
        0,
      );
      if (geo?.face !== undefined) faces.add(geo.face);
    }
  }
  return faces.size;
}
