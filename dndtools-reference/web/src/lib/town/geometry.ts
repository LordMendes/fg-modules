import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type {
  TownBuildingRect,
  TownDistrictLayout,
  TownRiver,
  TownTopography,
} from "./types";
import { TOWN_VIEW_SIZE } from "./types";

export type Rect = { x: number; y: number; w: number; h: number };

export function townLandBounds(effectiveTopography: TownTopography): Rect {
  const size = TOWN_VIEW_SIZE;
  const pad = size * 0.1;
  if (effectiveTopography === "coastal") {
    const waterH = size * 0.25;
    return { x: pad, y: pad, w: size - pad * 2, h: size - waterH - pad };
  }
  if (effectiveTopography === "island") {
    const inset = size * 0.12;
    return { x: inset, y: inset, w: size - inset * 2, h: size - inset * 2 };
  }
  return { x: pad, y: pad, w: size - pad * 2, h: size - pad * 2 };
}

export function gridSideForDistricts(count: number, hasMarket: boolean): number {
  if (!hasMarket) {
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    return 3;
  }
  for (let side = 3; side <= 15; side += 2) {
    if (side * side - 1 >= count) return side;
  }
  return 15;
}

export function districtCells(
  districtCount: number,
  hasMarket: boolean,
): { row: number; col: number; isMarket: boolean }[] {
  if (!hasMarket) {
    const cols = districtCount <= 1 ? 1 : districtCount <= 2 ? 2 : 3;
    const rows = Math.ceil(districtCount / cols);
    const cells: { row: number; col: number; isMarket: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells.length >= districtCount) break;
        cells.push({ row: r, col: c, isMarket: false });
      }
    }
    return cells;
  }

  const side = gridSideForDistricts(districtCount, true);
  const mid = Math.floor(side / 2);
  const cells: { row: number; col: number; isMarket: boolean }[] = [];
  let districts = 0;
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      if (r === mid && c === mid) {
        cells.push({ row: r, col: c, isMarket: true });
        continue;
      }
      if (districts >= districtCount) continue;
      districts += 1;
      cells.push({ row: r, col: c, isMarket: false });
    }
  }
  return cells;
}

export function splitBounds(
  land: Rect,
  cells: { row: number; col: number; isMarket: boolean }[],
  gridSide: number,
): Map<string, Rect> {
  const side = gridSide;
  const gutter = 10;
  const cellW = (land.w - gutter * (side - 1)) / side;
  const cellH = (land.h - gutter * (side - 1)) / side;
  const map = new Map<string, Rect>();
  for (const cell of cells) {
    const key = `${cell.row},${cell.col},${cell.isMarket ? "m" : "d"}`;
    map.set(key, {
      x: land.x + cell.col * (cellW + gutter),
      y: land.y + cell.row * (cellH + gutter),
      w: cellW,
      h: cellH,
    });
  }
  return map;
}

function pointInRiver(
  x: number,
  y: number,
  river: TownRiver,
): boolean {
  const half = river.width / 2;
  for (let i = 0; i < river.points.length - 1; i++) {
    const a = river.points[i]!;
    const b = river.points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(
      0,
      Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lenSq),
    );
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const dist = Math.hypot(x - px, y - py);
    if (dist <= half) return true;
  }
  return false;
}

function rectOverlapsRiver(rect: TownBuildingRect, river: TownRiver | null): boolean {
  if (!river) return false;
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
  ];
  return corners.some((pt) => pointInRiver(pt.x, pt.y, river));
}

export function placeBuildingsInDistrict(
  bounds: Rect,
  rng: SeededRng,
  river: TownRiver | null,
): TownBuildingRect[] {
  const count = rng.pickInt(3, 8);
  const buildings: TownBuildingRect[] = [];
  const pad = 6;
  const inner = {
    x: bounds.x + pad,
    y: bounds.y + pad,
    w: bounds.w - pad * 2,
    h: bounds.h - pad * 2,
  };
  if (inner.w < 12 || inner.h < 12) return buildings;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const bw = rng.pickInt(
        Math.max(8, Math.floor(inner.w * 0.15)),
        Math.max(12, Math.floor(inner.w * 0.38)),
      );
      const bh = rng.pickInt(
        Math.max(8, Math.floor(inner.h * 0.15)),
        Math.max(12, Math.floor(inner.h * 0.38)),
      );
      const x = inner.x + rng.next() * Math.max(1, inner.w - bw);
      const y = inner.y + rng.next() * Math.max(1, inner.h - bh);
      const candidate = { x, y, w: bw, h: bh };
      if (rectOverlapsRiver(candidate, river)) continue;
      const overlaps = buildings.some(
        (other) =>
          !(
            candidate.x + candidate.w <= other.x ||
            other.x + other.w <= candidate.x ||
            candidate.y + candidate.h <= other.y ||
            other.y + other.h <= candidate.y
          ),
      );
      if (overlaps) continue;
      buildings.push(candidate);
      placed = true;
      break;
    }
    if (!placed) break;
  }
  return buildings;
}

