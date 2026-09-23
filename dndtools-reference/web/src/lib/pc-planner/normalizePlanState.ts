import { emptyDerivedList, normalizeDerivedList, type DerivedListField } from "./derivedField";
import { emptyDefenses, normalizeDefensesState } from "./pcDefenses";
import { sensesLinesFromState } from "./parseRaceFeatures";
import { normalizeAbilityDamage, normalizeAbilityDrain } from "./syncDerived";
import { normalizeCombatState } from "./combatStats";
import { applySpecialAttacksNormalization } from "./specialAttacks";

import { normalizeHitPointsState } from "./hitPoints";
import { ensureTreasure } from "./treasure";
import type {
  PcCombatModes,
  PcConditionEntry,
  PcPlanState,
  PcResourceEntry,
  PcSensesState,
  SpellClassState,
} from "./types";

export { emptyDefenses } from "./pcDefenses";

export function emptySenses(): PcSensesState {
  return { darkvisionFeet: 0, lowLight: false, scent: false, extra: "" };
}

export function emptyCombatModes(): PcCombatModes {
  return {};
}

function normalizeStructuredSenses(raw: unknown): PcSensesState {
  if (!raw || typeof raw !== "object") return emptySenses();
  const rec = raw as Record<string, unknown>;
  return {
    darkvisionFeet:
      typeof rec.darkvisionFeet === "number" && Number.isFinite(rec.darkvisionFeet)
        ? Math.max(0, Math.trunc(rec.darkvisionFeet))
        : 0,
    lowLight: Boolean(rec.lowLight),
    scent: Boolean(rec.scent),
    extra: typeof rec.extra === "string" ? rec.extra : "",
  };
}

function splitSensesText(text: string): string[] {
  return text
    .split(/[,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeIdentitySenses(
  sensesRaw: unknown,
  sensesOverride: string | null | undefined,
): DerivedListField {
  if (sensesRaw && typeof sensesRaw === "object") {
    const rec = sensesRaw as Record<string, unknown>;
    if (Array.isArray(rec.lines)) {
      return normalizeDerivedList(sensesRaw);
    }
    const structured = normalizeStructuredSenses(sensesRaw);
    if (sensesOverride?.trim()) {
      return { customized: true, lines: splitSensesText(sensesOverride) };
    }
    return { customized: false, lines: sensesLinesFromState(structured) };
  }
  if (sensesOverride?.trim()) {
    return { customized: true, lines: splitSensesText(sensesOverride) };
  }
  return emptyDerivedList();
}

function normalizeDefenses(raw: unknown) {
  return normalizeDefensesState(raw);
}

function normalizeSpellClass(raw: unknown): SpellClassState | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const classSlug = typeof rec.classSlug === "string" ? rec.classSlug : "";
  const label = typeof rec.label === "string" ? rec.label : classSlug;
  const casterLevel =
    typeof rec.casterLevel === "number" && Number.isFinite(rec.casterLevel)
      ? Math.trunc(rec.casterLevel)
      : 1;
  if (!classSlug) return null;
  const dcAbility =
    rec.dcAbility === "str" ||
    rec.dcAbility === "dex" ||
    rec.dcAbility === "con" ||
    rec.dcAbility === "int" ||
    rec.dcAbility === "wis" ||
    rec.dcAbility === "cha"
      ? rec.dcAbility
      : "int";
  const mode = rec.mode === "spontaneous" ? "spontaneous" : "preparation";
  const spells = Array.isArray(rec.spells) ? rec.spells : [];
  const casterLevelOverride =
    rec.casterLevelOverride != null && Number.isFinite(rec.casterLevelOverride)
      ? Math.trunc(rec.casterLevelOverride as number)
      : null;
  const progressionFrom = Array.isArray(rec.casterProgressionFrom)
    ? rec.casterProgressionFrom.filter((s): s is string => typeof s === "string")
    : undefined;
  const slotsUsedRaw = Array.isArray(rec.slotsUsed) ? rec.slotsUsed : [];
  const slotsUsed = Array.from({ length: 10 }, (_, i) => {
    const n = slotsUsedRaw[i];
    return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  });
  return {
    label,
    classSlug,
    casterLevel,
    casterLevelOverride,
    casterProgressionFrom: progressionFrom,
    dcAbility,
    mode,
    spells: spells as SpellClassState["spells"],
    slotsUsed,
  };
}

function normalizeConditions(raw: unknown): PcConditionEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PcConditionEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    const name = typeof rec.name === "string" ? rec.name : "";
    if (!id || !name) continue;
    out.push({
      id,
      name,
      preset: typeof rec.preset === "string" ? rec.preset : null,
    });
  }
  return out;
}

