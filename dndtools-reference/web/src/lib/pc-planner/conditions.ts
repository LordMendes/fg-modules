import type { PcConditionEntry } from "./types";
import {
  CONDITION_PRESETS as COMBAT_CONDITION_PRESETS,
  type ConditionEffect,
  type ConditionPreset,
} from "@/lib/combat/effects/presets";

export type { ConditionEffect, ConditionPreset };

/** String-keyed for PC sheet preset pickers. */
export const CONDITION_PRESETS: Record<string, ConditionPreset> =
  COMBAT_CONDITION_PRESETS;

export function aggregateConditionEffects(conditions: PcConditionEntry[]): ConditionEffect {
  const out: ConditionEffect = {};
  for (const cond of conditions) {
    const preset = cond.preset ? CONDITION_PRESETS[cond.preset] : null;
    const effect = preset?.effect ?? {};
    if (effect.acMisc) out.acMisc = (out.acMisc ?? 0) + effect.acMisc;
    if (effect.meleeMisc) out.meleeMisc = (out.meleeMisc ?? 0) + effect.meleeMisc;
    if (effect.rangedMisc) out.rangedMisc = (out.rangedMisc ?? 0) + effect.rangedMisc;
    if (effect.loseDexToAc) out.loseDexToAc = true;
    if (effect.loseDodge) out.loseDodge = true;
    if (effect.speedMult != null) {
      out.speedMult = Math.min(out.speedMult ?? 1, effect.speedMult);
    }
  }
  return out;
}
