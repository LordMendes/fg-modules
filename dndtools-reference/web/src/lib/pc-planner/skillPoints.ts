import { abilityModifier } from "./combatStats";
import type { RacialSkillPointBonus } from "./parseRaceFeatures";
import type { AbilityKey, ClassLevelEntry, PcPlanState, SkillRow } from "./types";

const SKILL_ABILITY_KEYS: Record<string, AbilityKey> = {
  str: "str",
  strength: "str",
  dex: "dex",
  dexterity: "dex",
  con: "con",
  constitution: "con",
  int: "int",
  intelligence: "int",
  wis: "wis",
  wisdom: "wis",
  cha: "cha",
  charisma: "cha",
};

export function skillAbilityKey(ability: string | null | undefined): AbilityKey | null {
  if (!ability) return null;
  return SKILL_ABILITY_KEYS[ability.trim().toLowerCase()] ?? null;
}

export function computeSkillTotal(
  row: SkillRow,
  abilities: Record<AbilityKey, number>,
  armorCheckPenalty = 0,
): number | null {
  if (row.trainedOnly && !(row.ranks > 0)) return null;
  const abilityKey = skillAbilityKey(row.ability);
  const statMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0;
  const acp = row.armorCheckPenalty ? armorCheckPenalty : 0;
  return row.ranks + statMod + (row.racialMisc ?? 0) + row.misc + acp;
}

export function formatSkillModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function isClassSkillRow(row: SkillRow, classSkillKeys: Set<string>): boolean {
  return classSkillKeys.has(row.slug ?? row.name.toLowerCase());
}

/** Max ranks: class = HD+3, cross-class = floor((HD+3)/2). */
export function maxSkillRanks(hitDice: number, isClassSkill: boolean): number {
  const hd = Math.max(0, Math.trunc(hitDice));
  const classMax = hd + 3;
  return isClassSkill ? classMax : Math.floor(classMax / 2);
}

/** Skill points spent: class 1/rank, cross-class 2/rank (supports half ranks). */
export function computeSkillRanksSpent(
  skills: SkillRow[],
  classSkillKeys: Set<string> = new Set(),
): number {
  return skills.reduce((sum, row) => {
    const ranks = Number.isFinite(row.ranks) ? row.ranks : 0;
    if (ranks <= 0) return sum;
    const isClass =
      classSkillKeys.size === 0 ? true : isClassSkillRow(row, classSkillKeys);
    return sum + (isClass ? ranks : ranks * 2);
  }, 0);
}

export type SkillPointBudgetLine = {
  label: string;
  value: number;
  /** Sub-line under a class heading in the tooltip. */
  indent?: boolean;
};

export function totalCharacterLevel(classLevels: ClassLevelEntry[]): number {
  return classLevels.reduce((sum, cl) => sum + (cl.level > 0 ? cl.level : 0), 0);
}

/** First class for ×4 skill points; falls back when saved slug is stale. */
export function effectiveFirstClassSlug(
  classLevels: ClassLevelEntry[],
  firstClassSlug: string | null | undefined,
): string | null {
  if (firstClassSlug && classLevels.some((cl) => cl.classSlug === firstClassSlug)) {
    return firstClassSlug;
  }
  return classLevels[0]?.classSlug ?? null;
}

export function computeRacialSkillPointBudget(
  characterLevel: number,
  bonus: RacialSkillPointBonus | null,
): number {
  if (!bonus || characterLevel <= 0) return 0;
  const additionalLevels = Math.max(0, characterLevel - 1);
  return bonus.firstLevel + additionalLevels * bonus.perAdditionalLevel;
}

export function computeRacialSkillPointBudgetBreakdown(
  characterLevel: number,
  bonus: RacialSkillPointBonus | null,
  raceName?: string,
): SkillPointBudgetLine[] {
  if (!bonus || characterLevel <= 0) return [];

  const additionalLevels = Math.max(0, characterLevel - 1);
  const additionalTotal = additionalLevels * bonus.perAdditionalLevel;
  const total = bonus.firstLevel + additionalTotal;
  const lines: SkillPointBudgetLine[] = [
    {
      label: `${raceName ?? "Racial"} (+${bonus.perAdditionalLevel} pt/lv, +${bonus.firstLevel} at 1st)`,
      value: total,
    },
    { label: "1st level bonus", value: bonus.firstLevel, indent: true },
  ];

  if (additionalLevels > 0) {
    lines.push({
      label:
        additionalLevels === 1
          ? "Additional level"
          : `Additional levels (${additionalLevels}×${bonus.perAdditionalLevel})`,
      value: additionalTotal,
      indent: true,
    });
  }

  return lines;
}
/** Skill points gained when taking a character level (×4 only at 1st character level). */
export function skillPointsForCharacterLevelGain(
  perLevel: number,
  isFirstCharacterLevel: boolean,
): number {
  return isFirstCharacterLevel ? perLevel * 4 : perLevel;
}

