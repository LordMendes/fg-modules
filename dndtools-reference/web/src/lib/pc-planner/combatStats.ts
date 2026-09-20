import { getClassCombatInfo, babFromClassLevel, saveFromClassLevel } from "./classCombat";
import {
  saveAbilityModFromClassFeatures,
  type ClassDerivedFeatures,
} from "./parseClassAbilityEffects";
import {
  advancementRowAtLevel,
  type ClassAdvancementRow,
} from "./parseClassAdvancement";
import { aggregateConditionEffects } from "./conditions";
import { resolveDerivedNumber } from "./derivedField";
import { computeEquippedGear } from "./equippedGear";
import { computeEncumbrance } from "./encumbrance";
import {
  computeEquippedBonuses,
  stackArmorBonus,
  type EquippedBonuses,
} from "./itemBonuses";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type { FeatDerivedFeatures } from "./parseFeatEffects";
import { emptyFeatDerivedFeatures } from "./parseFeatEffects";
import type { PcPlanState } from "./types";


export type ClassAdvancementMap = Record<string, ClassAdvancementRow[]>;

export type CombatBreakdownRow = {
  total: number;
  parts: Record<string, number>;
};

export type CombatComputed = {
  bab: number;
  melee: CombatBreakdownRow;
  ranged: CombatBreakdownRow;
  grapple: CombatBreakdownRow;
  fortitude: CombatBreakdownRow;
  reflex: CombatBreakdownRow;
  will: CombatBreakdownRow;
  ac: CombatBreakdownRow;
  flatFooted: CombatBreakdownRow;
  touch: CombatBreakdownRow;
  initiative: CombatBreakdownRow;
  speed: CombatBreakdownRow;
  spellResistance: CombatBreakdownRow;
  /** Equipped item bonus overlay (for tooltips). */
  itemBonuses: EquippedBonuses;
  /** Arcane spell failure percent from gear (or override). */
  arcaneSpellFailure: number;
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Iterative attack bonuses (3.5): extra attacks come from BAB
 * (+6, +11, +16; max 4), not from the attack total. `extra` (ability,
 * size, enhancement, misc) is added to each iterative.
 * Examples: (5) → [5], (6) → [6, 1], (5, 7) → [12], (11, 5) → [16, 11, 6].
 */
export function iterativeAttackBonuses(bab: number, extra = 0): number[] {
  const base = Number.isFinite(bab) ? Math.trunc(bab) : 0;
  const add = Number.isFinite(extra) ? extra : 0;
  const count = base <= 0 ? 1 : Math.min(4, Math.floor((base - 1) / 5) + 1);
  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(base - i * 5 + add);
  }
  return parts;
}

/**
 * Format iterative attack bonuses (3.5). Pass BAB alone, or BAB plus
 * non-BAB extras so Strength does not create extra attacks.
 * Examples: (5) → "+5", (6) → "+6/+1", (5, 7) → "+12", (11, 5) → "+16/+11/+6".
 */
export function formatIterativeAttacks(bab: number, extra = 0): string {
  return iterativeAttackBonuses(bab, extra).map(formatModifier).join("/");
}

function sumParts(parts: Record<string, number>): number {
  return Object.values(parts).reduce((sum, n) => sum + n, 0);
}

/** 3.5 grapple size modifier differs from attack/AC size modifier. */
export function grappleSizeModFromAttackSizeMod(attackSizeMod: number): number {
  const table: Record<number, number> = {
    8: -16,
    4: -8,
    2: -4,
    1: -4,
    0: 0,
    [-1]: 4,
    [-2]: 8,
    [-4]: 16,
    [-8]: 32,
  };
  return table[attackSizeMod] ?? 0;
}

function classBabFromAdvancement(
  classSlug: string,
  classLevel: number,
  classAdvancement: ClassAdvancementMap | null | undefined,
): number | null {
  const table = classAdvancement?.[classSlug];
  const row = table ? advancementRowAtLevel(table, classLevel) : null;
  return row ? row.bab : null;
}

