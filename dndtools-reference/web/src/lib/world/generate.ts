import { generateBuiltinNames } from "@/lib/names";
import {
  createSeededRng,
  type SeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  cellIndex,
  hexDistance,
  isInBounds,
  neighborOffsets,
  WORLD_COLS,
  WORLD_ROWS,
} from "./hex";
import { fractalValueNoise2d } from "./noise";
import { renderWorldSvg } from "./render";
import type {
  RiverPath,
  TerrainKind,
  WorldCell,
  WorldInput,
  WorldResult,
  WorldSettlement,
} from "./types";
import { DEFAULT_WORLD_INPUT } from "./types";

const NOISE_SCALE = 0.12;
const RIVER_MAX_STEPS = 80;

function clampPercent(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeInput(input: WorldInput): WorldInput {
  return {
    name: input.name.trim(),
    water: clampPercent(input.water, 10, 90, DEFAULT_WORLD_INPUT.water),
    ice: clampPercent(input.ice, 0, 40, DEFAULT_WORLD_INPUT.ice),
    style: input.style === "antique" ? "antique" : "atlas",
    geography: input.geography !== false,
    rivers:
      input.rivers === "none" || input.rivers === "many" ? input.rivers : "yes",
    cities:
      input.cities === "none" || input.cities === "many" ? input.cities : "yes",
    hexGrid: input.hexGrid !== false,
    labels: input.labels !== false,
  };
}

function percentileThreshold(sorted: number[], percent: number): number {
  if (sorted.length === 0) return 0;
  const p = Math.min(100, Math.max(0, percent));
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length * p) / 100)),
  );
  return sorted[idx]!;
}

function buildHeights(seed: number): number[] {
  const raw: number[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      const h = fractalValueNoise2d(
        seed,
        col * NOISE_SCALE,
        row * NOISE_SCALE,
        4,
      );
      raw.push(h);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  const span = max - min || 1;
  return raw.map((h) => (h - min) / span);
}

function classifyTerrain(
  heights: number[],
  water: number,
  ice: number,
): { terrain: TerrainKind[]; seaCount: number; iceCount: number } {
  const sorted = [...heights].sort((a, b) => a - b);
  const seaThreshold = percentileThreshold(sorted, water);

  const terrain: TerrainKind[] = heights.map((h) =>
    h < seaThreshold ? "sea" : "lowland",
  );

  const landIndices: number[] = [];
  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] !== "sea") landIndices.push(i);
  }

  const iceTarget = Math.round((landIndices.length * ice) / 100);
  const landByHeight = landIndices
    .map((i) => ({ i, h: heights[i]! }))
    .sort((a, b) => b.h - a.h);

  let iceCount = 0;
  for (let k = 0; k < iceTarget && k < landByHeight.length; k++) {
    terrain[landByHeight[k]!.i] = "ice";
    iceCount += 1;
  }

  const remainingLandHeights = landIndices
    .filter((i) => terrain[i] !== "ice")
    .map((i) => heights[i]!)
    .sort((a, b) => a - b);
  const mountainThreshold = percentileThreshold(remainingLandHeights, 80);

  for (const i of landIndices) {
    if (terrain[i] === "ice") continue;
    terrain[i] =
      heights[i]! >= mountainThreshold ? "mountain" : "lowland";
  }

  const seaCount = terrain.filter((t) => t === "sea").length;
  return { terrain, seaCount, iceCount };
}

function markCoasts(terrain: TerrainKind[]): boolean[] {
  const coast = new Array<boolean>(terrain.length).fill(false);
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      const i = cellIndex(col, row);
      if (terrain[i] === "sea") continue;
      for (const n of neighborOffsets(col, row)) {
        if (terrain[cellIndex(n.col, n.row)] === "sea") {
          coast[i] = true;
          break;
        }
      }
    }
  }
  return coast;
}

