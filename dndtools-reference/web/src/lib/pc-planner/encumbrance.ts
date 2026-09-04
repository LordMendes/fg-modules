import type { EquippedGear } from "./equippedGear";
import type { ClassDerivedFeatures } from "./parseClassAbilityEffects";
import type { FeatDerivedFeatures } from "./parseFeatEffects";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type { InventoryRow, PcPlanState, TreasureRow } from "./types";

export type LoadCategory = "light" | "medium" | "heavy" | "overloaded";
export type ArmorLoadCategory = "none" | "light" | "medium" | "heavy";

export type CarryingLimits = {
  light: number;
  medium: number;
  heavy: number;
};

export type EncumbranceResult = {
  carriedWeight: number;
  limits: CarryingLimits;
  weightCategory: LoadCategory;
  armorCategory: ArmorLoadCategory;
  /** Worse of weight vs armor for UI highlight (overloaded stays overloaded). */
  highlightCategory: LoadCategory | ArmorLoadCategory;
  /** Speed delta from load/armor (0 when unhindered or light). */
  speedDelta: number;
  /** Absolute max Dex from load, or null if uncapped by load. */
  loadMaxDex: number | null;
  /** Final max Dex after armor + load (null = uncapped). */
  maxDex: number | null;
  /** Armor/shield ACP + load ACP. */
  totalAcp: number;
  loadAcp: number;
  overloaded: boolean;
  speedUnhindered: boolean;
  speedUnhinderedReason: string | null;
  /** Conditional +10 from Fleet of Foot when it qualifies. */
  fleetSpeedBonus: number;
  /** Conditional +10 from Fast Movement when it qualifies. */
  fastMovementBonus: number;
};

/** PHB Table 9-1 heavy load for Medium creatures, Strength 1–29. */
const HEAVY_LOAD_BY_STR: Record<number, number> = {
  1: 10,
  2: 20,
  3: 30,
  4: 40,
  5: 50,
  6: 60,
  7: 70,
  8: 80,
  9: 90,
  10: 100,
  11: 115,
  12: 130,
  13: 150,
  14: 175,
  15: 200,
  16: 230,
  17: 260,
  18: 300,
  19: 350,
  20: 400,
  21: 460,
  22: 520,
  23: 600,
  24: 700,
  25: 800,
  26: 920,
  27: 1040,
  28: 1200,
  29: 1400,
};

const CATEGORY_RANK: Record<LoadCategory | ArmorLoadCategory, number> = {
  none: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  overloaded: 4,
};

/** 50 coins = 1 lb (PHB). */
export const COINS_PER_POUND = 50;

export function sizeLoadMultiplier(sizeMod: number): number {
  switch (sizeMod) {
    case 8:
      return 1 / 8;
    case 4:
      return 1 / 4;
    case 2:
      return 1 / 2;
    case 1:
      return 3 / 4;
    case 0:
      return 1;
    case -1:
      return 2;
    case -2:
      return 4;
    case -4:
      return 8;
    case -8:
      return 16;
    default:
      return 1;
  }
}

/** Heavy load for a Medium creature at this Strength (PHB + Str 30+ rule). */
export function mediumHeavyLoad(strength: number): number {
  const str = Math.max(1, Math.floor(strength));
  if (str <= 29) return HEAVY_LOAD_BY_STR[str] ?? 100;
  // Str 30+ = 4 × the value for Strength 10 lower.
  return 4 * mediumHeavyLoad(str - 10);
}

export function carryingCapacity(strength: number, sizeMod = 0): CarryingLimits {
  const heavy = Math.max(1, Math.floor(mediumHeavyLoad(strength) * sizeLoadMultiplier(sizeMod)));
  return {
    light: Math.floor(heavy / 3),
    medium: Math.floor((heavy * 2) / 3),
    heavy,
  };
}

export function loadCategory(weight: number, limits: CarryingLimits): LoadCategory {
  if (!Number.isFinite(weight) || weight < 0) return "light";
  if (weight > limits.heavy) return "overloaded";
  if (weight > limits.medium) return "heavy";
  if (weight > limits.light) return "medium";
  return "light";
}

/** Medium/heavy load or armor: 2/3 speed, rounded up to the next 5 ft (PHB). */
export function encumberedSpeed(baseSpeed: number): number {
  if (!Number.isFinite(baseSpeed) || baseSpeed <= 0) return 0;
  return Math.max(5, Math.ceil((baseSpeed * 2) / 3 / 5) * 5);
}

export function inventoryCarriedWeight(inventory: InventoryRow[]): number {
  return inventory.reduce((sum, row) => {
    const qty = Number.isFinite(row.quantity) ? row.quantity : 0;
    const weight = Number.isFinite(row.weight) ? row.weight : 0;
    return sum + qty * weight;
  }, 0);
}

export function coinTreasureWeight(treasure: TreasureRow[] | null | undefined): number {
  if (!treasure?.length) return 0;
  let coins = 0;
  for (const row of treasure) {
    if (!row.builtin) continue;
    if (Number.isFinite(row.amount) && row.amount > 0) coins += row.amount;
  }
  return coins / COINS_PER_POUND;
}

export function totalCarriedWeight(state: PcPlanState): number {
  return inventoryCarriedWeight(state.inventory ?? []) + coinTreasureWeight(state.treasure);
}

export function normalizeArmorCategory(
  raw: string | null | undefined,
): ArmorLoadCategory | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "light" || value.startsWith("light ")) return "light";
  if (value === "medium" || value.startsWith("medium ")) return "medium";
  if (value === "heavy" || value.startsWith("heavy ")) return "heavy";
  return null;
}

