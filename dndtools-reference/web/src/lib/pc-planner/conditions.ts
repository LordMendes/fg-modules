import type { PcConditionEntry } from "./types";

export type ConditionEffect = {
  acMisc?: number;
  loseDexToAc?: boolean;
  loseDodge?: boolean;
  meleeMisc?: number;
  rangedMisc?: number;
  speedMult?: number;
};

export const CONDITION_PRESETS: Record<string, { label: string; effect: ConditionEffect }> = {
  prone: { label: "Prone", effect: { meleeMisc: 4, rangedMisc: -4, acMisc: -4 } },
  stunned: { label: "Stunned", effect: { loseDexToAc: true, loseDodge: true, acMisc: -2 } },
  flatFooted: { label: "Flat-footed", effect: { loseDexToAc: true, loseDodge: true } },
  grappled: { label: "Grappled", effect: { loseDexToAc: true, loseDodge: true } },
  invisible: { label: "Invisible", effect: { meleeMisc: 2, rangedMisc: 2 } },
};

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
