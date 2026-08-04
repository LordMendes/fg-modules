import { getClassCastingInfo } from "./classCasting";
import type { AbilityKey } from "./types";

export type SlotArray = number[];

export type ComputedSpellClass = {
  slots: SlotArray;
  baseSlots: SlotArray;
  bonusSlots: SlotArray;
  maxSpellLevel: number;
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

/** Build cumulative base+bonus slots by replaying CL 1..casterLevel. */
export function buildBaseSlots(
  fgClassName: string,
  casterLevel: number,
  abilityScore: number,
): { slots: SlotArray; maxSpellLevel: number } {
  const slots = emptySlots();
  let maxSpellLevel = 0;
  const normalized = fgClassName.toLowerCase();
  const isWizard = normalized === "wizard";
  const isPrepared =
    normalized === "wizard" ||
    normalized === "cleric" ||
    normalized === "druid" ||
    normalized === "witch";

  if (!isPrepared || casterLevel < 1) {
    return { slots, maxSpellLevel };
  }

  for (let cl = 1; cl <= Math.min(casterLevel, 20); cl++) {
    const newLevel = applyPreparedLevel(slots, cl, isWizard, abilityScore);
    if (newLevel > maxSpellLevel) maxSpellLevel = newLevel;
  }

  return { slots, maxSpellLevel };
}

/** Split base vs bonus for display (bonus recomputed from max unlocked levels). */
export function splitBaseAndBonus(
  fgClassName: string,
  casterLevel: number,
  abilityScore: number,
): { baseSlots: SlotArray; bonusSlots: SlotArray; maxSpellLevel: number } {
  const baseSlots = emptySlots();
  let maxSpellLevel = 0;
  const normalized = fgClassName.toLowerCase();
  const isWizard = normalized === "wizard";
  const isPrepared =
    normalized === "wizard" ||
    normalized === "cleric" ||
    normalized === "druid" ||
    normalized === "witch";

  if (!isPrepared || casterLevel < 1) {
    return { baseSlots, bonusSlots: emptySlots(), maxSpellLevel };
  }

  for (let cl = 1; cl <= Math.min(casterLevel, 20); cl++) {
    const { gains, newMaxSpellLevel } = preparedCasterStep(cl, isWizard);
    for (const g of gains) {
      addSlot(baseSlots, g.level, g.count ?? 1);
    }
    if (newMaxSpellLevel > maxSpellLevel) maxSpellLevel = newMaxSpellLevel;
  }

  const bonusSlots = emptySlots();
  for (let lvl = 1; lvl <= maxSpellLevel; lvl++) {
    const bonus = bonusSlotsForLevel(abilityScore, lvl);
    if (bonus > 0) bonusSlots[lvl] = bonus;
  }

  return { baseSlots, bonusSlots, maxSpellLevel };
}

export function computeSpellClass(
  classSlug: string,
  className: string,
  casterLevel: number,
  abilityScores: Record<AbilityKey, number>,
): ComputedSpellClass {
  const info = getClassCastingInfo(classSlug, className);
  const fgName = info?.fgClassName ?? className;
  const ability = info?.dcAbility ?? "int";
  const score = abilityScores[ability] ?? 10;

  const { baseSlots, bonusSlots, maxSpellLevel } = splitBaseAndBonus(
    fgName,
    casterLevel,
    score,
  );

  const slots = emptySlots();
  for (let i = 0; i <= 9; i++) {
    slots[i] = baseSlots[i] + bonusSlots[i];
  }

  return { slots, baseSlots, bonusSlots, maxSpellLevel };
}

export function formatSlotSummary(slots: SlotArray): string {
  const parts: string[] = [];
  for (let i = 0; i <= 9; i++) {
    if (slots[i] > 0) parts.push(`L${i}:${slots[i]}`);
  }
  return parts.length > 0 ? parts.join(" ") : "—";
}
