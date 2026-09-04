import { abilityModifier } from "./combatStats";
import {
  getClassCastingInfo,
  usesDirectClassSpellList,
  type ClassCastingInfo,
} from "./classCasting";
import {
  parseSpellsKnownFromHtml,
  parseSpellsPerDayFromAdvancementHtml,
} from "./parseClassSpellTables";
import type { AbilityKey, SpellEntry } from "./types";

export type SlotArray = number[];

export type ClassSpellTableContext = {
  advancementHtml?: string | null;
  descriptionHtml?: string | null;
};

export type ComputedSpellClass = {
  slots: SlotArray;
  baseSlots: SlotArray;
  bonusSlots: SlotArray;
  /** Spells known limits per level (spontaneous casters). Empty for prepared. */
  known: SlotArray;
  maxSpellLevel: number;
  mode: "preparation" | "spontaneous";
  dcAbility: AbilityKey;
  dcModifier: number;
};

function emptySlots(): SlotArray {
  return Array.from({ length: 10 }, () => 0);
}

function addSlot(slots: SlotArray, level: number, count = 1): void {
  if (level >= 0 && level <= 9) {
    slots[level] += count;
  }
}

/** FG bonus formula; L0 always returns 0. */
export function bonusSlotsForLevel(abilityScore: number, spellLevel: number): number {
  if (spellLevel < 1 || spellLevel > 9) return 0;
  const threshold = 10 + spellLevel * 2;
  if (abilityScore < threshold) return 0;
  return Math.floor((abilityScore - threshold) / 8) + 1;
}

type LevelGain = { level: number; count?: number };

type PreparedLevelStep = {
  gains: LevelGain[];
  newMaxSpellLevel: number;
};

/** Per-CL slot gains for wizard/cleric/druid (3.5E, non-PFRPG). */
function preparedCasterStep(cl: number, isWizard: boolean): PreparedLevelStep {
  switch (cl) {
    case 1:
      return { gains: [{ level: 0, count: 3 }, { level: 1 }], newMaxSpellLevel: 1 };
    case 2:
      return { gains: [{ level: 0 }, { level: 1 }], newMaxSpellLevel: 0 };
    case 3:
      return { gains: [{ level: 2 }], newMaxSpellLevel: 2 };
    case 4:
      return {
        gains: [...(isWizard ? [] : [{ level: 0 }]), { level: 1 }, { level: 2 }],
        newMaxSpellLevel: 0,
      };
    case 5:
      return { gains: [{ level: 3 }], newMaxSpellLevel: 3 };
    case 6:
      return { gains: [{ level: 2 }, { level: 3 }], newMaxSpellLevel: 0 };
    case 7:
      return {
        gains: [...(isWizard ? [] : [{ level: 0 }]), { level: 1 }, { level: 4 }],
        newMaxSpellLevel: 4,
      };
    case 8:
      return { gains: [{ level: 3 }, { level: 4 }], newMaxSpellLevel: 0 };
    case 9:
      return { gains: [{ level: 2 }, { level: 5 }], newMaxSpellLevel: 5 };
    case 10:
      return { gains: [{ level: 4 }, { level: 5 }], newMaxSpellLevel: 0 };
    case 11:
      return {
        gains: [...(isWizard ? [] : [{ level: 1 }]), { level: 3 }, { level: 6 }],
        newMaxSpellLevel: 6,
      };
    case 12:
      return { gains: [{ level: 5 }, { level: 6 }], newMaxSpellLevel: 0 };
    case 13:
      return {
        gains: [...(isWizard ? [] : [{ level: 2 }]), { level: 4 }, { level: 7 }],
        newMaxSpellLevel: 7,
      };
    case 14:
      return { gains: [{ level: 6 }, { level: 7 }], newMaxSpellLevel: 0 };
    case 15:
      return {
        gains: [...(isWizard ? [] : [{ level: 3 }]), { level: 5 }, { level: 8 }],
        newMaxSpellLevel: 8,
      };
    case 16:
      return { gains: [{ level: 7 }, { level: 8 }], newMaxSpellLevel: 0 };
    case 17:
      return {
        gains: [...(isWizard ? [] : [{ level: 4 }]), { level: 6 }, { level: 9 }],
        newMaxSpellLevel: 9,
      };
    case 18:
      return { gains: [{ level: 8 }, { level: 9 }], newMaxSpellLevel: 0 };
    case 19:
      return {
        gains: [...(isWizard ? [] : [{ level: 5 }]), { level: 7 }, { level: 9 }],
        newMaxSpellLevel: 0,
      };
    case 20:
      return { gains: [{ level: 8 }, { level: 9 }], newMaxSpellLevel: 0 };
    default:
      return { gains: [], newMaxSpellLevel: 0 };
  }
}

