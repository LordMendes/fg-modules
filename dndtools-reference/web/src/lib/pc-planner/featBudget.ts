import { characterLevelFromPlan } from "./gestalt";
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
  const characterLevel = characterLevelFromPlan(state);
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

export type FeatSourceOption = {
  id: string;
  label: string;
  title?: string;
};

function isClassEntry(cl: ClassLevelEntry, slug: string): boolean {
  const classSlug = cl.classSlug.toLowerCase();
  const className = cl.className.trim().toLowerCase();
  return classSlug === slug || classSlug.startsWith(`${slug}-`) || className === slug;
}

/** Class bonus feats in budget order: fighter, wizard, monk, ranger. */
function classBonusFeatTitles(classLevels: ClassLevelEntry[]): string[] {
  const titles: string[] = [];
  const push = (label: string, count: number) => {
    for (let i = 0; i < count; i++) titles.push(label);
  };
  for (const cl of classLevels) {
    if (!isClassEntry(cl, "fighter") || cl.level < 1) continue;
    push("Fighter", 1 + Math.floor(cl.level / 2));
  }
  for (const cl of classLevels) {
    if (!isClassEntry(cl, "wizard") || cl.level < 1) continue;
    push("Wizard", 1 + Math.floor((cl.level - 1) / 5));
  }
  for (const cl of classLevels) {
    if (!isClassEntry(cl, "monk") || cl.level < 1) continue;
    let count = 0;
    if (cl.level >= 1) count += 1;
    if (cl.level >= 2) count += 1;
    if (cl.level >= 6) count += 1;
    push("Monk", count);
  }
  for (const cl of classLevels) {
    if (!isClassEntry(cl, "ranger") || cl.level < 1) continue;
    let count = 0;
    if (cl.level >= 2) count += 1;
    if (cl.level >= 6) count += 1;
    if (cl.level >= 11) count += 1;
    push("Ranger", count);
  }
  return titles;
}

/** Slots a feat can be flagged with: level, human, class bonus, or flaw. */
export function listFeatSourceOptions(
  state: PcPlanState,
  raceFeatures: RaceDerivedFeatures | null = null,
): FeatSourceOption[] {
  const level = Math.max(0, Math.trunc(characterLevelFromPlan(state)));
  const options: FeatSourceOption[] = [];
  if (level >= 1) {
    options.push({ id: "level:1", label: "Lvl 1" });
    for (let n = 3; n <= level; n += 3) {
      options.push({ id: `level:${n}`, label: `Lvl ${n}` });
    }
  }
  if (humanBonusFeatBudget(level, raceFeatures, state.identity.race) > 0) {
    options.push({ id: "human", label: "Human" });
  }
  classBonusFeatTitles(state.identity.classLevels).forEach((className, index) => {
    options.push({
      id: `bonus:${index + 1}`,
      label: `Bonus feat ${index + 1}`,
      title: `${className} bonus feat`,
    });
  });
  const flaws = flawFeatBudget(state.feats);
  for (let i = 1; i <= flaws; i++) {
    options.push({
      id: `flaw:${i}`,
      label: `Flaw ${i}`,
      title: "Extra feat from a flaw",
    });
  }
  return options;
}

export function featSourceLabel(id: string): string {
  if (id === "human") return "Human";
  const level = /^level:(\d+)$/.exec(id);
  if (level) return `Lvl ${level[1]}`;
  const bonus = /^bonus:(\d+)$/.exec(id);
  if (bonus) return `Bonus feat ${bonus[1]}`;
  const flaw = /^flaw:(\d+)$/.exec(id);
  if (flaw) return `Flaw ${flaw[1]}`;
  return id;
}
