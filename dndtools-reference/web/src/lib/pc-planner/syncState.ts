import {
  getClassCastingInfo,
  halfCasterEffectiveLevel,
  isHalfCaster,
  spellModeFromProgression,
} from "./classCasting";
import {
  computeSpellClass,
  type ClassSpellTableContext,
} from "./spellSlots";
import { parseSpellsPerDayFromAdvancementHtml } from "./parseClassSpellTables";
import { normalizeCombatState } from "./combatStats";
import { normalizeHitPointsState, syncHitDice } from "./hitPoints";
import { normalizePcPlanState } from "./normalizePlanState";
import { computeAutoDefenses } from "./pcDefenses";
import {
  collectPrestigeCasterContributions,
  isPrestigeOnlyCasterClass,
  stackedCasterLevel,
} from "./prestigeCasting";
import { seedResourcesFromAbilities } from "./resources";
import { applySkillSynergies } from "./skillSynergy";
import { applySpecialAttacksNormalization } from "./specialAttacks";
import {
  normalizeAbilityBase,
  normalizeAbilityDamage,
  syncEffectiveAbilities,
} from "./syncDerived";
import { ensureTreasure } from "./treasure";
import type { PcPlanState, SpellClassState } from "./types";

function hasClericDomains(state: PcPlanState): boolean {
  return (state.identity.domains?.length ?? 0) > 0;
}

function buildSpellClassFromLevel(
  state: PcPlanState,
  classSlug: string,
  className: string,
  level: number,
  classSpellTables: Record<string, ClassSpellTableContext>,
  classDescriptions: ReadonlyMap<string, string>,
): SpellClassState | null {
  if (
    isPrestigeOnlyCasterClass(classSlug, className, classDescriptions)
  ) {
    return null;
  }

  const info = getClassCastingInfo(classSlug, className);
  if (isHalfCaster(info)) {
    if (halfCasterEffectiveLevel(level) <= 0) return null;
    return {
      label: className,
      classSlug,
      casterLevel: level,
      dcAbility: info!.dcAbility,
      mode: "preparation",
      spells: [],
      slotsUsed: Array.from({ length: 10 }, () => 0),
    };
  }

  if (!info) {
    const tables = classSpellTables[classSlug];
    const slots = tables
      ? parseSpellsPerDayFromAdvancementHtml(tables.advancementHtml, level)
      : null;
    if (!slots?.some((count) => count > 0)) return null;
    return {
      label: className,
      classSlug,
      casterLevel: level,
      dcAbility: "cha",
      mode: "spontaneous",
      spells: [],
      slotsUsed: Array.from({ length: 10 }, () => 0),
    };
  }

  return {
    label: className,
    classSlug,
    casterLevel: level,
    dcAbility: info.dcAbility,
    mode: spellModeFromProgression(info.progression),
    spells: [],
    slotsUsed: Array.from({ length: 10 }, () => 0),
  };
}

/** Ensure firstClassSlug is set and still valid after class list edits. */
export function normalizePlanIdentity(state: PcPlanState): void {
  const levels = state.identity.classLevels;
  if (levels.length === 0) {
    state.identity.firstClassSlug = null;
    return;
  }
  if (!state.identity.firstClassSlug) {
    state.identity.firstClassSlug = levels[0].classSlug;
    return;
  }
  if (!levels.some((cl) => cl.classSlug === state.identity.firstClassSlug)) {
    const sorted = [...levels].sort((a, b) => b.level - a.level);
    state.identity.firstClassSlug = sorted[0]?.classSlug ?? levels[0].classSlug;
  }
  if (!state.identity.domains) state.identity.domains = [];
}

export type SyncPcPlanOptions = {
  classSpellTables?: Record<string, ClassSpellTableContext>;
  classHitDice?: Record<string, string>;
  classDescriptions?: ReadonlyMap<string, string>;
  classAbilities?: Parameters<typeof seedResourcesFromAbilities>[0];
};

