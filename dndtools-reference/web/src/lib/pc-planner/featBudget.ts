import { totalCharacterLevel } from "./skillPoints";
import type { ClassLevelEntry, FeatEntry, PcPlanState } from "./types";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";

export type FeatBudgetBreakdown = {
  general: number;
  human: number;
  fighter: number;
  wizard: number;
  monk: number;
  ranger: number;
  flaws: number;
  total: number;
  spent: number;
  /** Feats counting against budget (excludes flaws). */
  spentNonFlaw: number;
};

/** General feats: 1 at 1st, then at every 3rd level (3, 6, 9, …). */
export function generalFeatBudget(characterLevel: number): number {
  const level = Math.max(0, Math.trunc(characterLevel));
  if (level < 1) return 0;
  return 1 + Math.floor(level / 3);
}

export function humanBonusFeatBudget(
  characterLevel: number,
  raceFeatures: RaceDerivedFeatures | null,
  raceName?: string,
): number {
  if (characterLevel < 1) return 0;
  const name = (raceName ?? "").toLowerCase();
  if (name.includes("human")) return 1;
  if (raceFeatures?.skillPointBonus?.firstLevel === 4) return 1;
  return 0;
}

export function fighterBonusFeatBudget(classLevels: ClassLevelEntry[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const slug = cl.classSlug.toLowerCase();
    const name = cl.className.toLowerCase();
    const isFighter =
      slug === "fighter" || slug.startsWith("fighter-") || name === "fighter";
    if (!isFighter || cl.level < 1) continue;
    total += 1 + Math.floor(cl.level / 2);
  }
  return total;
}

export function wizardBonusFeatBudget(classLevels: ClassLevelEntry[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const slug = cl.classSlug.toLowerCase();
    const name = cl.className.toLowerCase();
    const isWizard =
      slug === "wizard" || slug.startsWith("wizard-") || name === "wizard";
    if (!isWizard || cl.level < 1) continue;
    total += 1 + Math.floor((cl.level - 1) / 5);
  }
  return total;
}

export function monkBonusFeatBudget(classLevels: ClassLevelEntry[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const slug = cl.classSlug.toLowerCase();
    const name = cl.className.toLowerCase();
    const isMonk = slug === "monk" || slug.startsWith("monk-") || name === "monk";
    if (!isMonk || cl.level < 1) continue;
    if (cl.level >= 1) total += 1;
    if (cl.level >= 2) total += 1;
    if (cl.level >= 6) total += 1;
  }
  return total;
}

export function rangerBonusFeatBudget(classLevels: ClassLevelEntry[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const slug = cl.classSlug.toLowerCase();
    const name = cl.className.toLowerCase();
    const isRanger =
      slug === "ranger" || slug.startsWith("ranger-") || name === "ranger";
    if (!isRanger || cl.level < 1) continue;
    if (cl.level >= 2) total += 1;
    if (cl.level >= 6) total += 1;
    if (cl.level >= 11) total += 1;
  }
  return total;
}

export function flawFeatBudget(feats: FeatEntry[]): number {
  return feats.filter((f) => f.isFlaw).length;
}

export function computeFeatBudget(
  state: PcPlanState,
  raceFeatures: RaceDerivedFeatures | null = null,
): FeatBudgetBreakdown {
  const characterLevel = totalCharacterLevel(state.identity.classLevels);
  const general = generalFeatBudget(characterLevel);
  const human = humanBonusFeatBudget(
    characterLevel,
    raceFeatures,
    state.identity.race,
  );
  const fighter = fighterBonusFeatBudget(state.identity.classLevels);
  const wizard = wizardBonusFeatBudget(state.identity.classLevels);
  const monk = monkBonusFeatBudget(state.identity.classLevels);
  const ranger = rangerBonusFeatBudget(state.identity.classLevels);
  const flaws = flawFeatBudget(state.feats);
  const spentNonFlaw = state.feats.filter((f) => !f.isFlaw).length;
  const spent = state.feats.length;
  return {
    general,
    human,
    fighter,
    wizard,
    monk,
    ranger,
    flaws,
    total: general + human + fighter + wizard + monk + ranger + flaws,
    spent,
    spentNonFlaw,
  };
}

export function formatFeatBudgetSummary(budget: FeatBudgetBreakdown): string {
  return `${budget.spentNonFlaw} / ${budget.total}`;
}
