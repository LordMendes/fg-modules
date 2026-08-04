import { getClassCastingInfo } from "./classCasting";
import { computeSpellClass } from "./spellSlots";
import { normalizeCombatState } from "./combatStats";
import { normalizeAbilityBase, syncEffectiveAbilities } from "./syncDerived";
import type { PcPlanState, SpellClassState } from "./types";

function buildSpellClassFromLevel(
  state: PcPlanState,
  classSlug: string,
  className: string,
  level: number,
): SpellClassState | null {
  const info = getClassCastingInfo(classSlug, className);
  if (!info || info.progression === "half") return null;
  return {
    label: className,
    classSlug,
    casterLevel: level,
    dcAbility: info.dcAbility,
    spells: [],
  };
}

/** Recompute spell classes and clamp spells when class levels or abilities change. */
export function syncPcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
): PcPlanState {
  const nextSpellClasses: SpellClassState[] = [];

  for (const cl of state.identity.classLevels) {
    const sc =
      state.spellClasses.find((s) => s.classSlug === cl.classSlug) ??
      buildSpellClassFromLevel(state, cl.classSlug, cl.className, cl.level);
    if (!sc) continue;

    const updated: SpellClassState = {
      ...sc,
      label: cl.className,
      casterLevel: cl.level,
    };

    const computed = computeSpellClass(
      updated.classSlug,
      updated.label,
      updated.casterLevel,
      state.abilities,
    );

    const kept: SpellClassState["spells"] = [];
    const levelCounts = new Map<number, number>();
    for (const sp of updated.spells) {
      if (sp.level > computed.maxSpellLevel) continue;
      const limit = computed.slots[sp.level] ?? 0;
      const used = levelCounts.get(sp.level) ?? 0;
      if (used < limit) {
        kept.push(sp);
        levelCounts.set(sp.level, used + 1);
      }
    }

    nextSpellClasses.push({ ...updated, spells: kept });
  }

  return {
    ...state,
    abilityBase: state.abilityBase ?? normalizeAbilityBase(state),
    combat: normalizeCombatState(state.combat),
    spellClasses: nextSpellClasses,
  };
}

export function finalizePcPlanState(
  state: PcPlanState,
  raceFeatures: Parameters<typeof syncEffectiveAbilities>[1] = null,
): PcPlanState {
  const synced = syncPcPlanState(state, raceFeatures);
  syncEffectiveAbilities(synced, raceFeatures);
  return synced;
}
