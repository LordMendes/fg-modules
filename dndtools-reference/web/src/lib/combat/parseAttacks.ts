import { parseDamageType } from "./effects/grammar";
import type {
  CombatAttackLine,
  CombatAttackMode,
  CombatAttackType,
  DamageType,
} from "./types";

const WEAPON_DAMAGE_TYPES: Record<string, DamageType[]> = {
  longsword: ["slashing"],
  scimitar: ["slashing"],
  greatsword: ["slashing"],
  shortsword: ["piercing"],
  rapier: ["piercing"],
  spear: ["piercing"],
  dagger: ["piercing"],
  mace: ["bludgeoning"],
  club: ["bludgeoning"],
  quarterstaff: ["bludgeoning"],
  bite: ["piercing", "bludgeoning"],
  claw: ["slashing", "piercing"],
  talon: ["slashing", "piercing"],
  gore: ["piercing"],
  slam: ["bludgeoning"],
  hoof: ["bludgeoning"],
  stomp: ["bludgeoning"],
  tail: ["bludgeoning"],
  sting: ["piercing"],
  tentacle: ["bludgeoning"],
  wing: ["bludgeoning"],
};

function parseMode(text: string): CombatAttackMode {
  return /ranged/i.test(text) ? "ranged" : "melee";
}

function parseBonuses(text: string): number[] {
  const withoutDamage = text.replace(/\([^)]*\)/g, " ").trim();
  const match = withoutDamage.match(/([+-]\d+(?:\/[+-]\d+)*)\s*(?:melee|ranged\b|$)/i);
  if (match?.[1]) {
    return match[1]
      .split("/")
      .map((part) => Number.parseInt(part, 10))
      .filter((value) => Number.isFinite(value));
  }

  const fallback = withoutDamage.match(/([+-]?\d+)\s*(?:melee|ranged\b)/i);
  if (!fallback) return [];
  const value = Number.parseInt(fallback[1], 10);
  return Number.isFinite(value) ? [value] : [];
}

function parseDamage(text: string): string {
  const paren = text.match(/\(([^)]+)\)/);
  if (paren) {
    let inner = paren[1].trim();
    inner = inner.replace(/\/(\d+(?:-\d+)?(?:\/x\d+)?|\d+x\d+)/i, "").trim();
    const dmg = inner.match(/(\d+d\d+(?:[+-]\d+)?|\d+)/i);
    if (dmg) return dmg[1];
    if (/\d+d\d+/i.test(inner)) return inner;
  }

  const withoutBonus = text.replace(/[+-]\d+(?:\/[+-]\d+)+\s*(?:melee|ranged\b)/i, " ").trim();
  const fallback = withoutBonus.match(/(\d+d\d+(?:[+-]\d+)?)/i);
  return fallback?.[1] ?? "";
}

function parseThreat(text: string): number | undefined {
  const paren = text.match(/\([^)]*\/(\d+)(?:-(\d+))?(?:\/x(\d+))?\)/i);
  if (!paren) return undefined;
  const min = Number.parseInt(paren[1], 10);
  return Number.isFinite(min) ? min : undefined;
}

function parseCritMultiplier(text: string): number | undefined {
  const paren = text.match(/\([^)]*\/(\d+(?:-\d+)?(?:\/x(\d+)|\/(\d+)x(\d+))?|\/?x(\d+))\)/i);
  if (!paren) return undefined;

  const slashX = text.match(/\/(\d+)x(\d+)/i);
  if (slashX) {
    const mult = Number.parseInt(slashX[2], 10);
    return Number.isFinite(mult) && mult >= 2 ? mult : undefined;
  }

  const xOnly = text.match(/\/x(\d+)/i);
  if (xOnly) {
    const mult = Number.parseInt(xOnly[1], 10);
    return Number.isFinite(mult) && mult >= 2 ? mult : undefined;
  }

  return 2;
}

function normalizeAttackName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lookupWeaponDamageTypes(name: string): DamageType[] {
  const normalized = normalizeAttackName(name);
  if (!normalized) return ["untyped"];

  for (const [key, types] of Object.entries(WEAPON_DAMAGE_TYPES)) {
    if (normalized.includes(key)) return [...types];
  }

  if (/\bslash/i.test(normalized)) return ["slashing"];
  if (/\bpierc/i.test(normalized)) return ["piercing"];
  if (/\bbludg/i.test(normalized)) return ["bludgeoning"];

  return ["untyped"];
}

export function inferAttackType(name: string, mode: CombatAttackMode): CombatAttackType {
  const normalized = normalizeAttackName(name);
  if (/\btouch\b/i.test(normalized)) {
    return mode === "ranged" ? "rtouch" : "mtouch";
  }
  if (/\bray\b/i.test(normalized)) return "rtouch";
  if (/\bgrapple\b/i.test(normalized)) return "grapple";
  return mode;
}

export function inferDamageTypes(name: string): DamageType[] {
  return lookupWeaponDamageTypes(name);
}

function parseAttackLine(line: string): CombatAttackLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;

  const bonuses = parseBonuses(trimmed);
  if (bonuses.length === 0) return null;

  const nameEnd = trimmed.search(/[+-]\d/);
  const name =
    nameEnd > 0 ? trimmed.slice(0, nameEnd).trim().replace(/[,;]$/, "") : "Attack";
  const mode = parseMode(trimmed);
  const attackType = inferAttackType(name, mode);

  return {
    name: name || "Attack",
    bonus: bonuses[0]!,
    mode,
    damage: parseDamage(trimmed),
    threatMin: parseThreat(trimmed),
    critMultiplier: parseCritMultiplier(trimmed),
    attackType,
    damageTypes: inferDamageTypes(name),
    iterativeBonuses: bonuses.length > 1 ? bonuses : undefined,
  };
}

/** Parse semicolon-separated attack lines (full attack or single attack). */
export function parseAttackLines(
  primary: string | null | undefined,
  full?: string | null,
): CombatAttackLine[] {
  const source = (full?.trim() && full !== "—" ? full : primary) ?? "";
  if (!source.trim()) return [];

  const lines = source.split(/[;]+|\band\b|\bor\b/i).map((s) => s.trim());
  const out: CombatAttackLine[] = [];
  for (const line of lines) {
    const parsed = parseAttackLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function equipmentLetterToDamageType(
  raw: string | null | undefined,
): DamageType | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper === "S") return "slashing";
  if (upper === "P") return "piercing";
  if (upper === "B") return "bludgeoning";
  return null;
}

export function buildPcDamageTypes(
  primaryType: string | null | undefined,
  enhancementBonus: number,
): DamageType[] {
  const types: DamageType[] = [];
  const mapped =
    equipmentLetterToDamageType(primaryType) ??
    parseDamageType(primaryType ?? "");
  if (mapped) types.push(mapped);
  if (enhancementBonus > 0 && !types.includes("magic")) types.push("magic");
  if (types.length === 0) types.push("untyped");
  return types;
}
