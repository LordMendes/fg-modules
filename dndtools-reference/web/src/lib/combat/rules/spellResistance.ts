import {
  sumTag,
  type ActiveEffect,
  type EffectCollectContext,
} from "../effects/applyEffects";

export type SpellResistanceInput = {
  casterLevel: number;
  face: number;
  sr: number;
  effects?: ActiveEffect[];
};

export type SpellResistanceOutcome = {
  face: number;
  casterLevel: number;
  clBonus: number;
  total: number;
  sr: number;
  success: boolean;
};

function finite(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** CL + d20 vs spell resistance. Success when total meets or exceeds SR. */
export function resolveSpellResistance(
  input: SpellResistanceInput,
): SpellResistanceOutcome {
  const casterLevel = finite(input.casterLevel);
  const face = finite(input.face);
  const sr = finite(input.sr);

  const effectCtx: EffectCollectContext = {
    effects: input.effects ?? [],
  };
  const clBonus = sumTag(effectCtx, "CL");
  const total = face + casterLevel + clBonus;

  return {
    face,
    casterLevel,
    clBonus,
    total,
    sr,
    success: total >= sr,
  };
}
