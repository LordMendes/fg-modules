/** Map 3.5 size category to grid squares (space). */
export function sizeCategoryToSquares(size: string | null | undefined): number {
  if (!size) return 1;
  const s = size.trim().toLowerCase();
  if (s.includes("colossal")) return 6;
  if (s.includes("gargantuan")) return 4;
  if (s.includes("huge")) return 3;
  if (s.includes("large")) return 2;
  return 1;
}

/** Parse feet from strings like "5 ft.", "10 ft", "5". */
export function parseFeet(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse "5 ft./10 ft." or "5 ft./5 ft." into space squares and reach feet. */
export function parseSpaceReachString(spaceReach: string | null | undefined): {
  spaceSquares: number;
  reachFeet: number;
} {
  const fallback = { spaceSquares: 1, reachFeet: 5 };
  if (!spaceReach?.trim()) return fallback;

  const parts = spaceReach.split("/").map((p) => p.trim());
  const spaceFt = parseFeet(parts[0]) ?? 5;
  const reachFt = parseFeet(parts[1] ?? parts[0]) ?? spaceFt;

  const scaleFeet = 5;
  const spaceSquares = Math.max(1, Math.round(spaceFt / scaleFeet));
  return { spaceSquares, reachFeet: reachFt };
}

export function reachFeetToSquares(reachFeet: number, scaleFeet = 5): number {
  return Math.max(1, Math.round(reachFeet / scaleFeet));
}
