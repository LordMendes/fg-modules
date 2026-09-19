import { sumTag, type ActiveEffect } from "@/lib/combat/effects/applyEffects";
import type { Ability } from "@/lib/combat/types";

export type SpellDcInput = {
  spellLevel: number;
  castingStatMod: number;
  featMods?: number;
  effects?: ActiveEffect[];
  /** School or descriptor tags for DC-boosting effects (Spell Focus). */
  descriptors?: string[];
};

/** 10 + spell level + casting stat + feats + DC effects. */
export function spellSaveDc(input: SpellDcInput): number {
  const base =
    10 +
    Math.max(0, Math.trunc(input.spellLevel)) +
    Math.trunc(input.castingStatMod) +
    Math.trunc(input.featMods ?? 0);

  let effectBonus = 0;
  if (input.effects?.length) {
    const ctx = { effects: input.effects };
    for (const descriptor of input.descriptors ?? []) {
      effectBonus += sumTag(ctx, "DC", { saveDescriptor: descriptor });
    }
    if ((input.descriptors ?? []).length === 0) {
      effectBonus += sumTag(ctx, "DC");
    }
  }

  return base + effectBonus;
}

export function castingStatModFromStats(
  stats: Partial<Record<Ability, number>>,
  ability: Ability,
): number {
  return stats[ability] ?? 0;
}
