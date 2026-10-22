/** Smooth interpolation weight for value noise (0–1 in, 0–1 out). */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Deterministic hash at integer lattice points; returns 0–1. */
export function hash2d(seed: number, ix: number, iy: number): number {
  let h = (seed >>> 0) ^ Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Bilinear value noise with smoothstep interpolation. */
export function valueNoise2d(seed: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const v00 = hash2d(seed, x0, y0);
  const v10 = hash2d(seed, x0 + 1, y0);
  const v01 = hash2d(seed, x0, y0 + 1);
  const v11 = hash2d(seed, x0 + 1, y0 + 1);
  const vx0 = v00 + (v10 - v00) * tx;
  const vx1 = v01 + (v11 - v01) * tx;
  return vx0 + (vx1 - vx0) * ty;
}

/** Fractal sum of value noise (default 4 octaves). */
export function fractalValueNoise2d(
  seed: number,
  x: number,
  y: number,
  octaves = 4,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let o = 0; o < octaves; o++) {
    value +=
      valueNoise2d((seed + o * 1013) >>> 0, x * frequency, y * frequency) *
      amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

/** Deterministic hash at integer lattice points in 3D; returns 0–1. */
export function hash3d(
  seed: number,
  ix: number,
  iy: number,
  iz: number,
): number {
  let h =
    (seed >>> 0) ^
    Math.imul(ix | 0, 374761393) ^
    Math.imul(iy | 0, 668265263) ^
    Math.imul(iz | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Trilinear value noise with smoothstep interpolation. */
export function valueNoise3d(
  seed: number,
  x: number,
  y: number,
  z: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const tz = smoothstep(z - z0);
  const v000 = hash3d(seed, x0, y0, z0);
  const v100 = hash3d(seed, x0 + 1, y0, z0);
  const v010 = hash3d(seed, x0, y0 + 1, z0);
  const v110 = hash3d(seed, x0 + 1, y0 + 1, z0);
  const v001 = hash3d(seed, x0, y0, z0 + 1);
  const v101 = hash3d(seed, x0 + 1, y0, z0 + 1);
  const v011 = hash3d(seed, x0, y0 + 1, z0 + 1);
  const v111 = hash3d(seed, x0 + 1, y0 + 1, z0 + 1);
  const vx00 = v000 + (v100 - v000) * tx;
  const vx10 = v010 + (v110 - v010) * tx;
  const vx01 = v001 + (v101 - v001) * tx;
  const vx11 = v011 + (v111 - v011) * tx;
  const vxy0 = vx00 + (vx10 - vx00) * ty;
  const vxy1 = vx01 + (vx11 - vx01) * ty;
  return vxy0 + (vxy1 - vxy0) * tz;
}

/** Fractal sum of 3D value noise (default 4 octaves). */
export function fractalValueNoise3d(
  seed: number,
  x: number,
  y: number,
  z: number,
  octaves = 4,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let o = 0; o < octaves; o++) {
    value +=
      valueNoise3d(
        (seed + o * 1013) >>> 0,
        x * frequency,
        y * frequency,
        z * frequency,
      ) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}