function classSaveFromAdvancement(
  save: "fort" | "ref" | "will",
  classSlug: string,
  classLevel: number,
  classAdvancement: ClassAdvancementMap | null | undefined,
): number | null {
  const table = classAdvancement?.[classSlug];
  const row = table ? advancementRowAtLevel(table, classLevel) : null;
  return row ? row[save] : null;
}

export function computeBaseAttackBonus(
  classLevels: PcPlanState["identity"]["classLevels"],
  classAdvancement: ClassAdvancementMap | null = null,
): number {
  let total = 0;
  for (const cl of classLevels) {
    const fromTable = classBabFromAdvancement(cl.classSlug, cl.level, classAdvancement);
    if (fromTable != null) {
      total += fromTable;
      continue;
    }
    const info = getClassCombatInfo(cl.classSlug, cl.className);
    total += babFromClassLevel(cl.level, info.bab);
  }
  return total;
}

export function computeClassSave(
  save: "fort" | "ref" | "will",
  classLevels: PcPlanState["identity"]["classLevels"],
  classAdvancement: ClassAdvancementMap | null = null,
): number {
  let total = 0;
  for (const cl of classLevels) {
    const fromTable = classSaveFromAdvancement(save, cl.classSlug, cl.level, classAdvancement);
    if (fromTable != null) {
      total += fromTable;
      continue;
    }
    const info = getClassCombatInfo(cl.classSlug, cl.className);
    total += saveFromClassLevel(cl.level, info[save]);
  }
  return total;
}

