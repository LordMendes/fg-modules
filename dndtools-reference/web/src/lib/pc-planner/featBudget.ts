import { totalCharacterLevel } from "./skillPoints";
import type { ClassLevelEntry, FeatEntry, PcPlanState } from "./types";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";

export type FeatBudgetBreakdown = {
  general: number;
  human: number;
  fighter: number;
  total: number;
  spent: number;
};

/** General feats: 1 at 1st, then at every 3rd level (3, 6, 9, …). */
export function generalFeatBudget(characterLevel: number): number {
  const level = Math.max(0, Math.trunc(characterLevel));
  if (level < 1) return 0;
  return 1 + Math.floor(level / 3);
}

/** Human bonus feat at 1st level. */
export function humanBonusFeatBudget(
  characterLevel: number,
  raceFeatures: RaceDerivedFeatures | null,
  raceName?: string,
): number {
  if (characterLevel < 1) return 0;
  const name = (raceName ?? "").toLowerCase();
  if (name.includes("human")) return 1;
  // skillPointBonus firstLevel 4 is the common human marker in this codebase
  if (raceFeatures?.skillPointBonus?.firstLevel === 4) return 1;
  return 0;
}

/** Fighter bonus feats: 1st and every even fighter level. */
export function fighterBonusFeatBudget(classLevels: ClassLevelEntry[]): number {
  let total = 0;
  for (const cl of classLevels) {
    const slug = cl.classSlug.toLowerCase();
    const name = cl.className.toLowerCase();
    const isFighter =
      slug === "fighter" ||
      slug.startsWith("fighter-") ||
      name === "fighter";
    if (!isFighter || cl.level < 1) continue;
    // Levels 1, 2, 4, 6, … → 1 + floor(level/2)
    total += 1 + Math.floor(cl.level / 2);
  }
  return total;
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
  const spent = state.feats.length;
  return {
    general,
    human,
    fighter,
    total: general + human + fighter,
    spent,
  };
}

export function formatFeatBudgetSummary(budget: FeatBudgetBreakdown): string {
  return `${budget.spent} / ${budget.total}`;
}
