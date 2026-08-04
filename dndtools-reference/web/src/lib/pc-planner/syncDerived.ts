import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import type { AbilityKey, PcPlanState, SkillRow } from "./types";

export function effectiveAbilities(
  base: Record<AbilityKey, number>,
  race: RaceDerivedFeatures | null,
): Record<AbilityKey, number> {
  const out = { ...base };
  if (!race) return out;
  for (const [key, mod] of Object.entries(race.abilityMods)) {
    if (typeof mod !== "number") continue;
    const abilityKey = key as AbilityKey;
    out[abilityKey] = (out[abilityKey] ?? 10) + mod;
  }
  return out;
}

export function normalizeAbilityBase(state: PcPlanState): Record<AbilityKey, number> {
  if (state.abilityBase) return { ...state.abilityBase };
  return { ...state.abilities };
}

export function syncEffectiveAbilities(
  state: PcPlanState,
  race: RaceDerivedFeatures | null,
): void {
  ensureAbilityBase(state, race);
  state.abilities = effectiveAbilities(state.abilityBase, race);
}

/** One-time migration: recover base scores from legacy saves that baked racial mods into abilities. */
export function ensureAbilityBase(
  state: PcPlanState,
  race: RaceDerivedFeatures | null,
): void {
  if (state.abilityBase) return;
  state.abilityBase = { ...state.abilities };
  if (!race) return;
  for (const [key, mod] of Object.entries(race.abilityMods)) {
    if (typeof mod !== "number") continue;
    state.abilityBase[key as AbilityKey] = (state.abilityBase[key as AbilityKey] ?? 10) - mod;
  }
}

export function racialModLabel(mod: number | undefined): string | null {
  if (mod == null || mod === 0) return null;
  return mod > 0 ? `+${mod} racial` : `${mod} racial`;
}

export function abilityRacialMod(
  key: AbilityKey,
  race: RaceDerivedFeatures | null,
): number {
  return race?.abilityMods[key] ?? 0;
}

function skillLookupKey(name: string, slug?: string | null): string {
  return slug ?? name.toLowerCase();
}

function racialBonusForSkill(
  skill: SkillRow,
  racial: Record<string, number>,
): number {
  if (skill.slug && racial[skill.slug]) return racial[skill.slug];
  const byName = racial[skill.name.toLowerCase()];
  if (byName) return byName;

  for (const [key, value] of Object.entries(racial)) {
    if (skill.name.toLowerCase().includes(key) || key.includes(skill.name.toLowerCase())) {
      return value;
    }
  }
  return 0;
}

export function applyRacialSkillBonuses(
  skills: SkillRow[],
  racial: Record<string, number>,
): SkillRow[] {
  return skills.map((row) => ({
    ...row,
    racialMisc: racialBonusForSkill(row, racial),
  }));
}

export function applyRaceCombatBasics(
  combat: PcPlanState["combat"],
  race: RaceDerivedFeatures,
): void {
  combat.sizeMod = race.sizeMod;
  combat.speedBase = race.speed;
  combat.natural = race.naturalArmor;
}

export function applyDerivedFromRace(state: PcPlanState, race: RaceDerivedFeatures | null): void {
  syncEffectiveAbilities(state, race);
  if (race) {
    applyRaceCombatBasics(state.combat, race);
    state.skills = applyRacialSkillBonuses(state.skills, race.skillBonuses);
  }
}
