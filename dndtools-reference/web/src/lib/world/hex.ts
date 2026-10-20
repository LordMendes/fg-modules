export const WORLD_COLS = 64;
export const WORLD_ROWS = 40;
export const HEX_SIZE = 6;

export type Axial = { q: number; r: number };
export type Offset = { col: number; row: number };

const AXIAL_DIRS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Odd-r offset to axial (pointy-top). */
export function offsetToAxial(col: number, row: number): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

export function axialToOffset(q: number, r: number): Offset {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

export function isInBounds(col: number, row: number): boolean {
  return col >= 0 && col < WORLD_COLS && row >= 0 && row < WORLD_ROWS;
}

export function hexDistance(a: Offset, b: Offset): number {
  const aq = offsetToAxial(a.col, a.row);
  const bq = offsetToAxial(b.col, b.row);
  return (
    (Math.abs(aq.q - bq.q) +
      Math.abs(aq.q + aq.r - bq.q - bq.r) +
      Math.abs(aq.r - bq.r)) /
    2
  );
}

export function neighborOffsets(col: number, row: number): Offset[] {
  const { q, r } = offsetToAxial(col, row);
  const out: Offset[] = [];
  for (const dir of AXIAL_DIRS) {
    const o = axialToOffset(q + dir.q, r + dir.r);
    if (isInBounds(o.col, o.row)) out.push(o);
  }
  return out;
}

export function hexCenterPx(col: number, row: number, size = HEX_SIZE): { x: number; y: number } {
  const { q, r } = offsetToAxial(col, row);
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

export function hexPolygonPoints(
  col: number,
  row: number,
  size = HEX_SIZE,
): string {
  const { x: cx, y: cy } = hexCenterPx(col, row, size);
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return points.join(" ");
}

export function mapBounds(size = HEX_SIZE): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let row = 0; row < WORLD_ROWS; row++) {
    for (let col = 0; col < WORLD_COLS; col++) {
      const { x, y } = hexCenterPx(col, row, size);
      minX = Math.min(minX, x - size);
      maxX = Math.max(maxX, x + size);
      minY = Math.min(minY, y - size);
      maxY = Math.max(maxY, y + size);
    }
  }
  const pad = size * 2;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

export function cellIndex(col: number, row: number): number {
  return row * WORLD_COLS + col;
}