export function buildRiver(rng: SeededRng, land: Rect): TownRiver {
  const width = 28;
  type Edge = "top" | "bottom" | "left" | "right";
  const edges: Edge[] = ["top", "bottom", "left", "right"];
  const startEdge = rng.pick(edges) ?? "top";
  const endEdge =
    startEdge === "top"
      ? "bottom"
      : startEdge === "bottom"
        ? "top"
        : startEdge === "left"
          ? "right"
          : "left";

  function edgePoint(edge: Edge): { x: number; y: number } {
    switch (edge) {
      case "top":
        return {
          x: land.x + rng.next() * land.w,
          y: land.y,
        };
      case "bottom":
        return {
          x: land.x + rng.next() * land.w,
          y: land.y + land.h,
        };
      case "left":
        return {
          x: land.x,
          y: land.y + rng.next() * land.h,
        };
      default:
        return {
          x: land.x + land.w,
          y: land.y + rng.next() * land.h,
        };
    }
  }

  const bends = rng.pickInt(3, 5);
  const points = [edgePoint(startEdge)];
  for (let i = 1; i < bends - 1; i++) {
    points.push({
      x: land.x + rng.next() * land.w,
      y: land.y + rng.next() * land.h,
    });
  }
  points.push(edgePoint(endEdge));

  return { points, width };
}

export function roadSegments(
  land: Rect,
  hasCrossStreet: boolean,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const mainY = land.y + land.h / 2;
  const main = {
    x1: land.x,
    y1: mainY,
    x2: land.x + land.w,
    y2: mainY,
  };
  if (!hasCrossStreet) return [main];
  const crossX = land.x + land.w / 2;
  const cross = {
    x1: crossX,
    y1: land.y,
    x2: crossX,
    y2: land.y + land.h,
  };
  return [main, cross];
}

export function wallRect(land: Rect, inset: number): Rect {
  return {
    x: land.x - inset,
    y: land.y - inset,
    w: land.w + inset * 2,
    h: land.h + inset * 2,
  };
}

export type LayoutResult = {
  land: Rect;
  districtLayouts: TownDistrictLayout[];
  marketBounds: Rect | null;
  river: TownRiver | null;
  roads: ReturnType<typeof roadSegments>;
  gate: { x: number; y: number };
};

export function buildLayout(
  districtCount: number,
  hasMarket: boolean,
  effectiveTopography: TownTopography,
  riverEnabled: boolean,
  rng: SeededRng,
  nameForDistrict: (index: number) => { name: string; buildingType: import("./types").BuildingType },
): LayoutResult {
  const land = townLandBounds(effectiveTopography);
  const cells = districtCells(districtCount, hasMarket);
  const side = hasMarket
    ? gridSideForDistricts(districtCount, true)
    : Math.max(
        ...cells.map((cell) => cell.row),
        ...cells.map((cell) => cell.col),
      ) + 1;
  const boundsMap = splitBounds(land, cells, side);
  const river = riverEnabled ? buildRiver(rng, land) : null;
  const roads = roadSegments(land, districtCount >= 4);

  let marketBounds: Rect | null = null;
  const districtLayouts: TownDistrictLayout[] = [];
  let districtIndex = 0;

  for (const cell of cells) {
    const key = `${cell.row},${cell.col},${cell.isMarket ? "m" : "d"}`;
    const bounds = boundsMap.get(key);
    if (!bounds) continue;
    if (cell.isMarket) {
      marketBounds = bounds;
      continue;
    }
    districtIndex += 1;
    const meta = nameForDistrict(districtIndex);
    districtLayouts.push({
      index: districtIndex,
      name: meta.name,
      buildingType: meta.buildingType,
      bounds,
      buildings: placeBuildingsInDistrict(bounds, rng, river),
    });
  }

  const gate = { x: land.x + land.w / 2, y: land.y + land.h + 8 };

  return {
    land,
    districtLayouts,
    marketBounds,
    river,
    roads,
    gate,
  };
}
