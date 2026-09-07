import type { MapDiagonalRule, MapPoint, MapSnapMode } from "./types";

export type GridConfig = {
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
};

export function pixelsToGrid(
  px: number,
  py: number,
  grid: GridConfig,
): MapPoint {
  return {
    x: (px - grid.gridOffsetX) / grid.gridSizePx,
    y: (py - grid.gridOffsetY) / grid.gridSizePx,
  };
}

export function gridToPixels(
  gx: number,
  gy: number,
  grid: GridConfig,
): MapPoint {
  return {
    x: grid.gridOffsetX + gx * grid.gridSizePx,
    y: grid.gridOffsetY + gy * grid.gridSizePx,
  };
}

export function snapToGrid(
  x: number,
  y: number,
  mode: MapSnapMode,
): MapPoint {
  if (mode === "off") return { x, y };
  if (mode === "corner") {
    return { x: Math.round(x), y: Math.round(y) };
  }
  // center: snap top-left so the token center lands on a square center
  return {
    x: Math.floor(x) + 0.0,
    y: Math.floor(y) + 0.0,
  };
}

/** Snap a token footprint (top-left) so its center sits on a square center. */
export function snapTokenTopLeft(
  x: number,
  y: number,
  width: number,
  height: number,
  mode: MapSnapMode,
): MapPoint {
  if (mode === "off") return { x, y };
  if (mode === "corner") {
    return { x: Math.round(x), y: Math.round(y) };
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  const snappedCx = Math.floor(cx) + 0.5;
  const snappedCy = Math.floor(cy) + 0.5;
  return {
    x: snappedCx - width / 2,
    y: snappedCy - height / 2,
  };
}

/** Chebyshev / 5-5-5 diagonal: max(|dx|, |dy|) squares. */
export function chebyshevSquares(dx: number, dy: number): number {
  return Math.max(Math.abs(dx), Math.abs(dy));
}

/**
 * 3.5e 5-10-5 diagonal: odd diagonals cost scaleFeet, even cost 2*scaleFeet.
 * Returns distance in feet given scaleFeet per square.
 */
export function threeFiveDiagonalFeet(
  dx: number,
  dy: number,
  scaleFeet = 5,
): number {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const diagonal = Math.min(adx, ady);
  const straight = Math.max(adx, ady) - diagonal;
  // n diagonals: n * scale + floor(n/2) * scale  (= 5+10+5+10...)
  const diagonalFeet =
    diagonal * scaleFeet + Math.floor(diagonal / 2) * scaleFeet;
  return diagonalFeet + straight * scaleFeet;
}

export function euclideanFeet(
  dx: number,
  dy: number,
  scaleFeet = 5,
): number {
  return Math.hypot(dx, dy) * scaleFeet;
}

export function distanceFeet(
  from: MapPoint,
  to: MapPoint,
  rule: MapDiagonalRule,
  scaleFeet = 5,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (rule === "555") return chebyshevSquares(dx, dy) * scaleFeet;
  if (rule === "euclid") return euclideanFeet(dx, dy, scaleFeet);
  return threeFiveDiagonalFeet(dx, dy, scaleFeet);
}

export function polylineFeet(
  points: MapPoint[],
  rule: MapDiagonalRule,
  scaleFeet = 5,
): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceFeet(points[i - 1]!, points[i]!, rule, scaleFeet);
  }
  return total;
}

export function asDiagonalRule(value: string): MapDiagonalRule {
  if (value === "555" || value === "euclid" || value === "5105") return value;
  return "5105";
}
