import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type {
  TownBuildingRect,
  TownDistrictLayout,
  TownRiver,
  TownTopography,
} from "./types";
import { TOWN_VIEW_SIZE } from "./types";

export type Rect = { x: number; y: number; w: number; h: number };

type Pt = { x: number; y: number };

const VIEW = TOWN_VIEW_SIZE;

export type TerrainCell = {
  points: Pt[];
  shade: number;
};

export type TownBlock = {
  points: Pt[];
  buildings: TownBuildingRect[];
  districtIndex: number | null;
};

export type LayoutResult = {
  land: Rect;
  districtLayouts: TownDistrictLayout[];
  marketBounds: Rect | null;
  river: TownRiver | null;
  roads: { x1: number; y1: number; x2: number; y2: number }[];
  gate: { x: number; y: number };
  terrain: TerrainCell[];
  blocks: TownBlock[];
  town: { cx: number; cy: number; outline: Pt[] };
  towers: Pt[];
};

function scaleForDistricts(count: number): { radius: number; spacing: number } {
  if (count <= 1) return { radius: 150, spacing: 72 };
  if (count === 2) return { radius: 185, spacing: 68 };
  if (count === 3) return { radius: 235, spacing: 62 };
  if (count <= 4) return { radius: 310, spacing: 58 };
  if (count <= 6) return { radius: 350, spacing: 52 };
  if (count <= 8) return { radius: 378, spacing: 48 };
  if (count <= 10) return { radius: 400, spacing: 44 };
  return { radius: 424, spacing: 40 };
}

function townAnchor(topography: TownTopography): {
  cx: number;
  cy: number;
  maxR: number;
} {
  if (topography === "coastal") {
    const shore = VIEW * 0.75;
    const cy = shore * 0.42;
    return { cx: VIEW / 2, cy, maxR: shore - cy - 46 };
  }
  if (topography === "island") {
    const inset = VIEW * 0.12;
    const landR = (VIEW - inset * 2) / 2;
    return { cx: VIEW / 2, cy: VIEW / 2, maxR: landR * 0.8 };
  }
  return { cx: VIEW / 2, cy: VIEW / 2, maxR: VIEW * 0.46 };
}

function rectPoly(x: number, y: number, w: number, h: number): Pt[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

type TownShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  waves: { freq: number; amp: number; phase: number }[];
};

function shapeLimit(shape: TownShape, angle: number): number {
  let limit = 1;
  for (const wave of shape.waves) {
    limit += wave.amp * Math.sin(wave.freq * angle + wave.phase);
  }
  return Math.max(0.62, limit);
}

function insideShape(shape: TownShape, x: number, y: number, scale = 1): boolean {
  const dx = (x - shape.cx) / shape.rx;
  const dy = (y - shape.cy) / shape.ry;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  return dist <= shapeLimit(shape, Math.atan2(dy, dx)) * scale;
}

function shapeOutline(shape: TownShape, samples: number, scale: number): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2 - Math.PI / 2;
    const limit = shapeLimit(shape, angle) * scale;
    points.push({
      x: shape.cx + Math.cos(angle) * shape.rx * limit,
      y: shape.cy + Math.sin(angle) * shape.ry * limit,
    });
  }
  return points;
}

