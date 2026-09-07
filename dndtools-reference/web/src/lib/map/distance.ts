import type { MapPoint } from "./types";

/** Distance helpers for AOE templates (feet on the grid). */

export function circleContains(
  center: MapPoint,
  radiusFeet: number,
  point: MapPoint,
  scaleFeet: number,
): boolean {
  const dx = (point.x - center.x) * scaleFeet;
  const dy = (point.y - center.y) * scaleFeet;
  return Math.hypot(dx, dy) <= radiusFeet + 1e-9;
}

export function squareContains(
  center: MapPoint,
  widthFeet: number,
  point: MapPoint,
  scaleFeet: number,
  rotationDeg = 0,
): boolean {
  const half = widthFeet / 2 / scaleFeet;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (rotationDeg === 0) {
    return Math.abs(dx) <= half + 1e-9 && Math.abs(dy) <= half + 1e-9;
  }
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return Math.abs(rx) <= half + 1e-9 && Math.abs(ry) <= half + 1e-9;
}

/**
 * 3.5e-style 90-degree cone: circular sector pointing along rotation.
 * rotation 0 = +x (right). sizeFeet is the cone length (radius).
 */
export function coneContains(
  origin: MapPoint,
  sizeFeet: number,
  rotationDeg: number,
  point: MapPoint,
  scaleFeet: number,
): boolean {
  const length = sizeFeet / scaleFeet;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > length + 1e-9) return false;
  if (dist < 1e-9) return true;
  const facing = (rotationDeg * Math.PI) / 180;
  const ang = Math.atan2(dy, dx);
  let delta = ang - facing;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta) <= Math.PI / 4 + 1e-9;
}

/** SVG path for a 90-degree circular sector (pixel space). */
export function coneSectorPath(
  origin: MapPoint,
  sizePx: number,
  rotationDeg: number,
): string {
  if (sizePx <= 0) return "";
  const rad = (rotationDeg * Math.PI) / 180;
  const a1 = rad - Math.PI / 4;
  const a2 = rad + Math.PI / 4;
  const x1 = origin.x + Math.cos(a1) * sizePx;
  const y1 = origin.y + Math.sin(a1) * sizePx;
  const x2 = origin.x + Math.cos(a2) * sizePx;
  const y2 = origin.y + Math.sin(a2) * sizePx;
  // Sweep the shorter (90°) arc from a1 to a2.
  return `M ${origin.x} ${origin.y} L ${x1} ${y1} A ${sizePx} ${sizePx} 0 0 1 ${x2} ${y2} Z`;
}

/** Round size in feet to multiples of scaleFeet when snap is on. */
export function snapSizeFeet(
  sizeFeet: number,
  scaleFeet: number,
  snap: boolean,
): number {
  const min = scaleFeet;
  if (!snap) return Math.max(min * 0.25, sizeFeet);
  const steps = Math.max(1, Math.round(sizeFeet / scaleFeet));
  return steps * scaleFeet;
}

export function formatFeetLabel(sizeFeet: number): string {
  const rounded = Math.round(sizeFeet);
  return `${rounded} ft`;
}
