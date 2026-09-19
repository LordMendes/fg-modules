import type { EngineContext } from "./engineContext";
import { attackerHasSeeInvisibility, attackerIsBlinded } from "./engineContext";

export type ConcealmentRoll = {
  face: number;
  missChance: number;
  missed: boolean;
};

/**
 * Compute miss chance percent for an attack against a target.
 * CONC = 20%, TCONC = 50%. Blinded attackers suffer 50% on all attacks.
 * Invisible defenders impose TCONC unless the attacker has See Invisibility.
 */
export function computeMissChance(
  attacker: EngineContext,
  target: EngineContext,
): number {
  let missChance = 0;

  if (attackerIsBlinded(attacker)) {
    missChance = Math.max(missChance, 50);
  }

  for (const effect of target.effects) {
    if (effect.active === false) continue;
    for (const component of effect.components) {
      if (component.tag === "CONC") missChance = Math.max(missChance, 20);
      if (component.tag === "TCONC") missChance = Math.max(missChance, 50);
    }
  }

  if (target.conditions.has("invisible") && !attackerHasSeeInvisibility(attacker)) {
    missChance = Math.max(missChance, 50);
  }

  return missChance;
}

/**
 * Resolve a concealment d100 roll. Miss when roll <= missChance.
 * Returns null when missChance is 0 (no roll needed).
 */
export function resolveConcealment(
  missChance: number,
  d100Face: number,
): ConcealmentRoll | null {
  const chance = Math.max(0, Math.min(100, Math.trunc(missChance)));
  if (chance <= 0) return null;

  const face = Math.max(1, Math.min(100, Math.trunc(d100Face)));
  const missed = face <= chance;

  return { face, missChance: chance, missed };
}
