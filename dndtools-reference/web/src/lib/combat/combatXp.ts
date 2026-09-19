import { parseCr } from "@/lib/encounter/parseCr";
import { xpForCR } from "@/lib/encounter/xpTable";

export type DefeatedNpcXpRow = {
  combatantId: string;
  name: string;
  cr: number | null;
  crLabel: string | null;
  xpPerPc: number;
  selected: boolean;
};

/** SRD table assumes party of 4; scale XP per PC for other sizes. */
export function scaleXpForPartySize(
  xpPerPcBase: number,
  partySize: number,
): number {
  if (partySize <= 0) return 0;
  return Math.round((xpPerPcBase * 4) / partySize);
}

export function crFromNpcSnapshot(snapshot: unknown): {
  cr: number | null;
  label: string | null;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { cr: null, label: null };
  }
  const s = snapshot as Record<string, unknown>;
  const raw =
    (typeof s.challengeRating === "string" && s.challengeRating) ||
    (typeof s.cr === "string" && s.cr) ||
    null;
  const cr = parseCr(raw);
  return { cr, label: raw };
}

export function computeDefeatedNpcXpRows(
  npcs: Array<{
    id: string;
    name: string;
    deathState: string | null;
    turnState: string;
    snapshot: unknown;
  }>,
  partySize: number,
): DefeatedNpcXpRow[] {
  return npcs
    .filter(
      (n) =>
        n.deathState === "dead" ||
        n.turnState === "dead" ||
        n.deathState === "dying",
    )
    .map((n) => {
      const { cr, label } = crFromNpcSnapshot(n.snapshot);
      const base = cr != null ? xpForCR(cr) : 0;
      return {
        combatantId: n.id,
        name: n.name,
        cr,
        crLabel: label,
        xpPerPc: scaleXpForPartySize(base, partySize),
        selected: true,
      };
    });
}

export function sumSelectedXp(rows: DefeatedNpcXpRow[]): number {
  return rows.filter((r) => r.selected).reduce((s, r) => s + r.xpPerPc, 0);
}

export function averagePartyLevel(
  pcs: Array<{ state: unknown }>,
): number {
  if (pcs.length === 0) return 1;
  let total = 0;
  let count = 0;
  for (const pc of pcs) {
    const state = pc.state as {
      identity?: { classLevels?: Array<{ level: number }> };
    } | null;
    const levels = state?.identity?.classLevels ?? [];
    const level = levels.reduce((sum, row) => sum + (row.level ?? 0), 0);
    if (level > 0) {
      total += level;
      count += 1;
    }
  }
  if (count === 0) return 1;
  return Math.round(total / count);
}