export function computeCombatStats(
  state: PcPlanState,
  raceFeatures: RaceDerivedFeatures | null = null,
  classFeatures: ClassDerivedFeatures | null = null,
  classAdvancement: ClassAdvancementMap | null = null,
  featFeatures: FeatDerivedFeatures | null = null,
): CombatComputed {
  const { combat, abilities, identity } = state;

  const raging = Boolean(state.combatModes?.rage);
  const rageStr = raging ? 4 : 0;
  const rageCon = raging ? 4 : 0;
  const rageWill = raging ? 2 : 0;
  const rageAc = raging ? -2 : 0;
  const combatExpertise = Math.max(0, state.combatModes?.combatExpertise ?? 0);

  const strMod = abilityModifier(abilities.str) + rageStr;
  const dexMod = abilityModifier(abilities.dex);
  const conMod = abilityModifier(abilities.con) + rageCon;
  const wisMod = abilityModifier(abilities.wis);

  const feats = featFeatures ?? emptyFeatDerivedFeatures();
  const gear = computeEquippedGear(state.inventory ?? [], combat.speedBase);
  const itemBonuses = computeEquippedBonuses(
    state.inventory,
    Boolean(combat.addAllBonusTypes),
  );
  const conditionFx = aggregateConditionEffects(state.conditions ?? []);
  const encumbrance = computeEncumbrance(state, {
    raceFeatures,
    featFeatures: feats,
    classFeatures,
    equippedGear: gear,
  });
  const gearOrManualArmor = gear.armor != null ? gear.armor : combat.armor;
  const itemArmor = itemBonuses.combat.armor.total;
  const armorBonus = stackArmorBonus(gearOrManualArmor, itemArmor);
  const shieldBonus = gear.shield != null ? gear.shield : combat.shield;
  const cappedDex =
    encumbrance.maxDex != null ? Math.min(dexMod, encumbrance.maxDex) : dexMod;
  const loseDex =
    conditionFx.loseDexToAc &&
    !(classFeatures?.uncannyDodge || classFeatures?.improvedUncannyDodge);
  const acDex = loseDex ? 0 : cappedDex;
  const monkUnarmored =
    gear.armor == null &&
    gear.shield == null &&
    (classFeatures?.monkAcBonus ?? 0) > 0;
  const monkAc = monkUnarmored
    ? abilityModifier(abilities.wis) + (classFeatures?.monkAcBonus ?? 0)
    : 0;
  const asfAuto = gear.arcaneSpellFailure;
  const arcaneSpellFailure = resolveDerivedNumber(asfAuto, combat.asfOverride);
  const speedArmor = encumbrance.speedUnhindered
    ? 0
    : encumbrance.speedDelta !== 0
      ? encumbrance.speedDelta
      : combat.speedArmor;

  const racialSave = raceFeatures?.saveBonus ?? { fort: 0, ref: 0, will: 0 };
  const classSaveBonus = classFeatures?.saveBonus ?? { fort: 0, ref: 0, will: 0 };
  const classFortAbility = saveAbilityModFromClassFeatures(
    "fort",
    abilities,
    classFeatures,
    abilityModifier,
  );
  const classRefAbility = saveAbilityModFromClassFeatures(
    "ref",
    abilities,
    classFeatures,
    abilityModifier,
  );
  const classWillAbility = saveAbilityModFromClassFeatures(
    "will",
    abilities,
    classFeatures,
    abilityModifier,
  );

  const bab = computeBaseAttackBonus(identity.classLevels, classAdvancement);
  const grappleSize = grappleSizeModFromAttackSizeMod(combat.sizeMod);
  const itemNatural = itemBonuses.combat.naturalArmor.total;
  const itemDeflection = itemBonuses.combat.deflection.total;
  const itemDodge = itemBonuses.combat.dodge.total;
  const itemFort = itemBonuses.combat.fort.total;
  const itemRef = itemBonuses.combat.ref.total;
  const itemWill = itemBonuses.combat.will.total;
  const itemMelee = itemBonuses.combat.melee.total;
  const itemRanged = itemBonuses.combat.ranged.total;
  const itemInit = itemBonuses.combat.initiative.total;

  const meleeParts = {
    bab,
    stat: strMod,
    size: combat.sizeMod,
    misc: combat.meleeMisc + itemMelee + (conditionFx.meleeMisc ?? 0),
  };
  const rangedParts = {
    bab,
    stat: dexMod,
    size: combat.sizeMod,
    misc: combat.rangedMisc + itemRanged + (conditionFx.rangedMisc ?? 0),
  };
  const grappleParts = {
    bab,
    stat: strMod,
    size: grappleSize,
    misc: combat.grappleMisc,
  };

  const fortParts = {
    class: computeClassSave("fort", identity.classLevels, classAdvancement),
    stat: conMod,
    ability: classFortAbility,
    racial: racialSave.fort,
    misc: combat.fortMisc + classSaveBonus.fort + itemFort + feats.fortBonus,
  };
  const refParts = {
    class: computeClassSave("ref", identity.classLevels, classAdvancement),
    stat: dexMod,
    ability: classRefAbility,
    racial: racialSave.ref,
    misc: combat.refMisc + classSaveBonus.ref + itemRef + feats.refBonus,
  };
  const willParts = {
    class: computeClassSave("will", identity.classLevels, classAdvancement),
    stat: wisMod,
    ability: classWillAbility,
    racial: racialSave.will,
    misc: combat.willMisc + classSaveBonus.will + itemWill + feats.willBonus + rageWill,
  };

  const fightingDefensively = Boolean(state.combatModes?.fightingDefensively);
  const dodgeTotal =
    combat.dodge +
    feats.dodgeBonus +
    itemDodge +
    (fightingDefensively ? 2 : 0);
  const acMisc =
    combat.acMisc + (conditionFx.acMisc ?? 0) + rageAc + monkAc - combatExpertise;

  const acParts = {
    base: 10,
    armor: armorBonus,
    shield: shieldBonus,
    stat: acDex,
    size: combat.sizeMod,
    natural: combat.natural + itemNatural,
    deflection: combat.deflection + itemDeflection,
    dodge: dodgeTotal,
    misc: acMisc,
  };
  const ffDex =
    classFeatures?.uncannyDodge || classFeatures?.improvedUncannyDodge
      ? cappedDex
      : 0;
  const flatFootedParts = {
    base: 10,
    armor: armorBonus,
    shield: shieldBonus,
    stat: ffDex,
    size: combat.sizeMod,
    natural: combat.natural + itemNatural,
    deflection: combat.deflection + itemDeflection,
    misc: combat.acMisc + (conditionFx.acMisc ?? 0) + rageAc + monkAc - combatExpertise,
  };
  const touchParts = {
    base: 10,
    stat: acDex,
    size: combat.sizeMod,
    deflection: combat.deflection + itemDeflection,
    dodge: dodgeTotal,
    misc: combat.acMisc + (conditionFx.acMisc ?? 0) + rageAc - combatExpertise,
  };

  const initParts = {
    stat: dexMod,
    misc: combat.initMisc + feats.initBonus + itemInit,
  };

  const speedParts = {
    base: combat.speedBase,
    armor: speedArmor,
    class: encumbrance.fastMovementBonus,
    feat: encumbrance.fleetSpeedBonus,
    misc: combat.speedMisc,
  };

  const srParts = {
    base: combat.srBase,
    misc: combat.srMisc,
  };

  return {
    bab,
    melee: { total: sumParts(meleeParts), parts: meleeParts },
    ranged: { total: sumParts(rangedParts), parts: rangedParts },
    grapple: { total: sumParts(grappleParts), parts: grappleParts },
    fortitude: { total: sumParts(fortParts), parts: fortParts },
    reflex: { total: sumParts(refParts), parts: refParts },
    will: { total: sumParts(willParts), parts: willParts },
    ac: { total: sumParts(acParts), parts: acParts },
    flatFooted: { total: sumParts(flatFootedParts), parts: flatFootedParts },
    touch: { total: sumParts(touchParts), parts: touchParts },
    initiative: { total: sumParts(initParts), parts: initParts },
    speed: { total: sumParts(speedParts), parts: speedParts },
    spellResistance: { total: sumParts(srParts), parts: srParts },
    itemBonuses,
    arcaneSpellFailure,
  };
}