function spontaneousCasterStep(cl: number, fgClassName: string): PreparedLevelStep {
  const isBard = fgClassName.toLowerCase() === "bard";
  if (isBard) {
    switch (cl) {
      case 1:
        return { gains: [{ level: 0, count: 2 }], newMaxSpellLevel: 0 };
      case 2:
        return { gains: [{ level: 0 }], newMaxSpellLevel: 0 };
      case 3:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 1 };
      case 4:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 5:
        return { gains: [{ level: 2 }], newMaxSpellLevel: 2 };
      case 6:
        return { gains: [{ level: 0 }, { level: 1 }], newMaxSpellLevel: 0 };
      case 7:
        return { gains: [{ level: 3 }], newMaxSpellLevel: 3 };
      case 8:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 9:
        return { gains: [{ level: 4 }], newMaxSpellLevel: 4 };
      case 10:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 11:
        return { gains: [{ level: 5 }], newMaxSpellLevel: 5 };
      case 12:
        return { gains: [{ level: 0 }], newMaxSpellLevel: 0 };
      case 13:
        return { gains: [{ level: 6 }], newMaxSpellLevel: 6 };
      case 14:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 15:
        return { gains: [{ level: 7 }], newMaxSpellLevel: 7 };
      case 16:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 17:
        return { gains: [{ level: 8 }], newMaxSpellLevel: 8 };
      case 18:
        return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
      case 19:
        return { gains: [{ level: 9 }], newMaxSpellLevel: 9 };
      case 20:
        return { gains: [{ level: 9 }], newMaxSpellLevel: 0 };
      default:
        return { gains: [], newMaxSpellLevel: 0 };
    }
  }

  switch (cl) {
    case 1:
      return { gains: [{ level: 0, count: 5 }, { level: 1, count: 3 }], newMaxSpellLevel: 1 };
    case 2:
      return { gains: [{ level: 0 }, { level: 1 }], newMaxSpellLevel: 0 };
    case 3:
      return { gains: [{ level: 1 }], newMaxSpellLevel: 0 };
    case 4:
      return { gains: [{ level: 1 }, { level: 2, count: 3 }], newMaxSpellLevel: 2 };
    case 5:
      return { gains: [{ level: 2 }], newMaxSpellLevel: 0 };
    case 6:
      return { gains: [{ level: 2 }, { level: 3, count: 3 }], newMaxSpellLevel: 3 };
    case 7:
      return { gains: [{ level: 3 }], newMaxSpellLevel: 0 };
    case 8:
      return { gains: [{ level: 3 }, { level: 4, count: 3 }], newMaxSpellLevel: 4 };
    case 9:
      return { gains: [{ level: 4 }], newMaxSpellLevel: 0 };
    case 10:
      return { gains: [{ level: 4 }, { level: 5, count: 3 }], newMaxSpellLevel: 5 };
    case 11:
      return { gains: [{ level: 5 }], newMaxSpellLevel: 0 };
    case 12:
      return { gains: [{ level: 5 }, { level: 6, count: 3 }], newMaxSpellLevel: 6 };
    case 13:
      return { gains: [{ level: 6 }], newMaxSpellLevel: 0 };
    case 14:
      return { gains: [{ level: 6 }, { level: 7, count: 3 }], newMaxSpellLevel: 7 };
    case 15:
      return { gains: [{ level: 7 }], newMaxSpellLevel: 0 };
    case 16:
      return { gains: [{ level: 7 }, { level: 8, count: 3 }], newMaxSpellLevel: 8 };
    case 17:
      return { gains: [{ level: 8 }], newMaxSpellLevel: 0 };
    case 18:
      return { gains: [{ level: 8 }, { level: 9, count: 3 }], newMaxSpellLevel: 9 };
    case 19:
      return { gains: [{ level: 9 }], newMaxSpellLevel: 0 };
    case 20:
      return { gains: [{ level: 9 }], newMaxSpellLevel: 0 };
    default:
      return { gains: [], newMaxSpellLevel: 0 };
  }
}

