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
): SpellClassState | null {
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
    };
  }

  return {
    label: className,
    classSlug,
    casterLevel: level,
    dcAbility: info.dcAbility,
    mode: spellModeFromProgression(info.progression),
    spells: [],
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

/** Recompute spell classes and clamp prepared counts when class levels or abilities change. */
export function syncPcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
  classSpellTables: Record<string, ClassSpellTableContext> = {},
  classHitDice: Record<string, string> = {},
): PcPlanState {
  normalizePlanIdentity(state);
  const nextSpellClasses: SpellClassState[] = [];
  const domainsSelected = hasClericDomains(state);

  for (const cl of state.identity.classLevels) {
    const sc =
      state.spellClasses.find((s) => s.classSlug === cl.classSlug) ??
      buildSpellClassFromLevel(state, cl.classSlug, cl.className, cl.level, classSpellTables);
    if (!sc) continue;

    const castingInfo = getClassCastingInfo(cl.classSlug, cl.className);
    if (isHalfCaster(castingInfo) && halfCasterEffectiveLevel(cl.level) <= 0) {
      continue;
    }

    const updated: SpellClassState = {
      ...sc,
      label: cl.className,
      casterLevel: cl.level,
      mode: spellModeFromProgression(castingInfo?.progression ?? "prepared"),
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

  const withHitPoints: PcPlanState = {
    ...state,
    abilityBase: state.abilityBase ?? normalizeAbilityBase(state),
    abilityDamage: normalizeAbilityDamage(state.abilityDamage),
    combat: normalizeCombatState(state.combat),
    hitPoints: normalizeHitPointsState(state.hitPoints),
    treasure: ensureTreasure(state.treasure),
    spellClasses: nextSpellClasses,
  };
  syncHitDice(withHitPoints, classHitDice);
  return withHitPoints;
}

export function finalizePcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
  classSpellTables: Record<string, ClassSpellTableContext> = {},
  classHitDice: Record<string, string> = {},
): PcPlanState {
  const synced = syncPcPlanState(state, raceFeatures, classSpellTables, classHitDice);
  syncEffectiveAbilities(synced, raceFeatures);
  return synced;
}