/** Infer light/medium/heavy when category is missing from an equipped armor row. */
export function inferArmorCategory(row: {
  category?: string | null;
  maxDex?: number | null;
  speed30?: number | null;
  speed20?: number | null;
}): ArmorLoadCategory {
  const fromField = normalizeArmorCategory(row.category);
  if (fromField) return fromField;

  const reducesSpeed =
    (row.speed30 != null && Number.isFinite(row.speed30) && row.speed30 < 30) ||
    (row.speed20 != null && Number.isFinite(row.speed20) && row.speed20 < 20);
  if (!reducesSpeed) return "light";
  if (row.maxDex != null && Number.isFinite(row.maxDex) && row.maxDex >= 3) return "medium";
  return "heavy";
}

function loadMaxDexForCategory(category: LoadCategory): number | null {
  if (category === "medium") return 3;
  if (category === "heavy" || category === "overloaded") return 1;
  return null;
}

function loadAcpForCategory(category: LoadCategory): number {
  if (category === "medium") return -3;
  if (category === "heavy" || category === "overloaded") return -6;
  return 0;
}

function worseCategory(
  weight: LoadCategory,
  armor: ArmorLoadCategory,
): LoadCategory | ArmorLoadCategory {
  return CATEGORY_RANK[weight] >= CATEGORY_RANK[armor] ? weight : armor;
}

function qualifiesForConditionalSpeedBonus(
  armorCategory: ArmorLoadCategory,
  weightCategory: LoadCategory,
): boolean {
  if (armorCategory === "heavy") return false;
  if (weightCategory === "heavy" || weightCategory === "overloaded") return false;
  return true;
}

export type ComputeEncumbranceOptions = {
  raceFeatures?: RaceDerivedFeatures | null;
  featFeatures?: FeatDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
  equippedGear?: EquippedGear | null;
  /** Override when gear was already computed with the right speed base. */
  armorCategory?: ArmorLoadCategory | null;
};

export function computeEncumbrance(
  state: PcPlanState,
  options: ComputeEncumbranceOptions = {},
): EncumbranceResult {
  const speedBase = state.combat.speedBase;
  const carriedWeight = totalCarriedWeight(state);
  const limits = carryingCapacity(state.abilities.str, state.combat.sizeMod);
  const weightCategory = loadCategory(carriedWeight, limits);

  const gear =
    options.equippedGear ??
    null;
  let armorCategory: ArmorLoadCategory =
    options.armorCategory ?? gear?.armorCategory ?? "none";

  if (armorCategory === "none") {
    for (const row of state.inventory ?? []) {
      if (!row.equipped) continue;
      if ((row.kind ?? "").toLowerCase() !== "armor") continue;
      armorCategory = inferArmorCategory(row);
      break;
    }
  }

  const speedUnhindered =
    Boolean(options.raceFeatures?.speedUnhinderedByEncumbrance) ||
    Boolean(options.featFeatures?.speedUnhinderedByEncumbrance);
  const speedUnhinderedReason = options.raceFeatures?.speedUnhinderedByEncumbrance
    ? "Racial trait"
    : options.featFeatures?.speedUnhinderedByEncumbrance
      ? "Feat"
      : null;

  const overloaded = weightCategory === "overloaded";
  const loadMaxDex = loadMaxDexForCategory(weightCategory);
  const loadAcp = loadAcpForCategory(weightCategory);
  const armorAcp = gear?.acp ?? 0;
  const armorMaxDex = gear?.maxDex ?? null;

  let maxDex: number | null = null;
  if (armorMaxDex != null && loadMaxDex != null) {
    maxDex = Math.min(armorMaxDex, loadMaxDex);
  } else if (armorMaxDex != null) {
    maxDex = armorMaxDex;
  } else if (loadMaxDex != null) {
    maxDex = loadMaxDex;
  }

  let speedDelta = 0;
  if (overloaded) {
    speedDelta = 5 - speedBase;
  } else if (!speedUnhindered) {
    const needsReduction =
      weightCategory === "medium" ||
      weightCategory === "heavy" ||
      armorCategory === "medium" ||
      armorCategory === "heavy";
    if (needsReduction) {
      const fromArmor = gear?.speedArmorDelta;
      if (fromArmor != null && (armorCategory === "medium" || armorCategory === "heavy")) {
        // Prefer armor table when armor is causing (or matching) the reduction.
        speedDelta = fromArmor;
      } else {
        speedDelta = encumberedSpeed(speedBase) - speedBase;
      }
      // When both apply, take the worse (lower) resulting speed = more negative delta.
      if (fromArmor != null) {
        speedDelta = Math.min(speedDelta, fromArmor);
      }
    }
  }

  const conditionalOk = qualifiesForConditionalSpeedBonus(armorCategory, weightCategory);
  const fleetSpeedBonus =
    conditionalOk && (options.featFeatures?.fleetSpeedBonus ?? 0) > 0
      ? options.featFeatures!.fleetSpeedBonus
      : 0;
  const fastMovementBonus =
    conditionalOk && (options.classFeatures?.fastMovementBonus ?? 0) > 0
      ? options.classFeatures!.fastMovementBonus
      : 0;

  return {
    carriedWeight,
    limits,
    weightCategory,
    armorCategory,
    highlightCategory: worseCategory(weightCategory, armorCategory),
    speedDelta,
    loadMaxDex,
    maxDex,
    totalAcp: armorAcp + loadAcp,
    loadAcp,
    overloaded,
    speedUnhindered: speedUnhindered && !overloaded,
    speedUnhinderedReason: speedUnhindered && !overloaded ? speedUnhinderedReason : null,
    fleetSpeedBonus,
    fastMovementBonus,
  };
}
