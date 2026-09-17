import type { CombatAttackLine, CombatAttackMode } from "./types";

function parseMode(text: string): CombatAttackMode {
  return /ranged/i.test(text) ? "ranged" : "melee";
}

function parseBonus(text: string): number | null {
  const m = text.match(/([+-]?\d+)\s*(?:melee|ranged)?/i);
  if (!m) return null;
  return Number.parseInt(m[1], 10);
}

function parseDamage(text: string): string {
  const paren = text.match(/\(([^)]+)\)/);
  if (!paren) return "";
  let inner = paren[1].trim();
  const threat = inner.match(/\/(\d+(?:-\d+)?)/);
  if (threat) {
    inner = inner.replace(/\/(\d+(?:-\d+)?)/, "").trim();
  }
  const dmg = inner.match(/(\d+d\d+(?:[+-]\d+)?|\d+)/i);
  return dmg ? dmg[1] : inner;
}

function parseThreat(text: string): number | undefined {
  const paren = text.match(/\([^)]*\/(\d+)(?:-(\d+))?\)/);
  if (!paren) return undefined;
  const min = Number.parseInt(paren[1], 10);
  return Number.isFinite(min) ? min : undefined;
}

function parseAttackLine(line: string): CombatAttackLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const bonus = parseBonus(trimmed);
  if (bonus == null) return null;

  const nameEnd = trimmed.search(/[+-]\d/);
  const name =
    nameEnd > 0 ? trimmed.slice(0, nameEnd).trim().replace(/[,;]$/, "") : "Attack";

  return {
    name: name || "Attack",
    bonus,
    mode: parseMode(trimmed),
    damage: parseDamage(trimmed),
    threatMin: parseThreat(trimmed),
  };
}

/** Parse semicolon-separated attack lines (full attack or single attack). */
export function parseAttackLines(
  primary: string | null | undefined,
  full?: string | null,
): CombatAttackLine[] {
  const source = (full?.trim() && full !== "—" ? full : primary) ?? "";
  if (!source.trim()) return [];

  const lines = source.split(/[;]+|\band\b/i).map((s) => s.trim());
  const out: CombatAttackLine[] = [];
  for (const line of lines) {
    const parsed = parseAttackLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
}
