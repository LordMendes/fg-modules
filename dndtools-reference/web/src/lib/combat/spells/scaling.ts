import type { SpellDamageAction, SpellHealAction } from "@/lib/fg-spell-actions/types";

export type ScaledDamage = {
  dice: string;
  qty: number;
  sides: number;
  bonus: number;
  dmgType: string;
};

function parseSides(dice: string): number {
  const match = dice.match(/d(\d+)/i);
  return match ? Number(match[1]) : 6;
}

function normalizeDice(dice: string): string {
  return dice.startsWith("d") ? `1${dice}` : dice;
}

/** Scale damage dice by caster level per FG spell action fields. */
export function scaleSpellDamage(
  action: SpellDamageAction,
  casterLevel: number,
): ScaledDamage {
  const sides = parseSides(action.dice);
  const baseDice = normalizeDice(action.dice);
  const bonus = action.bonus ?? 0;
  const dmgType = action.dmgType ?? "";

  if (action.dicestat === "cl") {
    const count = Math.min(
      Math.max(1, Math.trunc(casterLevel)),
      action.dicestatmax ?? Math.trunc(casterLevel),
    );
    return { dice: `${count}d${sides}`, qty: count, sides, bonus, dmgType };
  }

  if (action.dicestat === "halfcl") {
    const raw = Math.max(1, Math.floor(casterLevel / 2));
    const count = action.dicestatmax ? Math.min(raw, action.dicestatmax) : raw;
    return { dice: `${count}d${sides}`, qty: count, sides, bonus, dmgType };
  }

  const qtyMatch = baseDice.match(/^(\d+)d/i);
  const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
  return { dice: baseDice, qty, sides, bonus, dmgType };
}

/** Heal amount from heal action: dice total + min(CL * statmult, statmax). */
export function scaleSpellHeal(
  action: SpellHealAction,
  casterLevel: number,
  faces: number[],
): number {
  const dice = normalizeDice(action.dice);
  const sides = parseSides(dice);
  const qty = 1;
  const rolled = faces.slice(0, qty).reduce((s, n) => s + n, 0) || 1;
  const statBonus = Math.min(
    casterLevel * (action.statmult ?? 1),
    action.statmax,
  );
  return rolled + statBonus;
}

export function rollDamageTotal(scaled: ScaledDamage, faces: number[]): number {
  const rolled = faces.slice(0, scaled.qty).reduce((s, n) => s + n, 0);
  return Math.max(0, rolled + scaled.bonus);
}
