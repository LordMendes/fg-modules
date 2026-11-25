import { weaponDamageColor } from "@/lib/dice/damageTypeColors";
import { formatDamageType } from "@/lib/equipment-display";
import { abilityModifier, iterativeAttackBonuses, type CombatComputed } from "./combatStats";
import { computeEquippedBonuses } from "./itemBonuses";
import type { ClassLevelEntry, FeatEntry, InventoryRow, PcPlanState, PcSpecialAttackEntry } from "./types";
import {
  computeWeaponFeatBonuses,
  findWeaponChoiceFeatDef,
  parseFeatWeaponChoice,
  weaponMatchKey,
  weaponMatchesChoice,
  type WeaponFeatBonuses,
} from "./weaponFeatBonuses";
import {
  formatAttackBonuses,
  formatBonusSources,
  formatCritSuffix,
  formatDamageWithModifier,
  parseDamageDice,
  parseWeaponCritical,
  showFullAttackFor,
  type WeaponAttackRow,
} from "./weaponAttacks";

/** Sentinel so this row does not collide with inventory or natural-attack indexes. */
export const UNARMED_STRIKE_INDEX = -10000;

const UNARMED_NAME = "Unarmed strike";
const UNARMED_TEMPLATE_ID = "unarmed-strike";

type SizeKey =
  | "fine"
  | "diminutive"
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan"
  | "colossal";

const SIZE_FROM_MOD: Record<number, SizeKey> = {
  8: "fine",
  4: "diminutive",
  2: "tiny",
  1: "small",
  0: "medium",
  [-1]: "large",
  [-2]: "huge",
  [-4]: "gargantuan",
  [-8]: "colossal",
};

/** PHB unarmed strike. Small 1d2, Medium 1d3, Large 1d4, stepped for other sizes. */
const NON_MONK_DAMAGE: Record<SizeKey, string> = {
  fine: "1",
  diminutive: "1",
  tiny: "1d2",
  small: "1d2",
  medium: "1d3",
  large: "1d4",
  huge: "1d6",
  gargantuan: "1d8",
  colossal: "2d6",
};

/**
 * SRD weapon-size rows keyed by the Medium die.
 * Small / Medium / Large match the PHB monk table except Large 20th, which the
 * book lists as 4d8 rather than the chart's 3d10.
 */
const MONK_SIZE_ROWS: Record<string, Record<SizeKey, string>> = {
  "1d6": {
    fine: "1",
    diminutive: "1d2",
    tiny: "1d3",
    small: "1d4",
    medium: "1d6",
    large: "1d8",
    huge: "2d6",
    gargantuan: "3d6",
    colossal: "4d6",
  },
  "1d8": {
    fine: "1d2",
    diminutive: "1d3",
    tiny: "1d4",
    small: "1d6",
    medium: "1d8",
    large: "2d6",
    huge: "3d6",
    gargantuan: "4d6",
    colossal: "6d6",
  },
  "1d10": {
    fine: "1d3",
    diminutive: "1d4",
    tiny: "1d6",
    small: "1d8",
    medium: "1d10",
    large: "2d8",
    huge: "3d8",
    gargantuan: "4d8",
    colossal: "6d8",
  },
  "2d6": {
    fine: "1d4",
    diminutive: "1d6",
    tiny: "1d8",
    small: "1d10",
    medium: "2d6",
    large: "3d6",
    huge: "4d6",
    gargantuan: "6d6",
    colossal: "8d6",
  },
  "2d8": {
    fine: "1d6",
    diminutive: "1d8",
    tiny: "1d10",
    small: "2d6",
    medium: "2d8",
    large: "3d8",
    huge: "4d8",
    gargantuan: "6d8",
    colossal: "8d8",
  },
  "2d10": {
    fine: "1d8",
    diminutive: "1d10",
    tiny: "2d6",
    small: "2d8",
    medium: "2d10",
    large: "3d10",
    huge: "4d10",
    gargantuan: "6d10",
    colossal: "8d10",
  },
};

const UNARMED_CHOICE_ITEM: InventoryRow = {
  name: UNARMED_NAME,
  slug: "unarmed-strike",
  quantity: 1,
  weight: 0,
  kind: "weapon",
  handed: "light",
};

function sizeKeyFromMod(sizeMod: number): SizeKey {
  return SIZE_FROM_MOD[sizeMod] ?? "medium";
}

function mediumMonkDie(monkLevel: number): string {
  if (monkLevel >= 20) return "2d10";
  if (monkLevel >= 16) return "2d8";
  if (monkLevel >= 12) return "2d6";
  if (monkLevel >= 8) return "1d10";
  if (monkLevel >= 4) return "1d8";
  return "1d6";
}

