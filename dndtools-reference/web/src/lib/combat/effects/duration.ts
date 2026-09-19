export type DurationUnit = "round" | "minute" | "hour" | "day";
export type DurationBoundary = "startOfTurn" | "endOfTurn";

/** Rounds per unit when converting on effect creation (FG-like: 1 minute = 10 rounds). */
export const ROUNDS_PER_UNIT: Record<DurationUnit, number> = {
  round: 1,
  minute: 10,
  hour: 600,
  day: 14400,
};

export type TimedEffect = {
  duration: number | null;
  durationUnit: DurationUnit;
  tickInit: number | null;
  expiry: DurationBoundary;
};

export type NormalizedDuration = {
  duration: number | null;
  durationUnit: "round";
};

/**
 * Convert minutes/hours/days to rounds on creation and store as rounds.
 * null duration means until removed.
 */
export function normalizeDuration(input: {
  duration: number | null;
  durationUnit: DurationUnit;
}): NormalizedDuration {
  if (input.duration == null) {
    return { duration: null, durationUnit: "round" };
  }

  const multiplier = ROUNDS_PER_UNIT[input.durationUnit];
  return {
    duration: input.duration * multiplier,
    durationUnit: "round",
  };
}

/**
 * Whether this effect should decrement on the given turn boundary.
 * tickInit defaults to the source combatant's init at creation; ticks when that actor's turn hits the boundary.
 */
export function shouldTick(
  effect: TimedEffect,
  actorInit: number,
  boundary: DurationBoundary,
): boolean {
  if (effect.duration == null) return false;
  if (effect.expiry !== boundary) return false;
  if (effect.tickInit == null) return false;
  return effect.tickInit === actorInit;
}

export type TickResult = {
  effect: TimedEffect;
  expired: boolean;
};

/** Decrement duration by one round; expired when duration reaches 0. */
export function tick(effect: TimedEffect): TickResult {
  if (effect.duration == null) {
    return { effect, expired: false };
  }

  const nextDuration = effect.duration - 1;
  if (nextDuration <= 0) {
    return {
      effect: { ...effect, duration: 0 },
      expired: true,
    };
  }

  return {
    effect: { ...effect, duration: nextDuration },
    expired: false,
  };
}
