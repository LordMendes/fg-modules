import type { DicePoolItem, DieSides } from "@/lib/dice/types";
import {
  abilityModifier,
  formatIterativeAttacks,
  formatModifier,
  type CombatComputed,
} from "./combatStats";
import { isWeaponKind } from "./equippedGear";
import { formatDamageType } from "@/lib/equipment-display";
import type { FeatEntry, InventoryRow, PcPlanState } from "./types";

const ROLLABLE_SIDES = new Set<number>([4, 6, 8, 10, 12, 20, 100]);

export type WeaponAttackMode = "melee" | "ranged";

export type WeaponAttackRow = {
  /** Index into state.inventory */
  inventoryIndex: number;
  name: string;
  mode: WeaponAttackMode;
  attackBonus: number;
  attackDisplay: string;
  damageDice: DicePoolItem[];
  damageModifier: number;
  damageDisplay: string;
  critical: string | null;
  damageType: string | null;
  /** Full MM-style line, e.g. Longsword +9/+4 melee (1d8+3/19-20) */
  summary: string;
};

function asDieSides(sides: number): DieSides | null {
  return ROLLABLE_SIDES.has(sides) ? (sides as DieSides) : null;
}

/** Parse "1d8", "2d6", "d10" into a dice pool. Returns empty if unparseable. */
export function parseDamageDice(raw: string | null | undefined): DicePoolItem[] {
  if (!raw) return [];
  const match = String(raw)
    .trim()
    .replace(/[−–—]/g, "-")
    .match(/^(\d*)d(\d+)$/i);
  if (!match) return [];
  const qty = match[1] ? Number.parseInt(match[1], 10) : 1;
  const sides = Number.parseInt(match[2], 10);
  const dieSides = asDieSides(sides);
  if (!dieSides || !Number.isFinite(qty) || qty <= 0) return [];
  return [{ qty, sides: dieSides }];
}

export function formatDamageDice(dice: DicePoolItem[]): string {
  if (dice.length === 0) return "";
  return dice.map((d) => `${d.qty}d${d.sides}`).join("+");
}

export function formatDamageWithModifier(
  dice: DicePoolItem[],
  modifier: number,
): string {
  const base = formatDamageDice(dice);
  if (!base) {
    if (modifier === 0) return "0";
    return formatModifier(modifier);
  }
  if (modifier > 0) return `${base}+${modifier}`;
  if (modifier < 0) return `${base}${modifier}`;
  return base;
}

/** Crit suffix for MM parenthetical; omit default 20/x2. */
export function formatCritSuffix(critical: string | null | undefined): string {
  if (!critical) return "";
  const normalized = critical
    .trim()
    .replace(/[×xX]/g, "x")
    .toLowerCase();
  if (!normalized || normalized === "x2" || normalized === "20/x2") return "";

  const threatMult = normalized.match(/^(\d+-\d+)\/x(\d+)$/);
  if (threatMult) {
    const mult = Number.parseInt(threatMult[2], 10);
    if (mult === 2) return `/${threatMult[1]}`;
    return `/${threatMult[1]}/×${mult}`;
  }
  const multOnly = normalized.match(/^x(\d+)$/);
  if (multOnly) {
    const mult = Number.parseInt(multOnly[1], 10);
    if (mult === 2) return "";
    return `/×${mult}`;
  }
  const threatOnly = normalized.match(/^(\d+-\d+)$/);
  if (threatOnly) return `/${threatOnly[1]}`;

  return `/${critical.trim()}`;
}

export type WeaponCriticalInfo = {
  /** Lowest d20 face that threatens a critical (inclusive). */
  threatMin: number;
  /** Damage multiplier on a confirmed critical (×2, ×3, …). */
  multiplier: number;
};

/** Parse equipment critical strings like `19-20/x2`, `x3`, or `18-20`. */
export function parseWeaponCritical(
  critical: string | null | undefined,
): WeaponCriticalInfo {
  const defaults: WeaponCriticalInfo = { threatMin: 20, multiplier: 2 };
  if (!critical) return defaults;
  const normalized = critical
    .trim()
    .replace(/[×xX]/g, "x")
    .toLowerCase();
  if (!normalized) return defaults;

  const threatMult = normalized.match(/^(\d+)-(\d+)\/x(\d+)$/);
  if (threatMult) {
    const threatMin = Number.parseInt(threatMult[1], 10);
    const multiplier = Number.parseInt(threatMult[3], 10);
    if (
      Number.isFinite(threatMin) &&
      threatMin >= 1 &&
      threatMin <= 20 &&
      Number.isFinite(multiplier) &&
      multiplier >= 2
    ) {
      return { threatMin, multiplier };
    }
  }

  const multOnly = normalized.match(/^(?:20\/)?x(\d+)$/);
  if (multOnly) {
    const multiplier = Number.parseInt(multOnly[1], 10);
    if (Number.isFinite(multiplier) && multiplier >= 2) {
      return { threatMin: 20, multiplier };
    }
  }

  const threatOnly = normalized.match(/^(\d+)-(\d+)$/);
  if (threatOnly) {
    const threatMin = Number.parseInt(threatOnly[1], 10);
    if (Number.isFinite(threatMin) && threatMin >= 1 && threatMin <= 20) {
      return { threatMin, multiplier: 2 };
    }
  }

  return defaults;
}

export function isCriticalThreat(face: number, threatMin: number): boolean {
  return Number.isFinite(face) && face >= threatMin && face <= 20;
}

/**
 * 3.5 critical damage: multiply weapon dice quantity and ability/enhancement
 * modifiers by the critical multiplier.
 */
export function applyCriticalDamage(
  dice: DicePoolItem[],
  modifier: number,
  multiplier: number,
): { dice: DicePoolItem[]; modifier: number } {
  const mult = Math.max(1, Math.trunc(multiplier));
  return {
    dice: dice.map((d) => ({ qty: d.qty * mult, sides: d.sides })),
    modifier: modifier * mult,
  };
}

function hasWeaponFinesse(feats: FeatEntry[]): boolean {
  return feats.some((feat) => {
    const name = feat.name.trim().toLowerCase().replace(/\s+/g, " ");
    const slug = feat.slug.toLowerCase();
    return (
      name === "weapon finesse" ||
      slug === "weapon-finesse" ||
      slug.startsWith("weapon-finesse-")
    );
  });
}

export function isRangedWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "ranged";
}

export function isLightWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "light";
}

export function isTwoHandedWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "two";
}

export function weaponHasDamage(row: InventoryRow): boolean {
  return Boolean(row.damageM || row.damageS);
}

export function needsWeaponStatBackfill(row: InventoryRow): boolean {
  return (
    isWeaponKind(row.kind) &&
    !weaponHasDamage(row) &&
    row.source === "equipment" &&
    Boolean(row.slug)
  );
}

/** Small or smaller creatures use damage_s (size attack mod > 0). */
export function damageDiceForSize(
  row: InventoryRow,
  sizeMod: number,
): string | null {
  if (sizeMod > 0) {
    return row.damageS ?? row.damageM ?? null;
  }
  return row.damageM ?? row.damageS ?? null;
}

/**
 * Melee damage ability bonus: full Str, or 1.5× Str bonus (round down) for
 * two-handed when Str is positive. Negative Str