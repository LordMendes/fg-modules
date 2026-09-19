import { parseDamageType } from "../effects/grammar";
import type { DamageType, Defenses } from "../types";

function finiteInt(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseBypassList(raw: string): DamageType[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return [];

  const types: DamageType[] = [];
  for (const part of trimmed.split(/\s+(?:or|and)\s+|,\s*/i)) {
    const token = part.trim();
    if (!token) continue;
    const dmg = parseDamageType(token);
    if (dmg && !types.includes(dmg)) types.push(dmg);
  }
  return types;
}

function parseDamageTypesList(raw: string): DamageType[] {
  const types: DamageType[] = [];
  for (const part of raw.split(/\s+(?:or|and)\s+|,\s*/i)) {
    const token = part.trim();
    if (!token) continue;
    const dmg = parseDamageType(token);
    if (dmg && !types.includes(dmg)) types.push(dmg);
  }
  return types;
}

function mergeResist(
  target: Partial<Record<DamageType, number>>,
  type: DamageType,
  amount: number,
): void {
  const prev = target[type];
  if (prev == null || amount > prev) target[type] = amount;
}

function parseResistPhrases(text: string, resist: Partial<Record<DamageType, number>>): void {
  const combined =
    /(?:^|[;.]|\s)(?:resist(?:ance)?(?:\s+to)?\s+)([^.;]+)/gi;
  for (const match of text.matchAll(combined)) {
    parseResistList(match[1] ?? "", resist);
  }

  const typedAmount =
    /\b(acid|cold|electricity|elec|fire|sonic)\s+(\d+)\b/gi;
  for (const match of text.matchAll(typedAmount)) {
    const type = parseDamageType(match[1] ?? "");
    const amount = finiteInt(match[2] ?? "");
    if (type && amount != null) mergeResist(resist, type, amount);
  }

  const sharedResistance =
    /\b(acid|cold|electricity|elec|fire|sonic)(?:\s+and\s+(acid|cold|electricity|elec|fire|sonic))+\s+resist(?:ance)?\s+(\d+)/gi;
  for (const match of text.matchAll(sharedResistance)) {
    const amount = finiteInt(match[match.length - 1] ?? "");
    if (amount == null) continue;
    const chunk = match[0] ?? "";
    for (const typeMatch of chunk.matchAll(/\b(acid|cold|electricity|elec|fire|sonic)\b/gi)) {
      const type = parseDamageType(typeMatch[1] ?? "");
      if (type) mergeResist(resist, type, amount);
    }
  }
}

function parseResistList(raw: string, resist: Partial<Record<DamageType, number>>): void {
  const chunks = raw.split(/,\s*/);
  for (const chunk of chunks) {
    const pair = chunk.trim().match(/^(\w+)\s+(\d+)$/i);
    if (pair) {
      const type = parseDamageType(pair[1] ?? "");
      const amount = finiteInt(pair[2] ?? "");
      if (type && amount != null) mergeResist(resist, type, amount);
      continue;
    }

    const reverse = chunk.trim().match(/^(\d+)\s+(\w+)$/i);
    if (reverse) {
      const amount = finiteInt(reverse[1] ?? "");
      const type = parseDamageType(reverse[2] ?? "");
      if (type && amount != null) mergeResist(resist, type, amount);
    }
  }
}

function parseImmunePhrases(text: string, immune: DamageType[]): void {
  const pattern = /\bimmun(?:ity)?(?:\s+to)?\s+([^.;]+)/gi;
  for (const match of text.matchAll(pattern)) {
    for (const type of parseDamageTypesList(match[1] ?? "")) {
      if (!immune.includes(type)) immune.push(type);
    }
  }
}

function parseVulnPhrases(text: string, vuln: DamageType[]): void {
  const pattern = /\bvulnerab(?:le|ility)(?:\s+to)?\s+([^.;]+)/gi;
  for (const match of text.matchAll(pattern)) {
    for (const type of parseDamageTypesList(match[1] ?? "")) {
      if (!vuln.includes(type)) vuln.push(type);
    }
  }
}

function parseDrPhrases(text: string, dr: { amount: number; bypass: DamageType[] }[]): void {
  const pattern = /\bDR\s+(\d+)\s*(?:\/\s*([^;,]+))?/gi;
  for (const match of text.matchAll(pattern)) {
    const amount = finiteInt(match[1] ?? "");
    if (amount == null) continue;
    dr.push({
      amount,
      bypass: parseBypassList(match[2] ?? ""),
    });
  }

  const longForm = /\bdamage reduction\s+(\d+)\s*(?:\/\s*([^;,]+))?/gi;
  for (const match of text.matchAll(longForm)) {
    const amount = finiteInt(match[1] ?? "");
    if (amount == null) continue;
    dr.push({
      amount,
      bypass: parseBypassList(match[2] ?? ""),
    });
  }
}

function parseSr(text: string): number | null {
  const match =
    text.match(/\bSR\s+(\d+)\b/i) ??
    text.match(/\bspell resistance\s+(\d+)\b/i);
  if (!match) return null;
  return finiteInt(match[1] ?? "");
}

function parseRegen(text: string): { amount: number; bypass: DamageType[] } | null {
  const match = text.match(/\bregeneration\s+(\d+)(?:\s*\(([^)]+)\))?/i);
  if (!match) return null;
  const amount = finiteInt(match[1] ?? "");
  if (amount == null) return null;
  return {
    amount,
    bypass: parseBypassList(match[2] ?? ""),
  };
}

function parseFastHeal(text: string): number | null {
  const match = text.match(/\bfast healing\s+(\d+)\b/i);
  if (!match) return null;
  return finiteInt(match[1] ?? "");
}

/** Parse FG-style defense phrases into structured defenses. */
export function parseDefensesText(text: string): Defenses {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return {};

  const dr: { amount: number; bypass: DamageType[] }[] = [];
  const resist: Partial<Record<DamageType, number>> = {};
  const immune: DamageType[] = [];
  const vuln: DamageType[] = [];

  parseDrPhrases(normalized, dr);
  parseResistPhrases(normalized, resist);
  parseImmunePhrases(normalized, immune);
  parseVulnPhrases(normalized, vuln);

  const sr = parseSr(normalized);
  const regen = parseRegen(normalized);
  const fastHeal = parseFastHeal(normalized);

  const out: Defenses = {};
  if (dr.length > 0) out.dr = dr;
  if (Object.keys(resist).length > 0) out.resist = resist;
  if (immune.length > 0) out.immune = immune;
  if (vuln.length > 0) out.vuln = vuln;
  if (sr != null) out.sr = sr;
  if (regen) out.regen = regen;
  if (fastHeal != null) out.fastHeal = fastHeal;
  return out;
}

/** Merge defense phrases from multiple stat-block fragments. */
export function parseDefensesFromParts(
  ...parts: (string | null | undefined)[]
): Defenses {
  const text = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("; ");
  return parseDefensesText(text);
}