/** Monk class levels only. Other classes still contribute BAB through combat stats. */
export function monkUnarmedLevel(classLevels: ClassLevelEntry[] | undefined): number {
  let total = 0;
  for (const cl of classLevels ?? []) {
    const slug = (cl.classSlug ?? "").toLowerCase();
    const name = (cl.className ?? "").trim().toLowerCase();
    if (slug === "monk" || slug.startsWith("monk-") || name === "monk") {
      const level = Math.trunc(cl.level);
      if (Number.isFinite(level) && level > 0) total += level;
    }
  }
  return total;
}

/**
 * Unarmed damage die for a creature size and monk class level.
 * `monkLevel` 0 uses the PHB unarmed strike table. A positive monk level uses
 * the monk unarmed table at that class level (not total character level).
 */
export function unarmedDamageDice(sizeMod: number, monkLevel: number): string {
  const size = sizeKeyFromMod(sizeMod);
  if (monkLevel <= 0) return NON_MONK_DAMAGE[size];
  const medium = mediumMonkDie(monkLevel);
  if (monkLevel >= 20 && size === "large") return "4d8";
  return MONK_SIZE_ROWS[medium][size];
}

function normalizeFeatName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasFeat(feats: FeatEntry[] | undefined, displayName: string, slugPrefix: string): boolean {
  return (feats ?? []).some((feat) => {
    const name = normalizeFeatName(feat.name).replace(/\s*\([^)]*\)\s*$/, "");
    const slug = feat.slug.toLowerCase();
    return name === displayName || slug === slugPrefix || slug.startsWith(`${slugPrefix}-`);
  });
}

function isBareUnarmedChoice(choice: string | null | undefined): boolean {
  if (!choice?.trim()) return false;
  return weaponMatchKey(choice) === "unarmed";
}

/** Weapon Focus / Specialization when the choice is unarmed strike or unarmed. */
export function computeUnarmedFeatBonuses(feats: FeatEntry[] | undefined): WeaponFeatBonuses {
  const result = computeWeaponFeatBonuses(feats, UNARMED_CHOICE_ITEM);
  for (const feat of feats ?? []) {
    const def = findWeaponChoiceFeatDef(feat);
    if (!def) continue;
    const choice = parseFeatWeaponChoice(feat);
    if (!isBareUnarmedChoice(choice)) continue;
    if (weaponMatchesChoice(UNARMED_CHOICE_ITEM, choice)) continue;
    if (def.attack) {
      result.attack += def.attack;
      result.attackParts.push({ label: def.label, amount: def.attack });
    }
    if (def.damage) {
      result.damage += def.damage;
      result.damageParts.push({ label: def.label, amount: def.damage });
    }
  }
  return result;
}

export function isUnarmedStrikeEntry(
  entry: Pick<PcSpecialAttackEntry, "name" | "templateId">,
): boolean {
  if (entry.templateId === UNARMED_TEMPLATE_ID) return true;
  return normalizeFeatName(entry.name) === "unarmed strike";
}

function flatDamageAmount(diceRaw: string): number {
  if (!/^\d+$/.test(diceRaw)) return 0;
  const n = Number.parseInt(diceRaw, 10);
  return Number.isFinite(n) ? n : 0;
}

function damageExpression(diceRaw: string, modifier: number): string {
  const parsed = parseDamageDice(diceRaw);
  if (parsed.length > 0) return formatDamageWithModifier(parsed, modifier);
  if (modifier === 0) return diceRaw;
  if (modifier > 0) return `${diceRaw}+${modifier}`;
  return `${diceRaw}${modifier}`;
}

export type UnarmedStrikeComputed = {
  entry: PcSpecialAttackEntry;
  row: WeaponAttackRow;
};