/** PHB Table 3-17 — cumulative sorcerer spells known by class level. */
const SORCERER_KNOWN_BY_LEVEL: number[][] = [
  [],
  [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  [6, 3, 1, 0, 0, 0, 0, 0, 0, 0],
  [6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  [7, 4, 2, 1, 0, 0, 0, 0, 0, 0],
  [7, 5, 3, 2, 0, 0, 0, 0, 0, 0],
  [8, 5, 3, 2, 1, 0, 0, 0, 0, 0],
  [8, 5, 4, 3, 2, 0, 0, 0, 0, 0],
  [9, 5, 4, 3, 2, 1, 0, 0, 0, 0],
  [9, 5, 5, 4, 3, 2, 0, 0, 0, 0],
  [9, 5, 5, 4, 3, 2, 1, 0, 0, 0],
  [9, 5, 5, 4, 4, 3, 2, 0, 0, 0],
  [9, 5, 5, 4, 4, 3, 2, 1, 0, 0],
  [9, 5, 5, 4, 4, 4, 3, 2, 0, 0],
  [9, 5, 5, 4, 4, 4, 3, 2, 1, 0],
  [9, 5, 5, 4, 4, 4, 3, 3, 2, 0],
  [9, 5, 5, 4, 4, 4, 3, 3, 2, 1],
  [9, 5, 5, 4, 4, 4, 3, 3, 3, 2],
  [9, 5, 5, 4, 4, 4, 3, 3, 3, 3],
];

/** PHB Table 3-10 — cumulative bard spells known by class level. */
const BARD_KNOWN_BY_LEVEL: number[][] = [
  [],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 3, 1, 0, 0, 0, 0, 0, 0, 0],
  [5, 3, 2, 0, 0, 0, 0, 0, 0, 0],
  [5, 4, 2, 1, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  [5, 4, 4, 3, 2, 0, 0, 0, 0, 0],
  [5, 4, 4, 3, 2, 1, 0, 0, 0, 0],
  [5, 4, 4, 4, 3, 2, 0, 0, 0, 0],
  [5, 4, 4, 4, 3, 3, 1, 0, 0, 0],
  [5, 4, 4, 4, 4, 3, 2, 0, 0, 0],
  [5, 4, 4, 4, 4, 4, 2, 1, 0, 0],
  [5, 4, 4, 4, 4, 4, 3, 2, 0, 0],
  [5, 4, 4, 4, 4, 4, 3, 2, 1, 0],
  [5, 4, 4, 4, 4, 4, 3, 3, 2, 0],
  [5, 4, 4, 4, 4, 4, 3, 3, 2, 1],
  [5, 4, 4, 4, 4, 4, 3, 3, 3, 2],
];

function maxSpellLevelFromSlots(slots: SlotArray): number {
  let max = 0;
  for (let i = 1; i <= 9; i++) {
    if (slots[i] > 0) max = i;
  }
  return max;
}

function phbKnownForLevel(fgClassName: string, casterLevel: number): SlotArray {
  const cl = Math.min(Math.max(casterLevel, 0), 20);
  const isBard = fgClassName.toLowerCase() === "bard";
  const table = isBard ? BARD_KNOWN_BY_LEVEL : SORCERER_KNOWN_BY_LEVEL;
  return [...(table[cl] ?? emptySlots())];
}

function applyBonusSlotsToBase(baseSlots: SlotArray, abilityScore: number): SlotArray {
  const slots = [...baseSlots];
  const maxLevel = maxSpellLevelFromSlots(baseSlots);
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const bonus = bonusSlotsForLevel(abilityScore, lvl);
    if (bonus > 0) slots[lvl] += bonus;
  }
  return slots;
}

function variantBaseSlots(
  spellTables: ClassSpellTableContext | undefined,
  casterLevel: number,
): SlotArray | null {
  if (!spellTables?.advancementHtml) return null;
  const parsed = parseSpellsPerDayFromAdvancementHtml(spellTables.advancementHtml, casterLevel);
  return parsed ? [...parsed] : null;
}

function variantKnownSlots(
  spellTables: ClassSpellTableContext | undefined,
  casterLevel: number,
): SlotArray | null {
  const fromDesc = parseSpellsKnownFromHtml(spellTables?.descriptionHtml, casterLevel);
  if (fromDesc) return [...fromDesc];
  return parseSpellsKnownFromHtml(spellTables?.advancementHtml, casterLevel);
}

function casterKind(
  info: ClassCastingInfo | null,
  fgClassName: string,
): "prepared" | "spontaneous" | "half" | null {
  if (info?.progression === "spontaneous") return "spontaneous";
  if (info?.progression === "half") return "half";
  if (info?.progression === "prepared") return "prepared";
  const normalized = fgClassName.toLowerCase();
  if (
    normalized === "wizard" ||
    normalized === "cleric" ||
    normalized === "druid" ||
    normalized === "witch"
  ) {
    return "prepared";
  }
  if (normalized === "sorcerer" || normalized === "bard") return "spontaneous";
  if (normalized === "paladin" || normalized === "ranger") return "half";
  return null;
}

/**
 * PHB paladin/ranger spells per day by class level (1st–4th only).
 * "0" means bonus-only; null/absent means no access.
 */
const HALF_CASTER_BASE_BY_LEVEL: Array<Array<number | undefined>> = [
  [],
  [],
  [],
  [],
  [undefined, 0],
  [undefined, 0],
  [undefined, 1],
  [undefined, 1],
  [undefined, 1, 0],
  [undefined, 1, 0],
  [undefined, 1, 1],
  [undefined, 1, 1, 0],
  [undefined, 1, 1, 1],
  [undefined, 1, 1, 1],
  [undefined, 2, 1, 1, 0],
  [undefined, 2, 1, 1, 1],
  [undefined, 2, 2, 1, 1],
  [undefined, 2, 2, 2, 1],
  [undefined, 3, 2, 2, 1],
  [undefined, 3, 3, 3, 2],
  [undefined, 3, 3, 3, 3],
];

function halfCasterBaseSlots(classLevel: number): { slots: SlotArray; maxSpellLevel: number } {
  const slots = emptySlots();
  const row = HALF_CASTER_BASE_BY_LEVEL[Math.min(Math.max(classLevel, 0), 20)] ?? [];
  let maxSpellLevel = 0;
  for (let lvl = 1; lvl <= 4; lvl++) {
    const value = row[lvl];
    if (value != null) {
      slots[lvl] = value;
      maxSpellLevel = lvl;
    }
  }
  return { slots, maxSpellLevel };
}

function addDomainOrSpecialistSlots(baseSlots: SlotArray): SlotArray {
  const next = [...baseSlots];
  for (let lvl = 1; lvl <= 9; lvl++) {
    if (baseSlots[lvl] > 0) next[lvl] += 1;
  }
  return next;
}

function applyPreparedLevel(
  slots: SlotArray,
  cl: number,
  isWizard: boolean,
  abilityScore: number,
): number {
  const { gains, newMaxSpellLevel } = preparedCasterStep(cl, isWizard);
  for (const g of gains) {
    addSlot(slots, g.level, g.count ?? 1);
  }
  if (newMaxSpellLevel >= 1 && newMaxSpellLevel <= 9) {
    const bonus = bonusSlotsForLevel(abilityScore, newMaxSpellLevel);
    if (bonus > 0) addSlot(slots, newMaxSpellLevel, bonus);
  }
  return newMaxSpellLevel;
}

function applySpontaneousLevel(
  slots: SlotArray,
  cl: number,
  fgClassName: string,
  abilityScore: number,
): number {
  const { gains, newMaxSpellLevel } = spontaneousCasterStep(cl, fgClassName);
  for (const g of gains) {
    addSlot(slots, g.level, g.count ?? 1);
  }
  if (newMaxSpellLevel >= 1 && newMaxSpellLevel <= 9) {
    const bonus = bonusSlotsForLevel(abilityScore, newMaxSpellLevel);
    if (bonus > 0) addSlot(slots, newMaxSpellLevel, bonus);
  }
  return newMaxSpellLevel;
}

/** Build cumulative base+bonus slots by replaying CL 1..casterLevel. */
export function buildBaseSlots(
  fgClassName: string,
  casterLevel: number,
  abilityScore: number,
  classSlug?: string,
  className?: string,
): { slots: SlotArray; maxSpellLevel: number } {
  const slots = emptySlots();
  let maxSpellLevel = 0;
  const info = classSlug ? getClassCastingInfo(classSlug, className) : null;
  const kind = casterKind(info, fgClassName);
  const isWizard = fgClassName.toLowerCase() === "wizard";

  if (!kind || casterLevel < 1) {
    return { slots, maxSpellLevel };
  }

  if (kind === "half") {
    const half = halfCasterBaseSlots(casterLevel);
    for (let i = 0; i <= 9; i++) slots[i] = half.slots[i];
    maxSpellLevel = half.maxSpellLevel;
    for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
      const bonus = bonusSlotsForLevel(abilityScore, lvl);
      if (bonus > 0) slots[lvl] += bonus;
    }
    return { slots, maxSpellLevel };
  }

  for (let cl = 1; cl <= Math.min(casterLevel, 20); cl++) {
    const newLevel =
      kind === "spontaneous"
        ? applySpontaneousLevel(slots, cl, fgClassName, abilityScore)
        : applyPreparedLevel(slots, cl, isWizard, abilityScore);
    if (newLevel > maxSpellLevel) maxSpellLevel = newLevel;
  }

  return { slots, maxSpellLevel };
}

