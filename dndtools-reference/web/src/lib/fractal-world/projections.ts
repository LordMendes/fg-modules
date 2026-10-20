import type { FractalInput, FractalProjection } from "./types";

const DEG = Math.PI / 180;
const MERCATOR_LAT_LIMIT = 85;

export type GeoSample = { lat: number; lon: number; face?: number };

export function outputDimensions(input: Pick<FractalInput, "projection" | "height">): {
  width: number;
  height: number;
} {
  const h = input.height;
  const wide: FractalProjection[] = [
    "square",
    "mercator",
    "transverse-mercator",
    "mollweide",
    "sinusoidal",
  ];
  if (wide.includes(input.projection)) {
    return { width: h * 2, height: h };
  }
  return { width: h, height: h };
}

function mercatorLatFromY(yNorm: number): number {
  const latRad = Math.atan(Math.sinh(yNorm * Math.PI));
  const lat = (latRad * 180) / Math.PI;
  if (lat > MERCATOR_LAT_LIMIT || lat < -MERCATOR_LAT_LIMIT) return NaN;
  return lat;
}

function mercatorLonFromX(xNorm: number): number {
  return xNorm * 180;
}

function lonFromXWide(x: number, width: number): number {
  const xNorm = (x + 0.5) / width - 0.5;
  return xNorm * 360;
}

function latFromYEqui(y: number, height: number): number {
  const yNorm = (y + 0.5) / height - 0.5;
  return -yNorm * 180;
}

/** Inverse equirectangular; y increases downward. */
export function inverseSquare(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  return {
    lat: latFromYEqui(y, height),
    lon: lonFromXWide(x, width),
  };
}

export function inverseMercator(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const lon = mercatorLonFromX((x + 0.5) / width - 0.5);
  const yNorm = 1 - (y + 0.5) / height;
  const lat = mercatorLatFromY(yNorm * 2 - 1);
  if (Number.isNaN(lat)) return null;
  return { lat, lon };
}

/** Spherical transverse Mercator inverse. x runs 0..2π, y is conformal easting. */
export function inverseTransverseMercator(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const f = ((x + 0.5) / width) * 2 * Math.PI;
  const l = ((y + 0.5 - height / 2) * 2 * Math.PI) / width;
  const cosF = Math.cos(f);
  let lonRad = Math.atan(Math.sinh(l) / (cosF === 0 ? Number.EPSILON : cosF));
  if (f > Math.PI / 2 && f <= (3 * Math.PI) / 2) {
    lonRad += Math.PI;
  }
  const sinLat = Math.sin(f) / Math.cosh(l);
  if (!Number.isFinite(sinLat)) return null;
  const latRad = Math.asin(Math.max(-1, Math.min(1, sinLat)));
  return {
    lat: (latRad * 180) / Math.PI,
    lon: (lonRad * 180) / Math.PI,
  };
}

export function inverseMollweide(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const xNorm = ((x + 0.5) / width) * 2 - 1;
  const yNorm = ((y + 0.5) / height) * 2 - 1;
  const rx = Math.SQRT2;
  const ry = Math.SQRT1_2;
  if ((xNorm / rx) ** 2 + (yNorm / ry) ** 2 > 1 + 1e-6) return null;
  const theta = Math.asin(Math.max(-1, Math.min(1, yNorm / ry)));
  const latRad = Math.asin((2 * theta + Math.sin(2 * theta)) / Math.PI);
  const cosLat = Math.cos(latRad);
  if (Math.abs(cosLat) < 1e-8) return null;
  const lonRad = (Math.PI * xNorm) / (2 * Math.SQRT2 * cosLat);
  return {
    lat: (latRad * 180) / Math.PI,
    lon: (lonRad * 180) / Math.PI,
  };
}

export function inverseSinusoidal(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const lat = latFromYEqui(y, height);
  const latRad = lat * DEG;
  const cosLat = Math.cos(latRad);
  if (Math.abs(cosLat) < 1e-6) return null;
  const xNorm = ((x + 0.5) / width - 0.5) * Math.PI;
  const lonRad = xNorm / cosLat;
  if (Math.abs(lonRad) > Math.PI + 1e-6) return null;
  return { lat, lon: (lonRad * 180) / Math.PI };
}

export function inverseSpherical(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const r = Math.min(width, height) / 2;
  const nx = (x - cx) / r;
  const ny = (cy - y) / r;
  const rho2 = nx * nx + ny * ny;
  if (rho2 > 1 + 1e-6) return null;
  const nz = Math.sqrt(Math.max(0, 1 - rho2));
  const lat = Math.asin(Math.max(-1, Math.min(1, ny))) * (180 / Math.PI);
  const lon = Math.atan2(nx, nz) * (180 / Math.PI);
  return { lat, lon };
}

function inversePolar(
  x: number,
  y: number,
  width: number,
  height: number,
  mode: "orthographic" | "stereographic" | "gnomonic",
): GeoSample | null {
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const r = Math.min(width, height) / 2;
  const nx = (x - cx) / r;
  const ny = (cy - y) / r;
  const rho = Math.sqrt(nx * nx + ny * ny);
  if (rho > 1 + 1e-6) return null;

  let colatDeg: number;
  if (mode === "orthographic") {
    if (rho > 1) return null;
    colatDeg = rho * 90;
  } else if (mode === "stereographic") {
    colatDeg = 2 * Math.atan(rho) * (180 / Math.PI);
    if (colatDeg > 170 + 1e-6) return null;
  } else {
    colatDeg = Math.atan(rho) * (180 / Math.PI);
    if (colatDeg > 80 + 1e-6) return null;
  }

  const lat = 90 - colatDeg;
  const lon = (Math.atan2(ny, nx) * 180) / Math.PI;
  return { lat, lon };
}

