import { fractalValueNoise3d } from "@/lib/world/noise";
import type { SurfaceKind } from "./types";

const DEG = Math.PI / 180;

export type HeightThresholds = {
  sea: number;
  ice: number;
  highland: number;
};

function normalizeLon(lon: number): number {
  let l = lon % 360;
  if (l > 180) l -= 360;
  if (l < -180) l += 360;
  return l;
}

export function sampleGlobeHeight(
  seed: number,
  latDeg: number,
  lonDeg: number,
  rotation: number,
  iterations: number,
): number {
  const lon = normalizeLon(lonDeg + rotation);
  const latRad = latDeg * DEG;
  const lonRad = lon * DEG;
  const nx = Math.cos(latRad) * Math.cos(lonRad) * 2;
  const ny = Math.cos(latRad) * Math.sin(lonRad) * 2;
  const nz = Math.sin(latRad) * 2;
  return fractalValueNoise3d(seed, nx, ny, nz, iterations);
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

export function buildHeightThresholds(
  seed: number,
  water: number,
  ice: number,
  iterations: number,
  rotation: number,
): HeightThresholds {
  const cols = 180;
  const rows = 90;
  const heights: number[] = [];
  for (let row = 0; row < rows; row++) {
    const lat = 90 - ((row + 0.5) / rows) * 180;
    for (let col = 0; col < cols; col++) {
      const lon = ((col + 0.5) / cols) * 360 - 180;
      heights.push(sampleGlobeHeight(seed, lat, lon, rotation, iterations));
    }
  }
  const sorted = [...heights].sort((a, b) => a - b);
  const sea = percentileThreshold(sorted, water);
  const landHeights = heights.filter((h) => h >= sea).sort((a, b) => a - b);
  const iceTarget = Math.round((landHeights.length * ice) / 100);
  const iceThreshold =
    iceTarget > 0 && landHeights.length > 0
      ? landHeights[Math.min(landHeights.length - 1, landHeights.length - iceTarget)]!
      : Infinity;
  const belowIce = landHeights.filter((h) => h < iceThreshold);
  const highland = percentileThreshold(
    belowIce.length ? belowIce : landHeights,
    80,
  );
  return { sea, ice: iceThreshold, highland };
}

export function classifyHeight(
  height: number,
  thresholds: HeightThresholds,
): SurfaceKind {
  if (height < thresholds.sea) return "sea";
  if (height >= thresholds.ice) return "ice";
  if (height >= thresholds.highland) return "highland";
  return "lowland";
}

export function measureEquirectWaterRatio(
  seed: number,
  water: number,
  ice: number,
  iterations: number,
  rotation: number,
): number {
  const thresholds = buildHeightThresholds(
    seed,
    water,
    ice,
    iterations,
    rotation,
  );
  const cols = 180;
  const rows = 90;
  let sea = 0;
  let total = 0;
  for (let row = 0; row < rows; row++) {
    const lat = 90 - ((row + 0.5) / rows) * 180;
    for (let col = 0; col < cols; col++) {
      const lon = ((col + 0.5) / cols) * 360 - 180;
      const h = sampleGlobeHeight(seed, lat, lon, rotation, iterations);
      if (classifyHeight(h, thresholds) === "sea") sea += 1;
      total += 1;
    }
  }
  return (sea / total) * 100;
}