/** Split base vs bonus for display (bonus recomputed from max unlocked levels). */
export function splitBaseAndBonus(
  fgClassName: string,
  casterLevel: number,
  abilityScore: number,
  classSlug?: string,
  className?: string,
): { baseSlots: SlotArray; bonusSlots: SlotArray; maxSpellLevel: number } {
  const baseSlots = emptySlots();
  let maxSpellLevel = 0;
  const info = classSlug ? getClassCastingInfo(classSlug, className) : null;
  const kind = casterKind(info, fgClassName);
  const isWizard = fgClassName.toLowerCase() === "wizard";

  if (!kind || casterLevel < 1) {
    return { baseSlots, bonusSlots: emptySlots(), maxSpellLevel };
  }

  if (kind === "half") {
    const half = halfCasterBaseSlots(casterLevel);
    for (let i = 0; i <= 9; i++) baseSlots[i] = half.slots[i];
    maxSpellLevel = half.maxSpellLevel;
  } else {
    for (let cl = 1; cl <= Math.min(casterLevel, 20); cl++) {
      const { gains, newMaxSpellLevel } =
        kind === "spontaneous"
          ? spontaneousCasterStep(cl, fgClassName)
          : preparedCasterStep(cl, isWizard);
      for (const g of gains) {
        addSlot(baseSlots, g.level, g.count ?? 1);
      }
      if (newMaxSpellLevel > maxSpellLevel) maxSpellLevel = newMaxSpellLevel;
    }
  }

  const bonusSlots = emptySlots();
  for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
    const bonus = bonusSlotsForLevel(abilityScore, lvl);
    if (bonus > 0) bonusSlots[lvl] = bonus;
  }

  return { baseSlots, bonusSlots, maxSpellLevel };
}

