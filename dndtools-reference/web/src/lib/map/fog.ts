import { pointInPolygon } from "./permissions";
import type { MapFogRegionView, MapPoint } from "./types";

const MAX_FOG_POINTS = 64;

export function simplifyPolygon(
  points: MapPoint[],
  maxPoints = MAX_FOG_POINTS,
): MapPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: MapPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.floor(i * step)]!);
  }
  return out;
}

export function playerFogMaskPath(
  imageWidthGrid: number,
  imageHeightGrid: number,
  regions: MapFogRegionView[],
): string {
  // Full-map rect, then reveal holes (evenodd), then hide polys on top as solid.
  const parts: string[] = [
    `M 0 0 L ${imageWidthGrid} 0 L ${imageWidthGrid} ${imageHeightGrid} L 0 ${imageHeightGrid} Z`,
  ];
  for (const region of regions) {
    if (region.kind !== "reveal" || region.points.length < 3) continue;
    parts.push(polygonPath(region.points));
  }
  return parts.join(" ");
}

export function polygonPath(points: MapPoint[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first!.x} ${first!.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return `${d} Z`;
}

export function isCenterVisibleThroughFog(
  center: MapPoint,
  fogEnabled: boolean,
  regions: MapFogRegionView[],
): boolean {
  if (!fogEnabled) return true;
  const inReveal = regions.some(
    (r) => r.kind === "reveal" && pointInPolygon(center, r.points),
  );
  if (!inReveal) return false;
  const inHide = regions.some(
    (r) => r.kind === "hide" && pointInPolygon(center, r.points),
  );
  return !inHide;
}