/** Per-class and per-level contributions to the skill point budget. */
export function computeSkillPointBudgetBreakdown(
  classLevels: ClassLevelEntry[],
  skillPointBaseBySlug: Record<string, number>,
  intScore: number,
  defaultBase = 2,
  firstClassSlug: string | null = null,
): SkillPointBudgetLine[] {
  const lines: SkillPointBudgetLine[] = [];
  const effectiveFirst =
    firstClassSlug ?? (classLevels.length > 0 ? classLevels[0].classSlug : null);
  let firstGainApplied = false;

  for (const cl of classLevels) {
    if (cl.level <= 0) continue;
    const base = skillPointBaseBySlug[cl.classSlug] ?? defaultBase;
    const perLevel = skillPointsPerClassLevel(base, intScore);
    let classTotal = 0;
    const classLines: SkillPointBudgetLine[] = [];

    for (let lvl = 1; lvl <= cl.level; lvl++) {
      const isFirstCharacterLevel =
        !firstGainApplied && effectiveFirst != null && cl.classSlug === effectiveFirst && lvl === 1;
      const points = skillPointsForCharacterLevelGain(perLevel, isFirstCharacterLevel);
      classTotal += points;
      classLines.push({
        label: isFirstCharacterLevel ? `Level ${lvl} (×4)` : `Level ${lvl}`,
        value: points,
        indent: true,
      });
      if (isFirstCharacterLevel) firstGainApplied = true;
    }

    lines.push({
      label: `${cl.className} (${formatSkillPointsPerLevel(perLevel)}/lv)`,
      value: classTotal,
    });
    lines.push(...classLines);
  }

  return lines;
}

export function formatSkillPointsPerLevel(perLevel: number): string {
  return `${perLevel} pt`;
}

export function formatSkillPointBudgetLine(line: SkillPointBudgetLine): string {
  const prefix = line.indent ? "  " : "";
  return `${prefix}${line.label}: ${line.value}`;
}

/** Parse compendium values like "2+ Int" or "8 + Int" into the numeric base per level. */
export function parseClassSkillPointBase(raw: string | null | undefined): number | null {
  if (!raw || raw === "—" || raw === "-") return null;
  const match = raw.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function skillPointsPerClassLevel(base: number, intScore: number): number {
  const perLevel = base + abilityModifier(intScore);
  return perLevel <= 0 ? 1 : perLevel;
}

/** Total skill points earned from class levels (PHB: ×4 at 1st character level only). */
export function computeSkillPointBudget(
  classLevels: ClassLevelEntry[],
  skillPointBaseBySlug: Record<string, number>,
  intScore: number,
  defaultBase = 2,
  racialSkillPointBonus: RacialSkillPointBonus | null = null,
  firstClassSlug: string | null = null,
): number {
  const classTotal = computeSkillPointBudgetBreakdown(
    classLevels,
    skillPointBaseBySlug,
    intScore,
    defaultBase,
    firstClassSlug,
  )
    .filter((line) => !line.indent)
    .reduce((sum, line) => sum + line.value, 0);

  return classTotal + computeRacialSkillPointBudget(totalCharacterLevel(classLevels), racialSkillPointBonus);
}

export function computeSkillPointSummary(
  state: PcPlanState,
  skillPointBaseBySlug: Record<string, number>,
  racialSkillPointBonus: RacialSkillPointBonus | null = null,
  raceName?: string,
  classSkillKeys: Set<string> = new Set(),
): { spent: number; available: number; breakdown: SkillPointBudgetLine[] } {
  const firstClassSlug = effectiveFirstClassSlug(
    state.identity.classLevels,
    state.identity.firstClassSlug,
  );
  const classBreakdown = computeSkillPointBudgetBreakdown(
    state.identity.classLevels,
    skillPointBaseBySlug,
    state.abilities.int,
    2,
    firstClassSlug,
  );
  const racialBreakdown = computeRacialSkillPointBudgetBreakdown(
    totalCharacterLevel(state.identity.classLevels),
    racialSkillPointBonus,
    raceName,
  );
  const breakdown = [...classBreakdown, ...racialBreakdown];
  const available = computeSkillPointBudget(
    state.identity.classLevels,
    skillPointBaseBySlug,
    state.abilities.int,
    2,
    racialSkillPointBonus,
    firstClassSlug,
  );
  const spent = computeSkillRanksSpent(state.skills, classSkillKeys);
  return { spent, available, breakdown };
}