function traceRiver(
  startCol: number,
  startRow: number,
  heights: number[],
  terrain: TerrainKind[],
): RiverPath | null {
  const path: { col: number; row: number }[] = [{ col: startCol, row: startRow }];
  const visited = new Set<string>([`${startCol},${startRow}`]);

  for (let step = 0; step < RIVER_MAX_STEPS; step++) {
    const last = path[path.length - 1]!;
    const neighbors = neighborOffsets(last.col, last.row);
    let best: { col: number; row: number } | null = null;
    let bestHeight = Infinity;

    for (const n of neighbors) {
      const t = terrain[cellIndex(n.col, n.row)]!;
      if (t === "sea") {
        path.push(n);
        return { points: path };
      }
      if (t === "ice") continue;
      const h = heights[cellIndex(n.col, n.row)]!;
      if (h < bestHeight || (h === bestHeight && n.col < (best?.col ?? Infinity))) {
        bestHeight = h;
        best = n;
      } else if (
        h === bestHeight &&
        best &&
        (n.row < best.row || (n.row === best.row && n.col < best.col))
      ) {
        best = n;
      }
    }

    if (!best) return null;
    const key = `${best.col},${best.row}`;
    if (visited.has(key)) return null;
    if (terrain[cellIndex(best.col, best.row)] === "sea") {
      path.push(best);
      return { points: path };
    }
    if (terrain[cellIndex(best.col, best.row)] === "mountain" && step > 0) {
      // allow leaving mountain source only
    }
    visited.add(key);
    path.push(best);
  }

  return null;
}

function generateRivers(
  input: WorldInput,
  heights: number[],
  terrain: TerrainKind[],
  rng: SeededRng,
): RiverPath[] {
  const count =
    input.rivers === "many" ? 10 : input.rivers === "yes" ? 4 : 0;
  if (count === 0) return [];

  const sources: { col: number; row: number }[] = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      if (terrain[cellIndex(col, row)] === "mountain") {
        sources.push({ col, row });
      }
    }
  }

  const shuffled = rng.shuffle(sources);
  const rivers: RiverPath[] = [];
  const used = new Set<string>();

  for (const start of shuffled) {
    if (rivers.length >= count) break;
    const key = `${start.col},${start.row}`;
    if (used.has(key)) continue;
    const path = traceRiver(start.col, start.row, heights, terrain);
    if (!path) continue;
    const end = path.points[path.points.length - 1]!;
    if (terrain[cellIndex(end.col, end.row)] !== "sea") continue;
    rivers.push(path);
    for (const p of path.points) {
      used.add(`${p.col},${p.row}`);
    }
  }

  return rivers;
}

function applyRiverCells(rivers: RiverPath[], riverFlags: boolean[]): void {
  for (const river of rivers) {
    for (const p of river.points) {
      if (!isInBounds(p.col, p.row)) continue;
      const i = cellIndex(p.col, p.row);
      if (riverFlags[i] !== undefined) riverFlags[i] = true;
    }
  }
}

function landNeighborCount(
  col: number,
  row: number,
  terrain: TerrainKind[],
): number {
  let count = 0;
  for (const n of neighborOffsets(col, row)) {
    const t = terrain[cellIndex(n.col, n.row)]!;
    if (t !== "sea") count += 1;
  }
  return count;
}

