export type HealingTargetContext = {
  hpMax: number;
  wounds: number;
  hpTemp: number;
  nonlethal: number;
  deathState?: "dying" | "stable" | "disabled" | "dead" | null;
};

export type HealResult = {
  wounds: number;
  nonlethal: number;
  healed: number;
  note?: string;
};

export type TempHpResult = {
  hpTemp: number;
  applied: number;
};

function finite(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function isDead(target: HealingTargetContext): boolean {
  return target.deathState === "dead";
}

/**
 * Heal wounds and remove an equal amount of nonlethal damage.
 * Cannot raise effective HP above hpMax. Dead creatures are not healed.
 */
export function heal(
  amount: number,
  target: HealingTargetContext,
): HealResult {
  const healAmount = finite(amount);
  if (healAmount <= 0 || isDead(target)) {
    return {
      wounds: finite(target.wounds),
      nonlethal: finite(target.nonlethal),
      healed: 0,
    };
  }

  const hpMax = Math.max(1, finite(target.hpMax));
  const wounds = finite(target.wounds);
  const nonlethal = finite(target.nonlethal);
  const currentHp = Math.max(0, hpMax - wounds);
  const maxHeal = Math.max(0, hpMax - currentHp);
  const applied = Math.min(healAmount, maxHeal, wounds);

  const nextWounds = wounds - applied;
  const nextNonlethal = Math.max(0, nonlethal - applied);

  return {
    wounds: nextWounds,
    nonlethal: nextNonlethal,
    healed: applied,
  };
}

/** Temporary HP does not stack; keep the higher value. */
export function tempHp(
  amount: number,
  target: Pick<HealingTargetContext, "hpTemp">,
): TempHpResult {
  const add = finite(amount);
  const current = finite(target.hpTemp);
  const next = Math.max(current, add);
  return {
    hpTemp: next,
    applied: next - current,
  };
}

/** Reduce nonlethal damage only. */
export function healNonlethal(
  amount: number,
  target: Pick<HealingTargetContext, "nonlethal">,
): { nonlethal: number; healed: number } {
  const healAmount = finite(amount);
  const current = finite(target.nonlethal);
  const applied = Math.min(healAmount, current);
  return {
    nonlethal: current - applied,
    healed: applied,
  };
}
