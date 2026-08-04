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
): number {
  const abilityKey = skillAbilityKey(row.ability);
  const statMod = abilityKey ? abilityModifier(abilities[abilityKey]) : 0;
  return row.ranks + statMod + (row.racialMisc ?? 0) + row.misc;
}

export function formatSkillModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
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
): SkillPointBudgetLine[] {
  const lines: SkillPointBudgetLine[] = [];
  let isFirstCharacterLevel = true;

  for (const cl of classLevels) {
    if (cl.level <= 0) continue;
    const base = skillPointBaseBySlug[cl.classSlug] ?? defaultBase;
    const perLevel = skillPointsPerClassLevel(base, intScore);
    let classTotal = 0;
    const classLines: SkillPointBudgetLine[] = [];

    for (let lvl = 1; lvl <= cl.level; lvl++) {
      const points = skillPointsForCharacterLevelGain(perLevel, isFirstCharacterLevel);
      classTotal += points;
      classLines.push({
        label: isFirstCharacterLevel ? `Level ${lvl} (×4)` : `Level ${lvl}`,
        value: points,
        indent: true,
      });
      isFirstCharacterLevel = false;
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
): number {
  const classTotal = computeSkillPointBudgetBreakdown(
    classLevels,
    skillPointBaseBySlug,
    intScore,
    defaultBase,
  )
    .filter((line) => !line.indent)
    .reduce((sum, line) => sum + line.value, 0);

  return classTotal + computeRacialSkillPointBudget(totalCharacterLevel(classLevels), racialSkillPointBonus);
}

export function computeSkillRanksSpent(skills: SkillRow[]): number {
  return skills.reduce((sum, row) => sum + (Number.isFinite(row.ranks) ? row.ranks : 0), 0);
}

export function computeSkillPointSummary(
  state: PcPlanState,
  skillPointBaseBySlug: Record<string, number>,
  racialSkillPointBonus: RacialSkillPointBonus | null = null,
  raceName?: string,
): { spent: number; available: number; breakdown: SkillPointBudgetLine[] } {
  const classBreakdown = computeSkillPointBudgetBreakdown(
    state.identity.classLevels,
    skillPointBaseBySlug,
    state.abilities.int,
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
  );
  const spent = computeSkillRanksSpent(state.skills);
  return { spent, available, breakdown };
}