function pickSettlements(
  input: WorldInput,
  terrain: TerrainKind[],
  rng: SeededRng,
  nameRng: SeededRng,
  nameRngSeed: number,
): WorldSettlement[] {
  if (input.cities === "none") return [];

  const cityCount = input.cities === "many" ? 14 : 6;
  const ruinCount = input.cities === "many" ? 8 : 4;

  const candidates: { col: number; row: number }[] = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      if (terrain[cellIndex(col, row)] === "lowland") {
        candidates.push({ col, row });
      }
    }
  }

  const shuffled = rng.shuffle(candidates);
  const placed: WorldSettlement[] = [];

  function canPlace(col: number, row: number): boolean {
    for (const s of placed) {
      if (hexDistance({ col, row }, { col: s.col, row: s.row }) < 3) {
        return false;
      }
    }
    return true;
  }

  const townNames = generateBuiltinNames(
    {
      catalogId: "town",
      count: cityCount + ruinCount + 2,
      seed: nameRngSeed,
    },
    nameRng,
  );
  let nameIdx = 0;

  function nextName(): string {
    const name = townNames[nameIdx] ?? `Hold ${nameIdx + 1}`;
    nameIdx += 1;
    return name;
  }

  for (const c of shuffled) {
    if (placed.filter((s) => s.kind !== "ruin").length >= cityCount) break;
    if (!canPlace(c.col, c.row)) continue;
    placed.push({
      col: c.col,
      row: c.row,
      name: nextName(),
      kind: "city",
    });
  }

  for (const c of shuffled) {
    if (placed.filter((s) => s.kind === "ruin").length >= ruinCount) break;
    if (!canPlace(c.col, c.row)) continue;
    if (terrain[cellIndex(c.col, c.row)] !== "lowland") continue;
    placed.push({
      col: c.col,
      row: c.row,
      name: nextName(),
      kind: "ruin",
    });
  }

  const cities = placed.filter((s) => s.kind === "city");
  if (cities.length === 0) return placed;

  let best = cities[0]!;
  let bestNeighbors = -1;
  for (const city of cities) {
    const n = landNeighborCount(city.col, city.row, terrain);
    if (n > bestNeighbors) {
      bestNeighbors = n;
      best = city;
    }
  }

  for (const s of placed) {
    if (s.col === best.col && s.row === best.row && s.kind === "city") {
      s.kind = "capital";
    }
  }

  return placed;
}

function resolveWorldName(
  input: WorldInput,
  rng: SeededRng,
  nameSeed: number,
): string {
  if (input.name) return input.name;
  const names = generateBuiltinNames(
    { catalogId: "kingdom", count: 1, seed: nameSeed },
    rng,
  );
  return names[0] ?? "Unnamed Realm";
}

export function generateWorld(
  rawInput: WorldInput,
  rng: SeededRng,
  noiseSeed: number,
): WorldResult {
  const input = normalizeInput(rawInput);
  const heights = buildHeights(noiseSeed >>> 0);
  const { terrain, seaCount, iceCount } = classifyTerrain(
    heights,
    input.water,
    input.ice,
  );
  const coast = markCoasts(terrain);
  const riverFlags = new Array<boolean>(heights.length).fill(false);

  const rivers = generateRivers(input, heights, terrain, rng);
  applyRiverCells(rivers, riverFlags);

  const nameRngSeed = (noiseSeed + 9001) >>> 0;

  const worldName = resolveWorldName(
    input,
    createSeededRng(nameRngSeed),
    nameRngSeed,
  );
  const settlements = pickSettlements(
    input,
    terrain,
    rng,
    createSeededRng(nameRngSeed + 17),
    nameRngSeed + 17,
  );

  const cells: WorldCell[] = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      const i = cellIndex(col, row);
      cells.push({
        col,
        row,
        height: heights[i]!,
        terrain: terrain[i]!,
        river: riverFlags[i]!,
        coast: coast[i]!,
      });
    }
  }

  const result: WorldResult = {
    name: worldName,
    input,
    cells,
    rivers,
    settlements,
    svg: "",
    seaCount,
    iceCount,
  };

  result.svg = renderWorldSvg(result);
  return result;
}

/** Test helper: river steps stay on land until the last hex may be sea. */
export function riverStepsValid(
  path: RiverPath,
  terrain: TerrainKind[],
): boolean {
  if (path.points.length === 0) return true;
  for (let i = 0; i < path.points.length - 1; i++) {
    const p = path.points[i]!;
    const t = terrain[cellIndex(p.col, p.row)]!;
    if (t === "sea") return false;
  }
  const end = path.points[path.points.length - 1]!;
  return terrain[cellIndex(end.col, end.row)] === "sea";
}