function makeTownShape(
  cx: number,
  cy: number,
  radius: number,
  topography: TownTopography,
  districtCount: number,
  rng: SeededRng,
): TownShape {
  const ratio = 0.68 + rng.next() * 0.85;
  let rx = radius * Math.sqrt(ratio);
  let ry = radius / Math.sqrt(ratio);
  if (topography === "coastal") {
    rx = radius * (1.08 + rng.next() * 0.38);
    ry = radius * (0.58 + rng.next() * 0.22);
  } else if (topography === "island") {
    rx = radius * (0.82 + rng.next() * 0.36);
    ry = radius * (0.7 + rng.next() * 0.4);
  }
  const lump = districtCount <= 2 ? 0.22 : districtCount <= 6 ? 0.16 : 0.11;
  const waves = [
    { freq: 2, amp: lump * (0.65 + rng.next()), phase: rng.next() * Math.PI * 2 },
    { freq: 3, amp: lump * (0.4 + rng.next()), phase: rng.next() * Math.PI * 2 },
    { freq: 1, amp: lump * (0.3 + rng.next() * 0.7), phase: rng.next() * Math.PI * 2 },
  ];
  const shape: TownShape = { cx, cy, rx, ry, waves };
  const maxY = topography === "coastal" ? VIEW * 0.75 - 30 : VIEW - 28;
  for (let pass = 0; pass < 6; pass++) {
    const edge = shapeOutline(shape, 40, 1);
    let scale = 1;
    for (const point of edge) {
      if (point.x < 26) scale = Math.min(scale, (cx - 26) / Math.max(1, cx - point.x));
      if (point.x > VIEW - 26) {
        scale = Math.min(scale, (VIEW - 26 - cx) / Math.max(1, point.x - cx));
      }
      if (point.y < 26) scale = Math.min(scale, (cy - 26) / Math.max(1, cy - point.y));
      if (point.y > maxY) scale = Math.min(scale, (maxY - cy) / Math.max(1, point.y - cy));
      if (topography === "island") {
        const landR = ((VIEW - VIEW * 0.12 * 2) / 2) * 0.9;
        const dx = point.x - VIEW / 2;
        const dy = point.y - VIEW / 2;
        const land = Math.hypot(dx, dy);
        if (land > landR) scale = Math.min(scale, landR / land);
      }
    }
    if (scale > 0.985) break;
    shape.rx *= scale * 0.98;
    shape.ry *= scale * 0.98;
  }
  return shape;
}

function pullInsideShape(point: Pt, shape: TownShape): Pt {
  if (insideShape(shape, point.x, point.y, 0.9)) return point;
  const dx = point.x - shape.cx;
  const dy = point.y - shape.cy;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) / 2;
    if (insideShape(shape, shape.cx + dx * t, shape.cy + dy * t, 0.88)) lo = t;
    else hi = t;
  }
  return { x: shape.cx + dx * lo, y: shape.cy + dy * lo };
}

function clean(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const prev = out[out.length - 1];
    if (prev && Math.hypot(prev.x - point.x, prev.y - point.y) < 0.35) {
      continue;
    }
    out.push(point);
  }
  if (out.length > 2) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.hypot(first.x - last.x, first.y - last.y) < 0.35) out.pop();
  }
  return out;
}

function polygonArea(poly: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function centroid(poly: Pt[]): Pt {
  let acc = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = a.x * b.y - b.x * a.y;
    acc += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }
  if (Math.abs(acc) < 1e-6) {
    const sx = poly.reduce((sum, point) => sum + point.x, 0);
    const sy = poly.reduce((sum, point) => sum + point.y, 0);
    return { x: sx / poly.length, y: sy / poly.length };
  }
  return { x: x / (3 * acc), y: y / (3 * acc) };
}

function intersect(p: Pt, q: Pt, a: Pt, b: Pt): Pt {
  const dpx = q.x - p.x;
  const dpy = q.y - p.y;
  const dax = b.x - a.x;
  const day = b.y - a.y;
  const denom = dpx * day - dpy * dax;
  if (Math.abs(denom) < 1e-9) return q;
  const t = ((a.x - p.x) * day - (a.y - p.y) * dax) / denom;
  return { x: p.x + t * dpx, y: p.y + t * dpy };
}

function sameSide(point: Pt, a: Pt, b: Pt, site: Pt): boolean {
  const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
  const siteCross = (b.x - a.x) * (site.y - a.y) - (b.y - a.y) * (site.x - a.x);
  return cross * siteCross >= -1e-6;
}

function clipPoly(poly: Pt[], a: Pt, b: Pt, site: Pt): Pt[] {
  if (poly.length === 0) return [];
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const current = poly[i]!;
    const previous = poly[(i + poly.length - 1) % poly.length]!;
    const currentIn = sameSide(current, a, b, site);
    const previousIn = sameSide(previous, a, b, site);
    if (currentIn) {
      if (!previousIn) out.push(intersect(previous, current, a, b));
      out.push(current);
    } else if (previousIn) {
      out.push(intersect(previous, current, a, b));
    }
  }
  return out;
}

