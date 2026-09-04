import type { DicePoolItem, DieSides } from "@/lib/dice/types";
import { weaponDamageColor } from "@/lib/dice/damageTypeColors";
import {
  abilityModifier,
  formatModifier,
  iterativeAttackBonuses,
  type CombatComputed,
} from "./combatStats";
import { isWeaponKind } from "./equippedGear";
import { formatDamageType } from "@/lib/equipment-display";
import {
  applyKeenThreat,
  inventoryAttackBonus,
  inventoryDamageBonus,
  inventoryDamageLines,
  inventoryHasKeen,
} from "./inventoryItem";

export { applyKeenThreat };
import type { FeatEntry, InventoryDamageLine, InventoryRow, PcPlanState } from "./types";

const ROLLABLE_SIDES = new Set<number>([4, 6, 8, 10, 12, 20, 100]);

export type WeaponAttackMode = "melee" | "ranged";

export type WeaponDamagePart = {
  text: string;
  damageType: string | null;
  color: string;
};

export type TwfHand = "main" | "off";

export type WeaponAttackRow = {
  /** Index into state.inventory */
  inventoryIndex: number;
  name: string;
  mode: WeaponAttackMode;
  /** Unpenalized primary attack bonus (standard action). */
  attackBonus: number;
  /** Alias of fullAttackBonuses (MM / legacy). */
  attackBonuses: number[];
  /** Alias of fullAttackDisplay (MM / legacy). */
  attackDisplay: string;
  /** Single standard-action attack bonus. */
  standardBonuses: number[];
  standardDisplay: string;
  /** Full-attack routine (iteratives and/or TWF). */
  fullAttackBonuses: number[];
  fullAttackDisplay: string;
  /** True when full attack differs from a single standard strike. */
  showFullAttack: boolean;
  /** Set when this weapon is part of an inferred two-weapon pair. */
  twfHand: TwfHand | null;
  /** Primary weapon dice; multiplied on a critical. */
  damageDice: DicePoolItem[];
  /** Extra energy / property dice; not multiplied on a critical. */
  extraDamageDice: DicePoolItem[];
  /** Burst extras that apply only on a confirmed critical. */
  critOnlyDice: DicePoolItem[];
  /** Damage ability/enhancement for a standard (one-weapon) attack. */
  damageModifier: number;
  /** Damage when using this weapon in a full attack (1/2 Str off-hand). */
  fullAttackDamageModifier: number;
  damageDisplay: string;
  extraDamageDisplay: string;
  critExtraDisplay: string;
  /** Colored segments for the damage button / label. */
  damageParts: WeaponDamagePart[];
  /** Burst extras shown only when a critical is armed. */
  critDamageParts: WeaponDamagePart[];
  critical: string | null;
  threatMin: number;
  critMultiplier: number;
  damageType: string | null;
  /** Full MM-style line, e.g. Longsword +9/+4 melee (1d8+3/19-20) */
  summary: string;
};

function asDieSides(sides: number): DieSides | null {
  return ROLLABLE_SIDES.has(sides) ? (sides as DieSides) : null;
}

/** Parse "1d8", "2d6", "d10" into a dice pool. Returns empty if unparseable. */
export function parseDamageDice(
  raw: string | null | undefined,
  themeColor?: string | null,
): DicePoolItem[] {
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
  return [
    {
      qty,
      sides: dieSides,
      ...(themeColor ? { themeColor } : {}),
    },
  ];
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
    dice: dice.map((d) => ({
      qty: d.qty * mult,
      sides: d.sides,
      ...(d.themeColor ? { themeColor: d.themeColor } : {}),
    })),
    modifier: modifier * mult,
  };
}

function normalizeFeatName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function featMatches(
  feats: FeatEntry[],
  displayName: string,
  slugPrefix: string,
): boolean {
  return feats.some((feat) => {
    const name = normalizeFeatName(feat.name);
    const slug = feat.slug.toLowerCase();
    return (
      name === displayName ||
      slug === slugPrefix ||
      slug.startsWith(`${slugPrefix}-`)
    );
  });
}

function hasWeaponFinesse(feats: FeatEntry[]): boolean {
  return featMatches(feats, "weapon finesse", "weapon-finesse");
}

export type TwfFeatFlags = {
  twoWeaponFighting: boolean;
  improved: boolean;
  greater: boolean;
};

export function getTwfFeatFlags(feats: FeatEntry[]): TwfFeatFlags {
  return {
    twoWeaponFighting: featMatches(
      feats,
      "two-weapon fighting",
      "two-weapon-fighting",
    ),
    improved: featMatches(
      feats,
      "improved two-weapon fighting",
      "improved-two-weapon-fighting",
    ),
    greater: featMatches(
      feats,
      "greater two-weapon fighting",
      "greater-two-weapon-fighting",
    ),
  };
}

