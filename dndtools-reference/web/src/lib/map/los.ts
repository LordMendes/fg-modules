import type { MapOccluderView, MapPoint } from "./types";

export type Segment = { a: MapPoint; b: MapPoint };

const EPS = 1e-9;

export function segmentsFromOccluders(
  occluders: MapOccluderView[],
  options?: { includeOpen?: boolean },
): Segment[] {
  const includeOpen = options?.includeOpen ?? false;
  const segments: Segment[] = [];
  for (const o of occluders) {
    if (o.state === "open" && !includeOpen) continue;
    // Window: see-through for vision when closed (Wave 4).
    // Illusion blocks vision.
    if (o.kind === "window") continue;
    for (let i = 0; i < o.points.length - 1; i++) {
      segments.push({ a: o.points[i]!, b: o.points[i + 1]! });
    }
  }
  return segments;
}

export function movementBlockingSegments(
  occluders: MapOccluderView[],
): Segment[] {
  const segments: Segment[] = [];
  for (const o of occluders) {
    if (o.state === "open") continue;
    // Illusion does not block movement.
    if (o.kind === "illusion") continue;
    for (let i = 0; i < o.points.length - 1; i++) {
      segments.push({ a: o.points[i]!, b: o.points[i + 1]! });
    }
  }
  return segments;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

export function segmentsIntersect(s1: Segment, s2: Segment): boolean {
  const { a: p, b: p2 } = s1;
  const { a: q, b: q2 } = s2;
  const r = { x: p2.x - p.x, y: p2.y - p.y };
  const s = { x: q2.x - q.x, y: q2.y - q.y };
  const denom = cross(r.x, r.y, s.x, s.y);
  const qmp = { x: q.x - p.x, y: q.y - p.y };
  if (Math.abs(denom) < EPS) {
    if (Math.abs(cross(qmp.x, qmp.y, r.x, r.y)) > EPS) return false;
    return false;
  }
  const t = cross(qmp.x, qmp.y, s.x, s.y) / denom;
  const u = cross(qmp.x, qmp.y, r.x, r.y) / denom;
  return t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS;
}

export function rayBlocked(
  from: MapPoint,
  to: MapPoint,
  segments: Segment[],
): boolean {
  const ray: Segment = { a: from, b: to };
  for (const seg of segments) {
    if (segmentsIntersect(ray, seg)) return true;
  }
  return false;
}

export function canWalkTo(
  from: MapPoint,
  to: MapPoint,
  occluders: MapOccluderView[],
): boolean {
  const segments = movementBlockingSegments(occluders);
  return !rayBlocked(from, to, segments);
}

/**
 * Visibility polygon via radial sampling (deterministic).
 * Good enough for a few hundred wall segments.
 */
export function visibilityPolygon(
  origin: MapPoint,
  segments: Segment[],
  rangeSquares: number,
  sampleCount = 360,
): MapPoint[] {
  const points: MapPoint[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const angle = (i / sampleCount) * Math.PI * 2;
    const far: MapPoint = {
      x: origin.x + Math.cos(angle) * rangeSquares,
      y: origin.y + Math.sin(angle) * rangeSquares,
    };
    let closest = far;
    let closestDist = rangeSquares;
    for (const seg of segments) {
      const hit = raySegmentHit(origin, far, seg);
      if (hit) {
        const d = Math.hypot(hit.x - origin.x, hit.y - origin.y);
        if (d < closestDist) {
          closestDist = d;
          closest = hit;
        }
      }
    }
    points.push(closest);
  }
  return points;
}

function raySegmentHit(
  origin: MapPoint,
  far: MapPoint,
  seg: Segment,
): MapPoint | null {
  const r = { x: far.x - origin.x, y: far.y - origin.y };
  const s = { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y };
  const denom = cross(r.x, r.y, s.x, s.y);
  if (Math.abs(denom) < EPS) return null;
  const qmp = { x: seg.a.x - origin.x, y: seg.a.y - origin.y };
  const t = cross(qmp.x, qmp.y, s.x, s.y) / denom;
  const u = cross(qmp.x, qmp.y, r.x, r.y) / denom;
  if (t < EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return { x: origin.x + t * r.x, y: origin.y + t * r.y };
}

/** Default vision range in squares (60 ft / 5 ft). */
export const DEFAULT_VISION_SQUARES = 12;

export function tokenCenter(token: {
  x: number;
  y: number;
  width: number;
  height: number;
}): MapPoint {
  return { x: token.x + token.width / 2, y: token.y + token.height / 2 };
}
