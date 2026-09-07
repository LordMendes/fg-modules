/**
 * Universal VTT / Dungeondraft dd2vtt parser.
 * Spec: https://github.com/devaloka/universal-vtt (informal)
 */

import type { MapOccluderKind, MapOccluderState, MapPoint } from "./types";

export type UvttParseResult = {
  imageBase64: string;
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  imageWidth: number;
  imageHeight: number;
  occluders: {
    kind: MapOccluderKind;
    points: MapPoint[];
    state: MapOccluderState;
  }[];
  lights: {
    x: number;
    y: number;
    brightFeet: number;
    dimFeet: number;
    color: string;
  }[];
};

type UvttJson = {
  format?: number;
  resolution?: {
    map_origin?: { x?: number; y?: number };
    map_size?: { x?: number; y?: number };
    pixels_per_grid?: number;
  };
  line_of_sight?: number[][][];
  objects_line_of_sight?: number[][][];
  portals?: {
    position?: { x?: number; y?: number };
    bounds?: number[][];
    closed?: boolean;
  }[];
  lights?: {
    position?: { x?: number; y?: number };
    range?: number;
    intensity?: number;
    color?: string;
  }[];
  image?: string;
};

function asPoint(pair: number[]): MapPoint | null {
  if (pair.length < 2) return null;
  const x = pair[0];
  const y = pair[1];
  if (typeof x !== "number" || typeof y !== "number") return null;
  return { x, y };
}

export function parseUvtt(raw: string): UvttParseResult {
  let data: UvttJson;
  try {
    data = JSON.parse(raw) as UvttJson;
  } catch {
    throw new Error("File is not valid UVTT JSON");
  }

  if (!data.image || typeof data.image !== "string") {
    throw new Error("UVTT file is missing an embedded image");
  }

  const ppg = data.resolution?.pixels_per_grid;
  if (typeof ppg !== "number" || !(ppg > 0)) {
    throw new Error("UVTT file is missing pixels_per_grid");
  }

  const origin = data.resolution?.map_origin;
  const gridOffsetX = (origin?.x ?? 0) * ppg;
  const gridOffsetY = (origin?.y ?? 0) * ppg;
  const mapSize = data.resolution?.map_size;
  const imageWidth = Math.round((mapSize?.x ?? 0) * ppg) || 0;
  const imageHeight = Math.round((mapSize?.y ?? 0) * ppg) || 0;

  const occluders: UvttParseResult["occluders"] = [];

  const losPolys = [
    ...(data.line_of_sight ?? []),
    ...(data.objects_line_of_sight ?? []),
  ];
  for (const poly of losPolys) {
    const points: MapPoint[] = [];
    for (const pair of poly) {
      const p = asPoint(pair);
      if (p) points.push(p);
    }
    if (points.length >= 2) {
      occluders.push({ kind: "wall", points, state: "closed" });
    }
  }

  for (const portal of data.portals ?? []) {
    const bounds = portal.bounds ?? [];
    const points: MapPoint[] = [];
    for (const pair of bounds) {
      const p = asPoint(pair);
      if (p) points.push(p);
    }
    if (points.length < 2 && portal.position) {
      // Degenerate: single point door, skip
      continue;
    }
    if (points.length >= 2) {
      occluders.push({
        kind: "door",
        points,
        state: portal.closed === false ? "open" : "closed",
      });
    }
  }

  const lights: UvttParseResult["lights"] = [];
  for (const light of data.lights ?? []) {
    const x = light.position?.x;
    const y = light.position?.y;
    if (typeof x !== "number" || typeof y !== "number") continue;
    const range = typeof light.range === "number" ? light.range : 20;
    lights.push({
      x,
      y,
      brightFeet: range * 5,
      dimFeet: range * 5,
      color: typeof light.color === "string" ? light.color : "#ffd8a8",
    });
  }

  // Strip data-url prefix if present
  let imageBase64 = data.image;
  const comma = imageBase64.indexOf(",");
  if (imageBase64.startsWith("data:") && comma >= 0) {
    imageBase64 = imageBase64.slice(comma + 1);
  }

  return {
    imageBase64,
    gridSizePx: ppg,
    gridOffsetX,
    gridOffsetY,
    imageWidth,
    imageHeight,
    occluders,
    lights,
  };
}
