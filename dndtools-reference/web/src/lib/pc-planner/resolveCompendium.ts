import type { PcCompendiumBundle } from "@/lib/entities";
import { deriveClassFeatures } from "./parseClassAbilityEffects";
import type { PcPlanState } from "./types";

/** Re-derive class features honoring player-suppressed abilities. */
export function resolveClassFeaturesForPlan(
  compendium: PcCompendiumBundle | null,
  state: PcPlanState,
) {
  if (!compendium) return null;
  const suppressed = new Set(state.suppressedClassEffects ?? []);
  const descriptions = compendium.classDescriptions
    ? new Map(Object.entries(compendium.classDescriptions))
    : new Map<string, string>();
  return deriveClassFeatures(compendium.classAbilities, descriptions, suppressed);
}