export function computeArcaneSpellFailure(state: PcPlanState): number {
  const combat = normalizeCombatState(state.combat);
  const gear = computeEquippedGear(state.inventory ?? [], combat.speedBase);
  return resolveDerivedNumber(gear.arcaneSpellFailure, combat.asfOverride);
}

/** Migrate legacy combat blobs from early PC planner saves. */
export function normalizeCombatState(raw: unknown): PcPlanState["combat"] {
  const combat =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const num = (key: string, fallback = 0) => {
    const value = combat[key];
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  };

  const str = (key: string, fallback = "") =>
    typeof combat[key] === "string" ? (combat[key] as string) : fallback;

  const legacyAttacks = str("attacks");
  const specialAttacksRaw = Array.isArray(combat.specialAttacks)
    ? combat.specialAttacks
    : undefined;

  return {
    sizeMod: num("sizeMod"),
    meleeMisc: num("meleeMisc"),
    rangedMisc: num("rangedMisc"),
    grappleMisc: num("grappleMisc"),
    fortMisc: num("fortMisc"),
    refMisc: num("refMisc"),
    willMisc: num("willMisc"),
    initMisc: num("initMisc"),
    armor: num("armor"),
    shield: num("shield"),
    natural: num("natural"),
    deflection: num("deflection"),
    dodge: num("dodge"),
    acMisc: num("acMisc"),
    speedBase: num("speedBase", 30),
    speedArmor: num("speedArmor"),
    speedMisc: num("speedMisc"),
    srBase: num("srBase"),
    srMisc: num("srMisc"),
    attacks: legacyAttacks,
    ...(specialAttacksRaw != null ? { specialAttacks: specialAttacksRaw as PcPlanState["combat"]["specialAttacks"] } : {}),
    asfOverride:
      combat.asfOverride != null && Number.isFinite(combat.asfOverride)
        ? Math.max(0, Math.min(100, Math.trunc(combat.asfOverride as number)))
        : null,
    addAllBonusTypes: Boolean(combat.addAllBonusTypes),
    suppressSynergies: Boolean(combat.suppressSynergies),
  };
}

type CombatNumericKey = Exclude<
  keyof PcPlanState["combat"],
  "attacks" | "specialAttacks" | "asfOverride" | "addAllBonusTypes" | "suppressSynergies"
>;

export function patchCombatNumber(
  state: PcPlanState,
  key: CombatNumericKey,
  raw: string,
): PcPlanState {
  const next = structuredClone(state);
  next.combat[key] = raw === "" ? 0 : Number(raw);
  return next;
}