/** Recompute spell classes and clamp prepared counts when class levels or abilities change. */
export function syncPcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
  options: SyncPcPlanOptions = {},
): PcPlanState {
  normalizePcPlanState(state);
  normalizePlanIdentity(state);

  const classSpellTables = options.classSpellTables ?? {};
  const classDescriptions = options.classDescriptions ?? new Map();
  const prestigeContribs = collectPrestigeCasterContributions(
    state.identity.classLevels,
    classDescriptions,
  );

  const nextSpellClasses: SpellClassState[] = [];
  const domainsSelected = hasClericDomains(state);

  for (const cl of state.identity.classLevels) {
    const sc =
      state.spellClasses.find((s) => s.classSlug === cl.classSlug) ??
      buildSpellClassFromLevel(
        state,
        cl.classSlug,
        cl.className,
        cl.level,
        classSpellTables,
        classDescriptions,
      );
    if (!sc) continue;

    const castingInfo = getClassCastingInfo(cl.classSlug, cl.className);
    if (isHalfCaster(castingInfo) && halfCasterEffectiveLevel(cl.level) <= 0) {
      continue;
    }

    const autoCl = stackedCasterLevel(sc, state.identity.classLevels, prestigeContribs);
    const casterLevel =
      sc.casterLevelOverride != null && Number.isFinite(sc.casterLevelOverride)
        ? sc.casterLevelOverride
        : autoCl;

    const updated: SpellClassState = {
      ...sc,
      label: cl.className,
      casterLevel,
      mode: spellModeFromProgression(castingInfo?.progression ?? "prepared"),
      slotsUsed: sc.slotsUsed ?? Array.from({ length: 10 }, () => 0),
    };

    const computed = computeSpellClass(
      updated.classSlug,
      updated.label,
      updated.casterLevel,
      state.abilities,
      classSpellTables[updated.classSlug],
      {
        hasDomains: domainsSelected,
        specialistSchool: state.identity.specialistSchool,
      },
    );

    let kept: SpellClassState["spells"];
    if (computed.mode === "preparation") {
      const byLevel = new Map<number, SpellClassState["spells"]>();
      for (const sp of updated.spells) {
        const list = byLevel.get(sp.level) ?? [];
        list.push(sp);
        byLevel.set(sp.level, list);
      }

      kept = [];
      for (const [level, spellsAtLevel] of byLevel) {
        const slotLimit = computed.slots[level] ?? 0;
        let preparedUsed = 0;
        for (const sp of spellsAtLevel) {
          let prepared = Math.max(0, sp.prepared ?? 1);
          const remaining = Math.max(0, slotLimit - preparedUsed);
          prepared = Math.min(prepared, remaining);
          preparedUsed += prepared;
          kept.push({ ...sp, prepared });
        }
      }
    } else {
      kept = updated.spells.map((sp) => ({ ...sp, prepared: undefined }));
    }

    nextSpellClasses.push({ ...updated, spells: kept });
  }

  state.skills = applySkillSynergies(
    state.skills,
    Boolean(state.combat?.suppressSynergies),
  );

  if (options.classAbilities) {
    state.resources = seedResourcesFromAbilities(
      options.classAbilities,
      state.resources ?? [],
    );
  }

  if (!state.identity.defensesCustomized) {
    state.identity.defenses = computeAutoDefenses(
      raceFeatures,
      options.classAbilities ?? [],
      classDescriptions,
      state.identity.race,
    );
  }

  const withHitPoints: PcPlanState = {
    ...state,
    abilityBase: state.abilityBase ?? normalizeAbilityBase(state),
    abilityDamage: normalizeAbilityDamage(state.abilityDamage),
    combat: normalizeCombatState(state.combat),
    hitPoints: normalizeHitPointsState(state.hitPoints),
    treasure: ensureTreasure(state.treasure),
    spellClasses: nextSpellClasses,
  };
  applySpecialAttacksNormalization(withHitPoints.combat);
  syncHitDice(withHitPoints, options.classHitDice ?? {});
  return withHitPoints;
}

export function finalizePcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
  classSpellTables: Record<string, ClassSpellTableContext> = {},
  classHitDice: Record<string, string> = {},
  classDescriptions: ReadonlyMap<string, string> = new Map(),
  classAbilities: SyncPcPlanOptions["classAbilities"] = [],
): PcPlanState {
  const synced = syncPcPlanState(state, raceFeatures, {
    classSpellTables,
    classHitDice,
    classDescriptions,
    classAbilities,
  });
  syncEffectiveAbilities(synced, raceFeatures);
  return synced;
}