export function preparedCountAtLevel(spells: SpellEntry[], level: number): number {
  return spells
    .filter((sp) => sp.level === level)
    .reduce((sum, sp) => sum + Math.max(0, sp.prepared ?? 1), 0);
}

export function computeSpellClass(
  classSlug: string,
  className: string,
  casterLevel: number,
  abilityScores: Record<AbilityKey, number>,
  spellTables?: ClassSpellTableContext,
  options?: {
    hasDomains?: boolean;
    specialistSchool?: string | null;
  },
): ComputedSpellClass {
  const info = getClassCastingInfo(classSlug, className);
  const fgName = info?.fgClassName ?? className;
  const useDirectTable = usesDirectClassSpellList(classSlug, className);
  const isHalf = info?.progression === "half";

  let mode: "preparation" | "spontaneous" =
    info?.progression === "spontaneous" ? "spontaneous" : "preparation";
  if (!useDirectTable && !isHalf && spellTables) {
    const variantKnown = variantKnownSlots(spellTables, casterLevel);
    if (variantKnown?.some((count) => count > 0)) {
      mode = "spontaneous";
    }
  }

  const ability = info?.dcAbility ?? (mode === "spontaneous" ? "cha" : "int");
  const score = abilityScores[ability] ?? 10;

  let baseSlots: SlotArray;
  let bonusSlots: SlotArray;
  let maxSpellLevel: number;
  let known: SlotArray = emptySlots();

  if (isHalf) {
    const split = splitBaseAndBonus(fgName, casterLevel, score, classSlug, className);
    baseSlots = split.baseSlots;
    bonusSlots = split.bonusSlots;
    maxSpellLevel = split.maxSpellLevel;
  } else if (!useDirectTable && spellTables) {
    const variantBase = variantBaseSlots(spellTables, casterLevel) ?? emptySlots();
    baseSlots = variantBase;
    const withBonus = applyBonusSlotsToBase(baseSlots, score);
    bonusSlots = emptySlots();
    for (let i = 0; i <= 9; i++) {
      bonusSlots[i] = Math.max(0, withBonus[i] - baseSlots[i]);
    }
    maxSpellLevel = maxSpellLevelFromSlots(withBonus);
    if (mode === "spontaneous") {
      known = variantKnownSlots(spellTables, casterLevel) ?? emptySlots();
    }
  } else {
    const split = splitBaseAndBonus(fgName, casterLevel, score, classSlug, className);
    baseSlots = split.baseSlots;
    bonusSlots = split.bonusSlots;
    maxSpellLevel = split.maxSpellLevel;
    if (mode === "spontaneous") {
      known = phbKnownForLevel(fgName, casterLevel);
    }
  }

  const isCleric = fgName.toLowerCase() === "cleric";
  const isWizard = fgName.toLowerCase() === "wizard";
  if ((isCleric && options?.hasDomains) || (isWizard && options?.specialistSchool)) {
    baseSlots = addDomainOrSpecialistSlots(baseSlots);
  }

  const slots = emptySlots();
  for (let i = 0; i <= 9; i++) {
    slots[i] = baseSlots[i] + bonusSlots[i];
  }
  maxSpellLevel = maxSpellLevelFromSlots(slots);

  return {
    slots,
    baseSlots,
    bonusSlots,
    known,
    maxSpellLevel,
    mode,
    dcAbility: ability,
    dcModifier: abilityModifier(score),
  };
}

export function formatSlotSummary(slots: SlotArray): string {
  const parts: string[] = [];
  for (let i = 0; i <= 9; i++) {
    if (slots[i] > 0) parts.push(`L${i}:${slots[i]}`);
  }
  return parts.length > 0 ? parts.join(" ") : "—";
}
