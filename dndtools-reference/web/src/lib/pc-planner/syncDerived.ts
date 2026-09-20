import {
  formatSensesLine,
  type RaceDerivedFeatures,
} from "@/lib/pc-planner/parseRaceFeatures";
import {
  abilityItemBonusTotal,
  computeEquippedBonuses,
  type EquippedBonuses,
} from "./itemBonuses";
import type { AbilityKey, InventoryRow, PcPlanState, SkillRow } from "./types";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export function emptyAbilityDamage(): Record<AbilityKey, number> {
  return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
}

export function emptyAbilityDrain(): Record<AbilityKey, number> {
  return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
}

export function normalizeAbilityDrain(raw: unknown): Record<AbilityKey, number> {
  const out = emptyAbilityDrain();
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Record<string, unknown>;
  for (const key of ABILITY_KEYS) {
    const n = rec[key];
    if (typeof n === "number") out[key] = clampAbilityDamage(n);
  }
  return out;
}

export function clampAbilityDamage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function normalizeAbilityDamage(raw: unknown): Record<AbilityKey, number> {
  const out = emptyAbilityDamage();
  if (!raw || typeof raw !== "object") return out;
  const rec = raw as Record<string, unknown>;
  for (const key of ABILITY_KEYS) {
    const n = rec[key];
    if (typeof n === "number") out[key] = clampAbilityDamage(n);
  }
  return out;
}

export function effectiveAbilities(
  base: Record<AbilityKey, number>,
  race: RaceDerivedFeatures | null,
  itemBonuses: EquippedBonuses | null = null,
  damage: Record<AbilityKey, number> | null = null,
  drain: Record<AbilityKey, number> | null = null,
): Record<AbilityKey, number> {
  const out = { ...base };
  if (race) {
    for (const [key, mod] of Object.entries(race.abilityMods)) {
      if (typeof mod !== "number") continue;
      const abilityKey = key as AbilityKey;
      out[abilityKey] = (out[abilityKey] ?? 10) + mod;
    }
  }
  if (itemBonuses) {
    for (const key of Object.keys(out) as AbilityKey[]) {
      out[key] = (out[key] ?? 10) + abilityItemBonusTotal(itemBonuses, key);
    }
  }
  if (damage) {
    for (const key of Object.keys(out) as AbilityKey[]) {
      const dmg = clampAbilityDamage(damage[key] ?? 0);
      out[key] = Math.max(0, (out[key] ?? 10) - dmg);
    }
  }
  if (drain) {
    for (const key of Object.keys(out) as AbilityKey[]) {
      const dr = clampAbilityDamage(drain[key] ?? 0);
      out[key] = Math.max(0, (out[key] ?? 10) - dr);
    }
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
  inventory: InventoryRow[] | null | undefined = state.inventory,
): void {
  ensureAbilityBase(state, race);
  state.abilityDamage = normalizeAbilityDamage(state.abilityDamage);
  state.abilityDrain = normalizeAbilityDrain(state.abilityDrain);
  const itemBonuses = computeEquippedBonuses(
    inventory ?? state.inventory,
    Boolean(state.combat?.addAllBonusTypes),
  );
  state.abilities = effectiveAbilities(
    state.abilityBase,
    race,
    itemBonuses,
    state.abilityDamage,
    state.abilityDrain,
  );
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
    state.skills = applyRacialSkillBonuses(state.skills, race.skillBonuses);
  }
}

/** Apply racial size/speed/natural armor — call only when race changes, not on every compendium fetch. */
export function applyRaceCombatBasicsOnRaceChange(
  state: PcPlanState,
  race: RaceDerivedFeatures,
): void {
  applyRaceCombatBasics(state.combat, race);
  applyRaceIdentityFieldsOnRaceChange(state, race);
}

/** Auto-fill senses, languages, defenses when not customized. */
export function applyRaceIdentityFieldsOnRaceChange(
  state: PcPlanState,
  race: RaceDerivedFeatures,
): void {
  const raceSenseLines = formatSensesLine(race.senses)
    .split(/,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!state.identity.senses) {
    state.identity.senses = { customized: false, lines: [...raceSenseLines] };
  } else if (!state.identity.senses.customized) {
    state.identity.senses.lines = [...raceSenseLines];
  }
  const raceLanguages = Array.isArray(race.languages) ? race.languages : [];
  if (!state.identity.languages) {
    state.identity.languages = { customized: false, lines: [...raceLanguages] };
  } else if (!state.identity.languages.customized) {
    state.identity.languages.lines = [...raceLanguages];
  }
  // Defenses are synced from race + class in syncPcPlanState.
}
