import { generateBuiltinNames } from "@/lib/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  buildHoardClue,
  buildLandmarkClue,
  LANDMARK_TYPES,
  TRAVEL_FRAGMENTS,
} from "./clues";
import type {
  ResolvedLayout,
  TreasureMapInput,
  TreasureMapLayout,
  TreasureMapMarker,
  TreasureMapResult,
} from "./types";

const VIEW_W = 800;
const VIEW_H = 1000;
const EDGE = 80;
const MIN_X = EDGE;
const MAX_X = VIEW_W - EDGE;
const MIN_Y = EDGE;
const MAX_Y = VIEW_H - EDGE;

const CARDINAL_LAYOUTS: readonly ResolvedLayout[] = [
  "left-to-right",
  "top-to-bottom",
  "right-to-left",
  "bottom-to-top",
];

const NAME_CATALOGS = ["wilderness-site", "town"] as const;

function resolveLayout(layout: TreasureMapLayout, rng: SeededRng): ResolvedLayout {
  if (layout === "random") {
    return rng.pick([...CARDINAL_LAYOUTS]) ?? "left-to-right";
  }
  return layout;
}

function resolveMarkerCount(
  markerCount: TreasureMapInput["markerCount"],
  rng: SeededRng,
): number {
  if (markerCount === "random") {
    return rng.pickInt(4, 6);
  }
  return markerCount;
}

function rollPlaceNames(count: number, seed: number, rng: SeededRng): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  let guard = 0;

  while (names.length < count && guard < count * 30) {
    guard += 1;
    const catalogId =
      rng.pick([...NAME_CATALOGS] as string[]) ?? "wilderness-site";
    const nameSeed = (seed + names.length * 997 + guard) >>> 0;
    const batch = generateBuiltinNames(
      { catalogId, count: 1, seed: nameSeed },
      rng,
    );
    const candidate = batch[0];
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    names.push(candidate);
  }

  while (names.length < count) {
    names.push(`Waypoint ${names.length + 1}`);
  }

  return names;
}

function buildCoastPath(cx: number, cy: number, rng: SeededRng): string {
  const pointCount = rng.pickInt(6, 8);
  const baseRadius = rng.pickInt(300, 380);
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2 - Math.PI / 2;
    const radius = baseRadius + rng.pickInt(-70, 70);
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  if (points.length === 0) return "";

  const first = points[0]!;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  d += " Z";
  return d;
}

function baseCoordinates(
  index: number,
  count: number,
  layout: ResolvedLayout,
): { baseX: number; baseY: number } {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const spanX = MAX_X - MIN_X;
  const spanY = MAX_Y - MIN_Y;

  switch (layout) {
    case "left-to-right":
      return {
        baseX: MIN_X + t * spanX,
        baseY: MIN_Y + spanY * 0.25 + t * spanY * 0.5,
      };
    case "right-to-left":
      return {
        baseX: MAX_X - t * spanX,
        baseY: MIN_Y + spanY * 0.25 + t * spanY * 0.5,
      };
    case "top-to-bottom":
      return {
        baseX: MIN_X + spanX * 0.25 + t * spanX * 0.5,
        baseY: MIN_Y + t * spanY,
      };
    case "bottom-to-top":
      return {
        baseX: MIN_X + spanX * 0.25 + t * spanX * 0.5,
        baseY: MAX_Y - t * spanY,
      };
    default:
      return { baseX: MIN_X + t * spanX, baseY: MIN_Y + t * spanY };
  }
}

function clampCoord(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildMarkers(
  count: number,
  layout: ResolvedLayout,
  names: string[],
  hoardIndex: number,
  rng: SeededRng,
): TreasureMapMarker[] {
  const markers: TreasureMapMarker[] = [];

  for (let i = 0; i < count; i++) {
    const { baseX, baseY } = baseCoordinates(i, count, layout);
    const jitterX = rng.pickInt(-40, 40);
    const jitterY = rng.pickInt(-40, 40);
    const x = clampCoord(baseX + jitterX, MIN_X, MAX_X);
    const y = clampCoord(baseY + jitterY, MIN_Y, MAX_Y);
    markers.push({
      index: i + 1,
      name: names[i] ?? `Marker ${i + 1}`,
      baseX,
      baseY,
      x,
      y,
      isHoard: i === hoardIndex,
      clue: "",
    });
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]!;
    if (i === count - 1 && marker.isHoard) {
      const prev = markers[i - 1]?.name ?? "the last landmark";
      const fragment = rng.pick([...TRAVEL_FRAGMENTS]) ?? TRAVEL_FRAGMENTS[0]!;
      marker.clue = buildHoardClue(fragment, prev, marker.name);
    } else {
      const landmark =
        rng.pick([...LANDMARK_TYPES]) ?? LANDMARK_TYPES[0]!;
      marker.clue = buildLandmarkClue(marker.name, landmark);
    }
  }

  return markers;
}

export function generateTreasureMap(
  input: TreasureMapInput,
  rng: SeededRng,
): TreasureMapResult {
  const layout = resolveLayout(input.layout, rng);
  const markerCount = resolveMarkerCount(input.markerCount, rng);
  const hoardSlot = rng.pickInt(0, markerCount - 1);

  const names = rollPlaceNames(markerCount, input.seed, rng);
  if (hoardSlot !== markerCount - 1) {
    const last = names[markerCount - 1]!;
    names[markerCount - 1] = names[hoardSlot]!;
    names[hoardSlot] = last;
  }

  const hoardIndex = markerCount - 1;
  const markers = buildMarkers(markerCount, layout, names, hoardIndex, rng);
  const hoardName = markers[hoardIndex]?.name ?? names[0] ?? "Unknown";
  const title = `Map of ${hoardName}`;
  const coastPath = buildCoastPath(VIEW_W / 2, VIEW_H / 2 + 40, rng);
  const hoardSymbol: "star" | "cross" = rng.next() < 0.5 ? "star" : "cross";

  return {
    seed: input.seed,
    markerCount,
    layout,
    title,
    hoardIndex,
    hoardSymbol,
    coastPath,
    markers,
  };
}

export const TREASURE_MAP_VIEWBOX = { width: VIEW_W, height: VIEW_H };