function normalizeResources(raw: unknown): PcResourceEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PcResourceEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    const name = typeof rec.name === "string" ? rec.name : "";
    if (!id || !name) continue;
    out.push({
      id,
      name,
      current:
        typeof rec.current === "number" && Number.isFinite(rec.current)
          ? Math.trunc(rec.current)
          : 0,
      max:
        typeof rec.max === "number" && Number.isFinite(rec.max) ? Math.trunc(rec.max) : 0,
      auto: Boolean(rec.auto),
    });
  }
  return out;
}

function normalizeSkillShortcuts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const key = entry.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizeCombatModes(raw: unknown): PcCombatModes {
  if (!raw || typeof raw !== "object") return emptyCombatModes();
  const rec = raw as Record<string, unknown>;
  const num = (key: string) => {
    const v = rec[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : undefined;
  };
  return {
    powerAttack: num("powerAttack"),
    combatExpertise: num("combatExpertise"),
    fightingDefensively: rec.fightingDefensively === true ? true : undefined,
    charge: rec.charge === true ? true : undefined,
    rapidShot: rec.rapidShot === true ? true : undefined,
    flurry: rec.flurry === true ? true : undefined,
    rage: rec.rage === true ? true : undefined,
  };
}

/** Normalize legacy saves missing new optional blocks. */
export function normalizePcPlanState(state: PcPlanState): PcPlanState {
  const identity = state.identity;
  identity.domains = identity.domains ?? [];
  identity.opposedSchools = identity.opposedSchools ?? [];
  const legacySensesOverride = (identity as { sensesOverride?: string | null }).sensesOverride;
  identity.senses = normalizeIdentitySenses(identity.senses, legacySensesOverride);
  delete (identity as { sensesOverride?: string | null }).sensesOverride;
  identity.languages = normalizeDerivedList(identity.languages);
  identity.defenses = normalizeDefenses(identity.defenses);
  identity.defensesCustomized = Boolean(identity.defensesCustomized);
  if (identity.xp == null || !Number.isFinite(identity.xp)) identity.xp = 0;
  if (identity.xpNecessary == null || !Number.isFinite(identity.xpNecessary)) {
    identity.xpNecessary = 0;
  }

  state.abilityDamage = normalizeAbilityDamage(state.abilityDamage);
  state.abilityDrain = normalizeAbilityDrain(state.abilityDrain);
  state.combat = normalizeCombatState(state.combat);
  applySpecialAttacksNormalization(state.combat);
  state.hitPoints = normalizeHitPointsState(state.hitPoints);
  state.treasure = ensureTreasure(state.treasure);
  state.combatModes = normalizeCombatModes(state.combatModes);
  state.conditions = normalizeConditions(state.conditions);
  state.resources = normalizeResources(state.resources);
  state.skillShortcuts = normalizeSkillShortcuts(state.skillShortcuts);
  state.skillsAllSources = Boolean(state.skillsAllSources);

  if (!identity.languages) identity.languages = emptyDerivedList();

  state.spellClasses = (state.spellClasses ?? [])
    .map((sc) => normalizeSpellClass(sc))
    .filter((sc): sc is SpellClassState => sc != null);

  return state;
}
