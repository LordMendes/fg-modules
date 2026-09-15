import type { ClassSpellTableContext } from "./spellSlots";
import { finalizePcPlanState } from "./syncState";
import type { SyncPcPlanOptions } from "./syncState";
import type { PcPlanState } from "./types";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";

export type FinalizeCompendiumContext = {
  raceFeatures?: RaceDerivedFeatures | null;
  classSpellTables?: Record<string, ClassSpellTableContext>;
  classHitDice?: Record<string, string>;
  classDescriptions?: Record<string, string>;
  classAbilities?: SyncPcPlanOptions["classAbilities"];
};

/** Finalize plan state with optional compendium-derived sync inputs. */
export function finalizePcPlanWithContext(
  state: PcPlanState,
  ctx: FinalizeCompendiumContext = {},
): PcPlanState {
  const classDescriptions = ctx.classDescriptions
    ? new Map(Object.entries(ctx.classDescriptions))
    : new Map<string, string>();
  return finalizePcPlanState(
    state,
    ctx.raceFeatures ?? null,
    ctx.classSpellTables ?? {},
    ctx.classHitDice ?? {},
    classDescriptions,
    ctx.classAbilities ?? [],
  );
}

export function compendiumFinalizeContext(
  compendium: FinalizeCompendiumContext | null | undefined,
): FinalizeCompendiumContext {
  if (!compendium) return {};
  return {
    raceFeatures: compendium.raceFeatures ?? null,
    classSpellTables: compendium.classSpellTables ?? {},
    classHitDice: compendium.classHitDice ?? {},
    classDescriptions: compendium.classDescriptions ?? {},
    classAbilities: compendium.classAbilities ?? [],
  };
}