const PHI = (1 + Math.sqrt(5)) / 2;

const ICO_VERTS: readonly [number, number, number][] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
].map(([a, b, c]) => {
  const len = Math.sqrt(a * a + b * b + c * c);
  return [a / len, b / len, c / len] as [number, number, number];
});

const ICO_FACES: readonly [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

type NetTri = {
  face: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
};

/** Unfolded icosahedron net scaled to the unit square (5 by 3 strip of triangles). */
function buildIcosaNet(): NetTri[] {
  const tris: NetTri[] = [];
  const cols = 5;
  const cellW = 1 / cols;
  const rowH = 1 / 3;
  let face = 0;
  for (let col = 0; col < cols; col++) {
    const x0 = col * cellW;
    tris.push({
      face: face++,
      ax: x0,
      ay: rowH,
      bx: x0 + cellW,
      by: rowH,
      cx: x0 + cellW / 2,
      cy: 0,
    });
  }
  for (let col = 0; col < cols; col++) {
    const x0 = col * cellW;
    tris.push({
      face: face++,
      ax: x0,
      ay: rowH,
      bx: x0 + cellW,
      by: rowH,
      cx: x0 + cellW / 2,
      cy: 2 * rowH,
    });
  }
  for (let col = 0; col < cols - 1; col++) {
    const x0 = col * cellW;
    tris.push({
      face: face++,
      ax: x0 + cellW / 2,
      ay: rowH,
      bx: x0 + cellW,
      by: rowH,
      cx: x0 + cellW,
      cy: 2 * rowH,
    });
  }
  tris.push({
    face: face++,
    ax: 0,
    ay: rowH,
    bx: cellW / 2,
    by: rowH,
    cx: 0,
    cy: 2 * rowH,
  });
  for (let col = 0; col < cols; col++) {
    const x0 = col * cellW;
    tris.push({
      face: face++,
      ax: x0,
      ay: 2 * rowH,
      bx: x0 + cellW,
      by: 2 * rowH,
      cx: x0 + cellW / 2,
      cy: rowH,
    });
  }
  return tris.slice(0, 20);
}

const ICO_NET = buildIcosaNet();

function barycentricInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): { u: number; v: number; w: number } | null {
  const v0x = bx - ax;
  const v0y = by - ay;
  const v1x = cx - ax;
  const v1y = cy - ay;
  const v2x = px - ax;
  const v2y = py - ay;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const denom = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denom) < 1e-12) return null;
  const inv = 1 / denom;
  const v = (dot11 * dot02 - dot01 * dot12) * inv;
  const w = (dot00 * dot12 - dot01 * dot02) * inv;
  const u = 1 - v - w;
  if (u < -1e-5 || v < -1e-5 || w < -1e-5) return null;
  return { u, v, w };
}

export function inverseIcosahedral(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoSample | null {
  const px = (x + 0.5) / width;
  const py = (y + 0.5) / height;
  for (const tri of ICO_NET) {
    const bc = barycentricInTriangle(
      px,
      py,
      tri.ax,
      tri.ay,
      tri.bx,
      tri.by,
      tri.cx,
      tri.cy,
    );
    if (!bc) continue;
    const [i0, i1, i2] = ICO_FACES[tri.face]!;
    const v0 = ICO_VERTS[i0]!;
    const v1 = ICO_VERTS[i1]!;
    const v2 = ICO_VERTS[i2]!;
    let sx = bc.u * v0[0] + bc.v * v1[0] + bc.w * v2[0];
    let sy = bc.u * v0[1] + bc.v * v1[1] + bc.w * v2[1];
    let sz = bc.u * v0[2] + bc.v * v1[2] + bc.w * v2[2];
    const len = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    sx /= len;
    sy /= len;
    sz /= len;
    const lat = Math.asin(Math.max(-1, Math.min(1, sy))) * (180 / Math.PI);
    const lon = Math.atan2(sx, sz) * (180 / Math.PI);
    return { lat, lon, face: tri.face };
  }
  return null;
}

export function inverseProjection(
  projection: FractalProjection,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
): GeoSample | null {
  switch (projection) {
    case "square":
      return inverseSquare(x, y, width, height);
    case "mercator":
      return inverseMercator(x, y, width, height);
    case "transverse-mercator":
      return inverseTransverseMercator(x, y, width, height);
    case "mollweide":
      return inverseMollweide(x, y, width, height);
    case "sinusoidal":
      return inverseSinusoidal(x, y, width, height);
    case "spherical":
      return inverseSpherical(x, y, width, height);
    case "icosahedral":
      return inverseIcosahedral(x, y, width, height);
    case "polar-orthographic":
      return inversePolar(x, y, width, height, "orthographic");
    case "polar-stereographic":
      return inversePolar(x, y, width, height, "stereographic");
    case "polar-gnomonic":
      return inversePolar(x, y, width, height, "gnomonic");
  }
}