function clipByNeighbor(poly: Pt[], site: Pt, other: Pt): Pt[] {
  const mid = { x: (site.x + other.x) / 2, y: (site.y + other.y) / 2 };
  const dirX = other.x - site.x;
  const dirY = other.y - site.y;
  const a = { x: mid.x - dirY, y: mid.y + dirX };
  const b = { x: mid.x + dirY, y: mid.y - dirX };
  return clipPoly(poly, a, b, site);
}

function computeCells(sites: Pt[], bounds: Pt[], maxDist: number): Pt[][] {
  const maxSq = maxDist * maxDist;
  return sites.map((site) => {
    let poly = bounds.slice();
    for (const other of sites) {
      if (other === site) continue;
      const dx = other.x - site.x;
      const dy = other.y - site.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxSq || distSq < 0.5) continue;
      poly = clipByNeighbor(poly, site, other);
      if (poly.length < 3) return [];
    }
    const cleaned = clean(poly);
    if (cleaned.length < 3 || polygonArea(cleaned) < 24) return [];
    return cleaned;
  });
}

function jitteredGrid(
  cols: number,
  rows: number,
  originX: number,
  originY: number,
  cellW: number,
  cellH: number,
  jitter: number,
  rng: SeededRng,
  keep?: (point: Pt) => boolean,
): Pt[] {
  const sites: Pt[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const point = {
        x: originX + (col + 0.5) * cellW + (rng.next() - 0.5) * cellW * jitter,
        y: originY + (row + 0.5) * cellH + (rng.next() - 0.5) * cellH * jitter,
      };
      if (!keep || keep(point)) sites.push(point);
    }
  }
  return sites;
}

function relaxSites(
  sites: Pt[],
  bounds: Pt[],
  maxDist: number,
  limit: (point: Pt) => Pt,
): Pt[] {
  const cells = computeCells(sites, bounds, maxDist);
  return sites.map((site, index) => {
    const poly = cells[index];
    if (!poly || poly.length < 3) return site;
    return limit(centroid(poly));
  });
}

function clampRect(point: Pt, margin: number): Pt {
  return {
    x: Math.max(margin, Math.min(VIEW - margin, point.x)),
    y: Math.max(margin, Math.min(VIEW - margin, point.y)),
  };
}

function boundaryAt(shape: TownShape, angle: number, pad: number): Pt {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let lo = 0;
  let hi = Math.max(shape.rx, shape.ry) * 2.4 + 48;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (insideShape(shape, shape.cx + dx * mid, shape.cy + dy * mid, 1)) lo = mid;
    else hi = mid;
  }
  const dist = Math.max(8, lo + pad);
  return { x: shape.cx + dx * dist, y: shape.cy + dy * dist };
}

function distPointToSegment(point: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq),
  );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function minEdgeDistance(point: Pt, poly: Pt[]): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    min = Math.min(min, distPointToSegment(point, a, b));
  }
  return min;
}

function pointInPoly(point: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x <
        ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1e-9) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function overlapsRiver(rect: TownBuildingRect, river: TownRiver | null): boolean {
  if (!river) return false;
  const pad = river.width / 2 + 1.5;
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  return corners.some((corner) => {
    for (let i = 0; i < river.points.length - 1; i++) {
      if (distPointToSegment(corner, river.points[i]!, river.points[i + 1]!) <= pad) {
        return true;
      }
    }
    return false;
  });
}

function splitWeights(count: number, rng: SeededRng): number[] {
  const weights = Array.from({ length: count }, () => 0.55 + rng.next());
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => weight / sum);
}

