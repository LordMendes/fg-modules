import { getClassCombatInfo, babFromClassLevel, saveFromClassLevel } from "./classCombat";
import {
  saveAbilityModFromClassFeatures,
  type ClassDerivedFeatures,
} from "./parseClassAbilityEffects";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import type { PcPlanState } from "./types";

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
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function sumParts(parts: Record<string, number>): number {
  return Object.values(parts).reduce((sum, n) => sum + n, 0);
}

export function computeBaseAttackBonus(classLevels: PcPlanState["identity"]["classLevels"]): number {
  let total = 0;
  for (const cl of classLevels) {
    const info = getClassCombatInfo(cl.classSlug, cl.className);
    total += babFromClassLevel(cl.level, info.bab);
  }
  return total;
}

export function computeClassSave(
  save: "fort" | "ref" | "will",
  classLevels: PcPlanState["identity"]["classLevels"],
): number {
  let total = 0;
  for (const cl of classLevels) {
    const info = getClassCombatInfo(cl.classSlug, cl.className);
    total += saveFromClassLevel(cl.level, info[save]);
  }
  return total;
}

export function computeCombatStats(
  state: PcPlanState,
  raceFeatures: RaceDerivedFeatures | null = null,
  classFeatures: ClassDerivedFeatures | null = null,
): CombatComputed {
  const { combat, abilities, identity } = state;

  const strMod = abilityModifier(abilities.str);
  const dexMod = abilityModifier(abilities.dex);
  const conMod = abilityModifier(abilities.con);
  const wisMod = abilityModifier(abilities.wis);

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

  const bab = computeBaseAttackBonus(identity.classLevels);

  const meleeParts = {
    bab,
    stat: strMod,
    size: combat.sizeMod,
    misc: combat.meleeMisc,
  };
  const rangedParts = {
    bab,
    stat: dexMod,
    size: combat.sizeMod,
    misc: combat.rangedMisc,
  };
  const grappleParts = {
    bab,
    stat: strMod,
    size: combat.sizeMod,
    misc: combat.grappleMisc,
  };

  const fortParts = {
    class: computeClassSave("fort", identity.classLevels),
    stat: conMod,
    ability: classFortAbility,
    misc: combat.fortMisc + racialSave.fort + classSaveBonus.fort,
  };
  const refParts = {
    class: computeClassSave("ref", identity.classLevels),
    stat: dexMod,
    ability: classRefAbility,
    misc: combat.refMisc + racialSave.ref + classSaveBonus.ref,
  };
  const willParts = {
    class: computeClassSave("will", identity.classLevels),
    stat: wisMod,
    ability: classWillAbility,
    misc: combat.willMisc + racialSave.will + classSaveBonus.will,
  };

  const acParts = {
    base: 10,
    armor: combat.armor,
    shield: combat.shield,
    stat: dexMod,
    size: combat.sizeMod,
    natural: combat.natural,
    deflection: combat.deflection,
    dodge: combat.dodge,
    misc: combat.acMisc,
  };
  const flatFootedParts = {
    base: 10,
    armor: combat.armor,
    shield: combat.shield,
    size: combat.sizeMod,
    natural: combat.natural,
    deflection: combat.deflection,
    misc: combat.acMisc,
  };
  const touchParts = {
    base: 10,
    stat: dexMod,
    size: combat.sizeMod,
    deflection: combat.deflection,
    dodge: combat.dodge,
    misc: combat.acMisc,
  };

  const initParts = {
    stat: dexMod,
    misc: combat.initMisc,
  };

  const speedParts = {
    base: combat.speedBase,
    armor: combat.speedArmor,
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
  };
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
    attacks: str("attacks"),
  };
}

export function patchCombatNumber(
  state: PcPlanState,
  key: keyof PcPlanState["combat"],
  raw: string,
): PcPlanState {
  if (key === "attacks") return state;
  const next = structuredClone(state);
  next.combat[key] = raw === "" ? 0 : Number(raw);
  return next;
}
