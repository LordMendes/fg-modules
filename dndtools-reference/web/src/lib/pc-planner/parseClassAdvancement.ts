export type ClassAdvancementRow = {
  level: number;
  bab: number;
  fort: number;
  ref: number;
  will: number;
};

type RawAdvancementRow = {
  level?: unknown;
  bab?: unknown;
  fort?: unknown;
  ref?: unknown;
  will?: unknown;
};

function parseAdvancementLevel(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const match = raw.match(/\d+/);
    if (match) return Number.parseInt(match[0], 10);
  }
  return null;
}

function parseSignedModifier(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  const normalized = raw.replace(/[−–—]/g, "-").trim();
  if (!normalized || normalized === "—" || normalized === "-") return 0;
  const match = normalized.match(/([+-]?\d+)/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10);
}

/** Primary BAB before iterative slashes (e.g. "+6/+1" → 6). */
export function parseBabValue(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  const normalized = raw.replace(/[−–—]/g, "-").trim();
  const match = normalized.match(/([+-]?\d+)/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10);
}

export function parseClassAdvancementTable(advancement: unknown): ClassAdvancementRow[] {
  if (!Array.isArray(advancement)) return [];

  const rows: ClassAdvancementRow[] = [];
  for (const raw of advancement as RawAdvancementRow[]) {
    const level = parseAdvancementLevel(raw.level);
    if (level == null || level <= 0) continue;
    rows.push({
      level,
      bab: parseBabValue(raw.bab),
      fort: parseSignedModifier(raw.fort),
      ref: parseSignedModifier(raw.ref),
      will: parseSignedModifier(raw.will),
    });
  }

  return rows.sort((a, b) => a.level - b.level);
}

export function advancementRowAtLevel(
  table: ClassAdvancementRow[],
  classLevel: number,
): ClassAdvancementRow | null {
  if (classLevel <= 0 || table.length === 0) return null;
  let best: ClassAdvancementRow | null = null;
  for (const row of table) {
    if (row.level <= classLevel) best = row;
    else break;
  }
  return best;
}
