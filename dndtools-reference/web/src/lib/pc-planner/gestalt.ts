import type {
  ClassLevelEntry,
  GestaltLevelRow,
  GestaltSide,
  PcPlanState,
} from "./types";

export function emptyGestaltSide(): GestaltSide {
  return null;
}

export function normalizeGestaltSide(raw: unknown): GestaltSide {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const classSlug = typeof rec.classSlug === "string" ? rec.classSlug.trim() : "";
  const className = typeof rec.className === "string" ? rec.className.trim() : "";
  if (!classSlug) return null;
  return { classSlug, className: className || classSlug };
}

export function normalizeGestaltLevelRow(raw: unknown): GestaltLevelRow | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  return {
    a: normalizeGestaltSide(rec.a),
    b: normalizeGestaltSide(rec.b),
  };
}

export function normalizeGestaltLevels(raw: unknown): GestaltLevelRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: GestaltLevelRow[] = [];
  for (const entry of raw) {
    const row = normalizeGestaltLevelRow(entry);
    if (!row) continue;
    // Keep empty rows so "Add level" can show Pick… before a class is chosen.
    rows.push(row);
    if (rows.length >= 20) break;
  }
  return rows;
}

/** Expand multiclass classLevels into gestalt rows (side A filled, side B empty). */
export function expandClassLevelsToGestaltRows(
  classLevels: ClassLevelEntry[],
): GestaltLevelRow[] {
  const rows: GestaltLevelRow[] = [];
  for (const cl of classLevels) {
    const level = Math.max(0, Math.trunc(cl.level));
    for (let i = 0; i < level; i++) {
      if (rows.length >= 20) return rows;
      rows.push({
        a: { classSlug: cl.classSlug, className: cl.className },
        b: null,
      });
    }
  }
  return rows;
}

/**
 * Count class levels from gestalt rows.
 * Same class on both sides of one row counts once.
 */
export function classLevelsFromGestaltRows(rows: GestaltLevelRow[]): ClassLevelEntry[] {
  const counts = new Map<string, ClassLevelEntry>();
  for (const row of rows) {
    const seen = new Set<string>();
    for (const side of [row.a, row.b] as const) {
      if (!side?.classSlug) continue;
      if (seen.has(side.classSlug)) continue;
      seen.add(side.classSlug);
      const prev = counts.get(side.classSlug);
      if (prev) {
        prev.level += 1;
      } else {
        counts.set(side.classSlug, {
          classSlug: side.classSlug,
          className: side.className,
          level: 1,
        });
      }
    }
  }
  return [...counts.values()];
}

/** Build a normal class list from one gestalt side across all rows. */
export function gestaltSideClassLevels(
  rows: GestaltLevelRow[],
  side: "a" | "b",
): ClassLevelEntry[] {
  const counts = new Map<string, ClassLevelEntry>();
  for (const row of rows) {
    const cell = row[side];
    if (!cell?.classSlug) continue;
    const prev = counts.get(cell.classSlug);
    if (prev) {
      prev.level += 1;
    } else {
      counts.set(cell.classSlug, {
        classSlug: cell.classSlug,
        className: cell.className,
        level: 1,
      });
    }
  }
  return [...counts.values()];
}

export function isGestaltActive(state: {
  identity: Pick<PcPlanState["identity"], "gestalt" | "gestaltLevels">;
}): boolean {
  return Boolean(state.identity.gestalt);
}

/** Character level: gestalt row count, else sum of class levels. */
export function characterLevelFromPlan(state: {
  identity: Pick<PcPlanState["identity"], "gestalt" | "gestaltLevels" | "classLevels">;
}): number {
  if (isGestaltActive(state)) {
    return Math.max(0, state.identity.gestaltLevels?.length ?? 0);
  }
  return state.identity.classLevels.reduce(
    (sum, cl) => sum + (cl.level > 0 ? cl.level : 0),
    0,
  );
}

/** Rebuild derived classLevels from gestalt rows when gestalt is on. */
export function syncGestaltClassLevels(state: PcPlanState): void {
  if (!state.identity.gestalt) return;
  const rows = state.identity.gestaltLevels ?? [];
  state.identity.classLevels = classLevelsFromGestaltRows(rows);
}

/** Format "Fighter 5 // Wizard 5" from derived class levels (or empty). */
export function formatGestaltClassSummary(classLevels: ClassLevelEntry[]): string {
  if (classLevels.length === 0) return "";
  return classLevels.map((cl) => `${cl.className} ${cl.level}`).join(" // ");
}

export function formatGestaltNoteLine(
  classLevels: ClassLevelEntry[],
  characterLevel: number,
): string {
  const summary = formatGestaltClassSummary(classLevels);
  if (!summary) return `Gestalt (character level ${characterLevel})`;
  return `Gestalt: ${summary} (character level ${characterLevel})`;
}

/** Collapse gestalt rows to side-A-only class levels (for turning gestalt off). */
export function classLevelsFromGestaltSideA(rows: GestaltLevelRow[]): ClassLevelEntry[] {
  return gestaltSideClassLevels(rows, "a");
}