function gridRects(
  left: number,
  top: number,
  size: number,
  gap: number,
  cols: number,
  rows: number,
  rng: SeededRng,
  dropOne: boolean,
): TownBuildingRect[] {
  const colW = splitWeights(cols, rng);
  const rowH = splitWeights(rows, rng);
  const rects: TownBuildingRect[] = [];
  const slots = cols * rows;
  const drop = dropOne && slots > 1 ? rng.pickInt(0, slots - 1) : -1;
  let x = left;
  let index = 0;
  for (let col = 0; col < cols; col++) {
    const slotW = size * colW[col]!;
    let y = top;
    for (let row = 0; row < rows; row++) {
      const slotH = size * rowH[row]!;
      if (index !== drop) {
        const w = slotW - gap;
        const h = slotH - gap;
        if (w >= 3.5 && h >= 3.5) {
          rects.push({
            x: x + gap / 2,
            y: y + gap / 2,
            w,
            h,
            shade: rng.pickInt(0, 2),
          });
        }
      }
      y += slotH;
      index += 1;
    }
    x += slotW;
  }
  return rects;
}

function placeBuildings(
  poly: Pt[],
  rng: SeededRng,
  river: TownRiver | null,
): TownBuildingRect[] {
  const center = centroid(poly);
  const reach = minEdgeDistance(center, poly);
  if (reach < 6) return [];
  const half = reach * 0.9;
  const size = half * 2;
  const left = center.x - half;
  const top = center.y - half;
  const gap = Math.max(2.4, Math.min(5.5, size * 0.09));
  const roll = rng.next();
  let rects: TownBuildingRect[];
  if (roll < 0.42) rects = gridRects(left, top, size, gap, 2, 2, rng, false);
  else if (roll < 0.58) rects = gridRects(left, top, size, gap, 2, 2, rng, true);
  else if (roll < 0.72) rects = gridRects(left, top, size, gap, 2, 1, rng, false);
  else if (roll < 0.84) rects = gridRects(left, top, size, gap, 1, 2, rng, false);
  else if (roll < 0.93) rects = gridRects(left, top, size, gap, 1, 1, rng, false);
  else {
    const cols = size > 40 ? 3 : 2;
    rects = gridRects(left, top, size, gap, cols, 2, rng, false);
  }

  rects = rects.filter((rect) => {
    const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    return pointInPoly(center, poly) && !overlapsRiver(rect, river);
  });

  if (rects.length > 0) return rects;
  const fallback = {
    x: center.x - half * 0.55,
    y: center.y - half * 0.55,
    w: half * 1.1,
    h: half * 1.1,
    shade: rng.pickInt(0, 2),
  };
  if (fallback.w < 4 || overlapsRiver(fallback, river)) return [];
  if (!pointInPoly(center, poly)) return [];
  return [fallback];
}

function chaikin(points: Pt[], iterations: number): Pt[] {
  let current = points;
  for (let pass = 0; pass < iterations; pass++) {
    const next: Pt[] = [current[0]!];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i]!;
      const b = current[i + 1]!;
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    next.push(current[current.length - 1]!);
    current = next;
  }
  return current;
}

function buildRiver(rng: SeededRng, cx: number, cy: number): TownRiver {
  const vertical = rng.next() < 0.6;
  const wobble = 100 + rng.next() * 90;
  const sign = rng.next() < 0.5 ? -1 : 1;
  const points = vertical
    ? [0, 0.22, 0.5, 0.78, 1].map((t) => ({
        x: Math.max(
          8,
          Math.min(
            VIEW - 8,
            cx + (rng.next() - 0.5) * 30 + Math.sin(t * Math.PI) * wobble * sign,
          ),
        ),
        y: t * VIEW,
      }))
    : [0, 0.22, 0.5, 0.78, 1].map((t) => ({
        x: t * VIEW,
        y: Math.max(
          8,
          Math.min(
            VIEW - 8,
            cy + (rng.next() - 0.5) * 30 + Math.sin(t * Math.PI) * wobble * sign,
          ),
        ),
      }));
  points[0] = vertical ? { x: points[0]!.x, y: 0 } : { x: 0, y: points[0]!.y };
  const last = points.length - 1;
  points[last] = vertical
    ? { x: points[last]!.x, y: VIEW }
    : { x: VIEW, y: points[last]!.y };
  return {
    points: chaikin(points, 3),
    width: 28 + rng.next() * 8,
  };
}