/** PHB 3.5 two-weapon fighting attack penalties. */
export function twfAttackPenalties(
  hasTwfFeat: boolean,
  offHandLight: boolean,
): { primary: number; offHand: number } {
  if (hasTwfFeat) {
    return offHandLight
      ? { primary: -2, offHand: -2 }
      : { primary: -4, offHand: -4 };
  }
  return offHandLight
    ? { primary: -4, offHand: -8 }
    : { primary: -6, offHand: -10 };
}

/** Off-hand damage: half positive Str bonus; full Str penalty. */
export function offHandDamageAbilityBonus(strMod: number): number {
  if (strMod > 0) return Math.floor(strMod / 2);
  return strMod;
}

export function formatAttackBonuses(bonuses: number[]): string {
  if (bonuses.length === 0) return formatModifier(0);
  return bonuses.map(formatModifier).join("/");
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

export function isOneHandedWeapon(row: InventoryRow): boolean {
  return (row.handed ?? "").toLowerCase() === "one";
}

/** Light or one-handed melee weapons can form a two-weapon pair. */
export function canTwoWeaponFight(row: InventoryRow): boolean {
  if (!isWeaponKind(row.kind) || !weaponHasDamage(row)) return false;
  if (isRangedWeapon(row) || isTwoHandedWeapon(row)) return false;
  const handed = (row.handed ?? "").toLowerCase();
  if (!handed) return true;
  return isLightWeapon(row) || isOneHandedWeapon(row);
}

/**
 * Resolve TWF from explicit Main / Off slots when both are light or
 * one-handed melee weapons.
 */
export function resolveTwfPair(
  inventory: InventoryRow[],
): { mainIndex: number; offIndex: number } | null {
  let mainIndex = -1;
  let offIndex = -1;
  for (let i = 0; i < inventory.length; i++) {
    const row = inventory[i];
    if (!isWeaponKind(row.kind)) continue;
    if (row.weaponHand === "main") mainIndex = i;
    if (row.weaponHand === "off") offIndex = i;
  }
  if (mainIndex < 0 || offIndex < 0) return null;
  if (!canTwoWeaponFight(inventory[mainIndex])) return null;
  if (!canTwoWeaponFight(inventory[offIndex])) return null;
  return { mainIndex, offIndex };
}

/** @deprecated Prefer resolveTwfPair; kept for older call sites. */
export function inferTwfPair(
  inventory: InventoryRow[],
): { mainIndex: number; offIndex: number } | null {
  return resolveTwfPair(inventory);
}

export function offHandAttackBonuses(
  attackBonus: number,
  offHandPenalty: number,
  flags: TwfFeatFlags,
): number[] {
  const primary = attackBonus + offHandPenalty;
  const bonuses = [primary];
  if (flags.improved) bonuses.push(primary - 5);
  if (flags.greater) bonuses.push(primary - 10);
  return bonuses;
}

/** Full Attack is available only when the routine has two or more rolls. */
export function showFullAttackFor(fullAttackBonuses: number[]): boolean {
  return fullAttackBonuses.length > 1;
}

function lineHasDice(line: InventoryDamageLine, sizeMod: number): boolean {
  const raw =
    sizeMod > 0 ? line.diceS || line.dice : line.dice || line.diceS || "";
  return parseDamageDice(raw).length > 0;
}

export function weaponHasDamage(row: InventoryRow): boolean {
  const lines = inventoryDamageLines(row);
  if (lines.some((line) => lineHasDice(line, 0) || lineHasDice(line, 1))) {
    return true;
  }
  return Boolean(row.damageM || row.damageS);
}

export function needsWeaponStatBackfill(row: InventoryRow): boolean {
  return (
    !row.customized &&
    isWeaponKind(row.kind) &&
    !weaponHasDamage(row) &&
    row.source === "equipment" &&
    Boolean(row.slug)
  );
}

function primaryDamageRaw(row: InventoryRow, sizeMod: number): string | null {
  const lines = inventoryDamageLines(row);
  const primary = lines.find((line) => !line.critOnly && !line.fromAbilityId) ??
    lines.find((line) => !line.critOnly);
  if (primary) {
    if (sizeMod > 0) return primary.diceS || primary.dice || null;
    return primary.dice || primary.diceS || null;
  }
  if (sizeMod > 0) {
    return row.damageS ?? row.damageM ?? null;
  }
  return row.damageM ?? row.damageS ?? null;
}

/** Small or smaller creatures use damage_s (size attack mod > 0). */
export function damageDiceForSize(
  row: InventoryRow,
  sizeMod: number,
): string | null {
  return primaryDamageRaw(row, sizeMod);
}

function formatExtraPart(line: InventoryDamageLine, sizeMod: number): string {
  const raw =
    sizeMod > 0 ? line.diceS || line.dice : line.dice || line.diceS || "";
  if (!raw) return "";
  const type = formatDamageType(line.type);
  return type ? `${raw} ${type.toLowerCase()}` : raw;
}

function lineDiceRaw(line: InventoryDamageLine, sizeMod: number): string {
  return sizeMod > 0 ? line.diceS || line.dice : line.dice || line.diceS || "";
}

function damagePartFromLine(
  line: InventoryDamageLine,
  sizeMod: number,
  modifier = 0,
): WeaponDamagePart | null {
  const raw = lineDiceRaw(line, sizeMod);
  if (!raw) return null;
  const typeLabel = formatDamageType(line.type);
  const diceText =
    modifier !== 0 ? formatDamageWithModifier(parseDamageDice(raw), modifier) : raw;
  const text = typeLabel ? `${diceText} ${typeLabel.toLowerCase()}` : diceText;
  return {
    text,
    damageType: typeLabel ?? line.type ?? null,
    color: weaponDamageColor(line.type),
  };
}

export function formatWeaponDamageText(
  primary: string,
  extraDisplay: string,
  critExtraDisplay = "",
  includeCritExtra = false,
): string {
  const extras = [extraDisplay, includeCritExtra ? critExtraDisplay : ""]
    .filter((part) => part.trim())
    .join(" plus ");
  return extras ? `${primary} plus ${extras}` : primary;
}

export function buildWeaponDamageParts(
  primary: WeaponDamagePart | null,
  extras: WeaponDamagePart[],
  critExtras: WeaponDamagePart[],
  includeCritExtra: boolean,
): WeaponDamagePart[] {
  const parts: WeaponDamagePart[] = [];
  if (primary) parts.push(primary);
  for (const part of extras) parts.push(part);
  if (includeCritExtra) {
    for (const part of critExtras) parts.push(part);
  }
  return parts;
}

/**
 * Melee damage ability bonus: full Str, or 1.5× Str bonus (round down) for
 * two-handed when Str is positive. Negative Str always applies the full penalty.
 */
export function meleeDamageAbilityBonus(
  strMod: number,
  twoHanded: boolean,
): number {
  if (!twoHanded) return strMod;
  if (strMod > 0) return Math.floor(strMod * 1.5);
  return strMod;
}

export function computeWeaponAttackRows(
  state: PcPlanState,
  combatStats: CombatComputed,
): WeaponAttackRow[] {
  const inventory = state.inventory ?? [];
  const strMod = abilityModifier(state.abilities.str);
  const dexMod = abilityModifier(state.abilities.dex);
  const sizeMod = state.combat.sizeMod;
  const finesse = hasWeaponFinesse(state.feats);
  const twfFlags = getTwfFeatFlags(state.feats);
  const twfPair = resolveTwfPair(inventory);
  const offHandLight = twfPair
    ? isLightWeapon(inventory[twfPair.offIndex])
    : false;
  const twfPenalties = twfPair
    ? twfAttackPenalties(twfFlags.twoWeaponFighting, offHandLight)
    : null;
  const rows: WeaponAttackRow[] = [];

  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (!isWeaponKind(item.kind) || !weaponHasDamage(item)) continue;
    if (!item.weaponHand) continue;

    const mode: WeaponAttackMode = isRangedWeapon(item) ? "ranged" : "melee";
    const light = isLightWeapon(item);
    const useDexToHit =
      mode === "ranged" || (finesse && light && mode === "melee");

    const magicAttack = inventoryAttackBonus(item);
    const attackBonus =
      combatStats.bab +
      (useDexToHit ? dexMod : strMod) +
      sizeMod +
      magicAttack +
      (mode === "ranged" ? state.combat.rangedMisc : state.combat.meleeMisc);

    const lines = inventoryDamageLines(item);
    const primaryLine =
      lines.find((line) => !line.critOnly && !line.fromAbilityId) ??
      lines.find((line) => !line.critOnly);
    const damageRaw = damageDiceForSize(item, sizeMod);
    const primaryType = primaryLine?.type ?? item.damageType ?? null;
    const primaryColor = weaponDamageColor(primaryType);
    const damageDice = parseDamageDice(damageRaw, primaryColor);
    if (damageDice.length === 0) continue;

    const extraLines = lines.filter(
      (line) => line !== primaryLine && !line.critOnly,
    );
    const critOnlyLines = lines.filter((line) => line.critOnly);
    const extraDamageDice = extraLines.flatMap((line) =>
      parseDamageDice(
        lineDiceRaw(line, sizeMod),
        weaponDamageColor(line.type),
      ),
    );
    const critOnlyDice = critOnlyLines.flatMap((line) =>
      parseDamageDice(line.dice, weaponDamageColor(line.type)),
    );
    const extraDamageDisplay = extraLines
      .map((line) => formatExtraPart(line, sizeMod))
      .filter(Boolean)
      .join(" plus ");
    const critExtraDisplay = critOnlyLines
      .map((line) => formatExtraPart(line, 0))
      .filter(Boolean)
      .join(" plus ");

    const magicDamage = inventoryDamageBonus(item);
    const twoHanded = isTwoHandedWeapon(item);
    let abilityDamage = 0;
    if (mode === "melee") {
      abilityDamage = meleeDamageAbilityBonus(strMod, twoHanded);
    }
    const damageModifier = magicDamage + abilityDamage;

    let twfHand: TwfHand | null = null;
    if (twfPair && twfPenalties) {
      if (i === twfPair.mainIndex) twfHand = "main";
      else if (i === twfPair.offIndex) twfHand = "off";
    }

    let fullAttackDamageModifier = damageModifier;
    if (mode === "melee" && twfHand === "main") {
      // Dual-wield main hand never gets 1.5× Str.
      fullAttackDamageModifier = magicDamage + strMod;
    } else if (mode === "melee" && twfHand === "off") {
      fullAttackDamageModifier =
        magicDamage + offHandDamageAbilityBonus(strMod);
    }

    const standardBonuses = [attackBonus];
    const standardDisplay = formatAttackBonuses(standardBonuses);

    let fullAttackBonuses: number[];
    if (twfHand === "main" && twfPenalties) {
      fullAttackBonuses = iterativeAttackBonuses(
        attackBonus + twfPenalties.primary,
      );
    } else if (twfHand === "off" && twfPenalties) {
      fullAttackBonuses = offHandAttackBonuses(
        attackBonus,
        twfPenalties.offHand,
        twfFlags,
      );
    } else {
      fullAttackBonuses = iterativeAttackBonuses(attackBonus);
    }
    const fullAttackDisplay = formatAttackBonuses(fullAttackBonuses);
    const showFullAttack = showFullAttackFor(fullAttackBonuses);

    const primaryDiceText = formatDamageWithModifier(damageDice, damageModifier);
    const damageBase = formatWeaponDamageText(
      primaryDiceText,
      extraDamageDisplay,
    );
    const critSuffix = formatCritSuffix(item.critical);
    const damageDisplay = `${damageBase}${critSuffix}`;
    const typeLabel =
      formatDamageType(primaryType) ?? (extraDamageDisplay || null);
    const summary = `${item.name || "Weapon"} ${fullAttackDisplay} ${mode} (${damageDisplay})`;
    const critInfo = parseWeaponCritical(item.critical);
    const threatMin = inventoryHasKeen(item)
      ? applyKeenThreat(critInfo.threatMin)
      : critInfo.threatMin;

    const primaryPart: WeaponDamagePart = {
      text: `${primaryDiceText}${critSuffix}`,
      damageType: typeLabel,
      color: primaryColor,
    };
    const extraParts = extraLines
      .map((line) => damagePartFromLine(line, sizeMod))
      .filter((part): part is WeaponDamagePart => part != null);
    const critExtraParts = critOnlyLines
      .map((line) => damagePartFromLine(line, 0))
      .filter((part): part is WeaponDamagePart => part != null);

    rows.push({
      inventoryIndex: i,
      name: item.name || "Weapon",
      mode,
      attackBonus,
      attackBonuses: fullAttackBonuses,
      attackDisplay: fullAttackDisplay,
      standardBonuses,
      standardDisplay,
      fullAttackBonuses,
      fullAttackDisplay,
      showFullAttack,
      twfHand,
      damageDice,
      extraDamageDice,
      critOnlyDice,
      damageModifier,
      fullAttackDamageModifier,
      damageDisplay,
      extraDamageDisplay,
      critExtraDisplay,
      damageParts: buildWeaponDamageParts(primaryPart, extraParts, [], false),
      critDamageParts: critExtraParts,
      critical: item.critical ?? null,
      threatMin,
      critMultiplier: critInfo.multiplier,
      damageType: typeLabel,
      summary,
    });
  }

  return rows;
}
