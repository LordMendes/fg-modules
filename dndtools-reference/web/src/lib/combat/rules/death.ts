import type { ConditionKey } from "../types";

export type DeathHpContext = {
  hpMax: number;
  wounds: number;
  nonlethal: number;
  deathState?: "dying" | "stable" | "disabled" | "dead" | null;
};

export type DeathResolutionInput = DeathHpContext & {
  massiveDamage?: {
    damage: number;
    saveFailed?: boolean;
  };
};

export type DeathState = "dying" | "stable" | "disabled" | "dead" | null;

export type SystemEffectPatch = {
  add: ConditionKey[];
  remove: ConditionKey[];
};

export type DeathResolutionResult = {
  deathState: DeathState;
  turnState?: "dead";
  systemEffects: SystemEffectPatch;
};

const HP_DEATH_STATES: ConditionKey[] = [
  "dying",
  "stable",
  "disabled",
  "dead",
];

const NONLETHAL_STATES: ConditionKey[] = ["unconscious", "staggered"];

function remainingHp(ctx: DeathHpContext): number {
  return ctx.hpMax - Math.max(0, ctx.wounds);
}

function resolveHpDeathState(
  hp: number,
  currentDeathState: DeathState,
  massiveDamage?: DeathResolutionInput["massiveDamage"],
): DeathState {
  const massiveKill =
    massiveDamage != null &&
    massiveDamage.damage >= 50 &&
    massiveDamage.saveFailed === true;

  if (hp <= -10 || massiveKill) return "dead";
  if (hp < 0) {
    if (currentDeathState === "stable") return "stable";
    return "dying";
  }
  if (hp === 0) return "disabled";
  return null;
}

function resolveNonlethalStates(hp: number, nonlethal: number): ConditionKey[] {
  if (hp <= 0) return [];
  if (nonlethal > hp) return ["unconscious"];
  if (nonlethal === hp) return ["staggered"];
  return [];
}

/**
 * Derive death state and system effect patches from HP and nonlethal totals.
 * Only one of Dying, Stable, Disabled, or Dead is active at a time.
 */
export function resolveDeathState(
  input: DeathResolutionInput,
): DeathResolutionResult {
  const hp = remainingHp(input);
  const nonlethal = Math.max(0, input.nonlethal);
  const current = input.deathState ?? null;

  const deathState = resolveHpDeathState(hp, current, input.massiveDamage);
  const nonlethalStates = resolveNonlethalStates(hp, nonlethal);

  const add: ConditionKey[] = [];
  const remove: ConditionKey[] = [];

  for (const state of HP_DEATH_STATES) {
    if (state === deathState) {
      add.push(state);
    } else {
      remove.push(state);
    }
  }

  for (const state of NONLETHAL_STATES) {
    if (nonlethalStates.includes(state)) {
      add.push(state);
    } else {
      remove.push(state);
    }
  }

  return {
    deathState,
    turnState: deathState === "dead" ? "dead" : undefined,
    systemEffects: { add, remove },
  };
}