function rayToBorder(cx: number, cy: number, angle: number): Pt {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let limit = VIEW * 2;
  if (dx > 1e-6) limit = Math.min(limit, (VIEW - cx) / dx);
  if (dx < -1e-6) limit = Math.min(limit, (0 - cx) / dx);
  if (dy > 1e-6) limit = Math.min(limit, (VIEW - cy) / dy);
  if (dy < -1e-6) limit = Math.min(limit, (0 - cy) / dy);
  return { x: cx + dx * limit, y: cy + dy * limit };
}

function angleDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(diff, Math.PI * 2 - diff);
}

function outerRoads(
  shape: TownShape,
  count: number,
  rng: SeededRng,
): { roads: LayoutResult["roads"]; gate: Pt } {
  const angles: number[] = [];
  let guard = 0;
  while (angles.length < count && guard < 48) {
    guard += 1;
    const angle = rng.next() * Math.PI * 2;
    if (angles.some((existing) => angleDelta(existing, angle) < 0.62)) continue;
    angles.push(angle);
  }
  if (angles.length === 0) angles.push(-Math.PI / 2);

  const roads: LayoutResult["roads"] = [];
  for (const angle of angles) {
    const start = boundaryAt(shape, angle, -10);
    const end = rayToBorder(shape.cx, shape.cy, angle);
    const bend = (rng.next() - 0.5) * 70;
    const mid = {
      x: (start.x + end.x) / 2 + Math.cos(angle + Math.PI / 2) * bend,
      y: (start.y + end.y) / 2 + Math.sin(angle + Math.PI / 2) * bend,
    };
    roads.push({ x1: start.x, y1: start.y, x2: mid.x, y2: mid.y });
    roads.push({ x1: mid.x, y1: mid.y, x2: end.x, y2: end.y });
  }

  const gateAngle = angles[0]!;
  return {
    roads,
    gate: boundaryAt(shape, gateAngle, 0),
  };
}

function towersOnOutline(outline: Pt[]): Pt[] {
  const count = Math.max(8, Math.min(18, Math.round(outline.length / 4)));
  const points: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor((i / count) * outline.length) % outline.length;
    points.push(outline[index]!);
  }
  return points;
}