export function computeUnarmedStrike(
  state: PcPlanState,
  combatStats: CombatComputed,
): UnarmedStrikeComputed {
  const sizeMod = state.combat.sizeMod;
  const monkLevel = monkUnarmedLevel(state.identity.classLevels);
  const diceRaw = unarmedDamageDice(sizeMod, monkLevel);
  const feats = state.feats ?? [];
  const trained =
    monkLevel > 0 || hasFeat(feats, "improved unarmed strike", "improved-unarmed-strike");
  const notes = trained
    ? "Lethal or nonlethal. Does not provoke attacks of opportunity."
    : "Nonlethal. Provokes attacks of opportunity.";

  const finesse = hasFeat(feats, "weapon finesse", "weapon-finesse");
  const abilityKey = finesse ? "dex" : "str";
  const abilityLabel = finesse ? "Dex" : "Str";
  const abilityHit = abilityModifier(state.abilities[abilityKey]);
  const strDamage = abilityModifier(state.abilities.str);

  const featBonuses = computeUnarmedFeatBonuses(feats);
  const equipped = computeEquippedBonuses(
    state.inventory,
    Boolean(state.combat.addAllBonusTypes),
  );
  const itemAttack = equipped.combat.melee.total;
  const meleeMisc = state.combat.meleeMisc ?? 0;
  const modes = state.combatModes ?? {};
  const powerAttack = Math.min(Math.max(0, modes.powerAttack ?? 0), combatStats.bab);
  const fightingDefensively = modes.fightingDefensively ? 4 : 0;

  const attackBonus =
    combatStats.bab +
    abilityHit +
    sizeMod +
    featBonuses.attack +
    itemAttack +
    meleeMisc -
    fightingDefensively -
    powerAttack;

  const attackSources = formatBonusSources([
    { label: "BAB", amount: combatStats.bab },
    { label: abilityLabel, amount: abilityHit },
    { label: "Size", amount: sizeMod },
    ...featBonuses.attackParts.map((part) => ({
      label: part.label,
      amount: part.amount,
    })),
    { label: "item", amount: itemAttack },
    { label: "misc", amount: meleeMisc },
    { label: "Fighting defensively", amount: fightingDefensively ? -fightingDefensively : 0 },
    { label: "Power Attack", amount: powerAttack ? -powerAttack : 0 },
  ]);

  const flat = flatDamageAmount(diceRaw);
  const color = weaponDamageColor("Bludgeoning") ?? "#C9A227";
  const damageDice = flat > 0 ? [] : parseDamageDice(diceRaw, color);
  const powerAttackDamage = powerAttack > 0 ? powerAttack : 0;
  const damageModifier = flat + strDamage + featBonuses.damage + powerAttackDamage;
  const damageSources = formatBonusSources([
    { label: "Unarmed", amount: flat },
    { label: "Str", amount: strDamage },
    ...featBonuses.damageParts.map((part) => ({
      label: part.label,
      amount: part.amount,
    })),
    { label: "Power Attack", amount: powerAttackDamage },
  ]);

  const typeLabel = formatDamageType("Bludgeoning") ?? "Bludgeoning";
  const critSuffix = formatCritSuffix("x2");
  const damageText = `${damageExpression(diceRaw, damageModifier)}${critSuffix}`;
  const critInfo = parseWeaponCritical("x2");
  const standardBonuses = [attackBonus];
  const fullAttackBonuses = iterativeAttackBonuses(
    combatStats.bab,
    attackBonus - combatStats.bab,
  );
  const standardDisplay = formatAttackBonuses(standardBonuses);
  const fullAttackDisplay = formatAttackBonuses(fullAttackBonuses);
  const summary = `${UNARMED_NAME} ${fullAttackDisplay} melee (${damageText})`;

  const entry: PcSpecialAttackEntry = {
    id: UNARMED_TEMPLATE_ID,
    kind: "natural",
    templateId: UNARMED_TEMPLATE_ID,
    name: UNARMED_NAME,
    count: 1,
    primary: true,
    damageM: diceRaw,
    damageS: diceRaw,
    damageType: "Bludgeoning",
    critical: "x2",
    attackMisc: 0,
    damageMisc: 0,
    saveDc: null,
    saveType: null,
    notes,
  };

  const row: WeaponAttackRow = {
    inventoryIndex: UNARMED_STRIKE_INDEX,
    name: UNARMED_NAME,
    mode: "melee",
    attackBonus,
    attackBonuses: fullAttackBonuses,
    attackDisplay: fullAttackDisplay,
    standardBonuses,
    standardDisplay,
    fullAttackBonuses,
    fullAttackDisplay,
    showFullAttack: showFullAttackFor(fullAttackBonuses),
    twfHand: null,
    damageDice,
    extraDamageDice: [],
    critOnlyDice: [],
    damageModifier,
    fullAttackDamageModifier: damageModifier,
    damageDisplay: damageText,
    extraDamageDisplay: "",
    critExtraDisplay: "",
    damageParts: [
      {
        text: damageText,
        damageType: typeLabel,
        color,
      },
    ],
    critDamageParts: [],
    critical: "x2",
    threatMin: critInfo.threatMin,
    critMultiplier: critInfo.multiplier,
    damageType: typeLabel,
    summary,
    attackSources,
    damageSources,
  };

  return { entry, row };
}