function boundsOf(points: Pt[], fallback: Pt): Rect {
  if (points.length === 0) {
    return { x: fallback.x, y: fallback.y, w: 12, h: 12 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { x: minX, y: minY, w: Math.max(8, maxX - minX), h: Math.max(8, maxY - minY) };
}

export function buildLayout(
  districtCount: number,
  hasMarket: boolean,
  effectiveTopography: TownTopography,
  riverEnabled: boolean,
  normalizeCells: boolean,
  rng: SeededRng,
  nameForDistrict: (index: number) => {
    name: string;
    buildingType: import("./types").BuildingType;
  },
): LayoutResult {
  const names = Array.from({ length: districtCount }, (_, index) =>
    nameForDistrict(index + 1),
  );
  const anchor = townAnchor(effectiveTopography);
  const scale = scaleForDistricts(districtCount);
  const radius = Math.max(120, Math.min(scale.radius, anchor.maxR));
  const { cx, cy } = anchor;
  const jitter = normalizeCells ? 0.34 : 0.7;

  const terrainCols = 10;
  const terrainRows = 10;
  const terrainW = VIEW / terrainCols;
  const terrainH = VIEW / terrainRows;
  let terrainSites = jitteredGrid(
    terrainCols,
    terrainRows,
    0,
    0,
    terrainW,
    terrainH,
    jitter,
    rng,
  );
  const terrainBounds = rectPoly(0, 0, VIEW, VIEW);
  const terrainReach = Math.max(terrainW, terrainH) * 4.2;
  if (normalizeCells) {
    const limit = (point: Pt) => clampRect(point, 28);
    terrainSites = relaxSites(terrainSites, terrainBounds, terrainReach, limit);
    terrainSites = relaxSites(terrainSites, terrainBounds, terrainReach, limit);
  }
  const terrainPolys = computeCells(terrainSites, terrainBounds, terrainReach);
  const terrain: TerrainCell[] = terrainPolys
    .filter((points) => points.length >= 3)
    .map((points) => ({ points, shade: rng.pickInt(0, 4) }));

  const shape = makeTownShape(
    cx,
    cy,
    radius,
    effectiveTopography,
    districtCount,
    rng,
  );
  const spacing = scale.spacing;
  const footprint = shapeOutline(shape, 28, 1);
  const minX = Math.min(...footprint.map((point) => point.x));
  const maxX = Math.max(...footprint.map((point) => point.x));
  const minY = Math.min(...footprint.map((point) => point.y));
  const maxY = Math.max(...footprint.map((point) => point.y));
  const cols = Math.max(3, Math.ceil((maxX - minX) / spacing));
  const rows = Math.max(3, Math.ceil((maxY - minY) / spacing));
  const cellW = (maxX - minX) / cols;
  const cellH = (maxY - minY) / rows;
  let townSites = jitteredGrid(
    cols,
    rows,
    minX,
    minY,
    cellW,
    cellH,
    jitter,
    rng,
    (point) => insideShape(shape, point.x, point.y, 0.96),
  );
  if (townSites.length < districtCount) {
    townSites = shapeOutline(shape, Math.max(districtCount, 6), 0.55);
  }
  const townBounds = shapeOutline(shape, 72, 0.99);
  const townReach = spacing * 4.4;
  if (normalizeCells) {
    const limit = (point: Pt) => pullInsideShape(point, shape);
    townSites = relaxSites(townSites, townBounds, townReach, limit);
  }
  const townPolys = computeCells(townSites, townBounds, townReach).filter(
    (points) => points.length >= 3,
  );

  const river = riverEnabled ? buildRiver(rng, cx, cy) : null;
  const blocks: TownBlock[] = townPolys.map((points) => ({
    points,
    buildings: placeBuildings(points, rng, river),
    districtIndex: null,
  }));

  const indexed = blocks
    .map((block, index) => ({ index, center: centroid(block.points) }))
    .sort(
      (a, b) =>
        Math.atan2(a.center.y - cy, a.center.x - cx) -
        Math.atan2(b.center.y - cy, b.center.x - cx),
    );
  indexed.forEach((entry, order) => {
    const districtIndex =
      blocks.length === 0
        ? 1
        : Math.min(districtCount, Math.floor((order * districtCount) / blocks.length) + 1);
    blocks[entry.index]!.districtIndex = districtIndex;
  });

  const districtLayouts: TownDistrictLayout[] = names.map((meta, index) => {
    const districtIndex = index + 1;
    const owned = blocks.filter((block) => block.districtIndex === districtIndex);
    const points = owned.flatMap((block) => block.points);
    const buildings = owned.flatMap((block) => block.buildings);
    return {
      index: districtIndex,
      name: meta.name,
      buildingType: meta.buildingType,
      bounds: boundsOf(points, { x: cx, y: cy }),
      buildings,
    };
  });

  const roadCount =
    districtCount <= 2 ? 2 : districtCount <= 4 ? 3 : districtCount <= 8 ? 4 : 5;
  const { roads, gate } = outerRoads(shape, roadCount, rng);
  const outline = shapeOutline(shape, 48, 1.015);

  const marketBounds = hasMarket
    ? { x: cx - 28, y: cy - 20, w: 56, h: 40 }
    : null;

  const land =
    effectiveTopography === "coastal"
      ? { x: VIEW * 0.1, y: VIEW * 0.08, w: VIEW * 0.8, h: VIEW * 0.58 }
      : effectiveTopography === "island"
        ? { x: VIEW * 0.12, y: VIEW * 0.12, w: VIEW * 0.76, h: VIEW * 0.76 }
        : { x: VIEW * 0.1, y: VIEW * 0.1, w: VIEW * 0.8, h: VIEW * 0.8 };

  return {
    land,
    districtLayouts,
    marketBounds,
    river,
    roads,
    gate,
    terrain,
    blocks,
    town: { cx, cy, outline },
    towers: towersOnOutline(outline),
  };
}
