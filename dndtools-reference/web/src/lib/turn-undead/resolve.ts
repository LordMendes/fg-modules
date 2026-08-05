import type {
  TurnUndeadClass,
  TurnUndeadInput,
  TurnUndeadOutcome,
  TurnUndeadResult,
  TurnUndeadStackResult,
} from "./types";

type ExpandedCreature = {
  stackIndex: number;
  creatureIndex: number;
  label: string;
  hd: number;
};

export function effectiveTurnLevel(
  className: TurnUndeadClass,
  level: number,
): number {
  if (className === "cleric") {
    return level;
  }
  return Math.max(1, level - 3);
}

export function maxHdFromCheck(
  checkTotal: number,
  effectiveLevel: number,
): number {
  let offset: number;

  if (checkTotal <= 0) {
    offset = -4;
  } else if (checkTotal <= 3) {
    offset = -3;
  } else if (checkTotal <= 6) {
    offset = -4;
  } else if (checkTotal <= 9) {
    offset = -1;
  } else if (checkTotal <= 12) {
    offset = 0;
  } else if (checkTotal <= 15) {
    offset = 1;
  } else if (checkTotal <= 18) {
    offset = 2;
  } else if (checkTotal <= 21) {
    offset = 3;
  } else {
    offset = 4;
  }

  return Math.max(0, effectiveLevel + offset);
}

function isValidDie(value: number | null, min: number, max: number): value is number {
  return value !== null && Number.isInteger(value) && value >= min && value <= max;
}

function expandCreatures(input: TurnUndeadInput): ExpandedCreature[] {
  const creatures: ExpandedCreature[] = [];

  input.targets.forEach((target, stackIndex) => {
    const count = Math.max(0, Math.floor(target.count));
    const hd = Math.max(0, target.hd);

    for (let creatureIndex = 0; creatureIndex < count; creatureIndex += 1) {
      creatures.push({
        stackIndex,
        creatureIndex,
        label: target.label,
        hd,
      });
    }
  });

  return creatures;
}

function creatureOutcome(
  effectiveLevel: number,
  hd: number,
  greaterTurnUndead: boolean,
): TurnUndeadOutcome {
  if (greaterTurnUndead) {
    return "destroyed";
  }

  return effectiveLevel >= 2 * hd ? "destroyed" : "turned";
}

function aggregateStacks(
  input: TurnUndeadInput,
  affectedByCreature: Map<string, TurnUndeadOutcome>,
): TurnUndeadStackResult[] {
  return input.targets.map((target, stackIndex) => {
    const count = Math.max(0, Math.floor(target.count));
    let affected = 0;
    let outcome: TurnUndeadOutcome | null = null;

    for (let creatureIndex = 0; creatureIndex < count; creatureIndex += 1) {
      const key = `${stackIndex}:${creatureIndex}`;
      const creatureOutcomeValue = affectedByCreature.get(key);
      if (creatureOutcomeValue) {
        affected += 1;
        outcome = creatureOutcomeValue;
      }
    }

    return {
      label: target.label,
      hd: target.hd,
      count,
      affected,
      outcome,
    };
  });
}

export function resolveTurnUndead(input: TurnUndeadInput): TurnUndeadResult | null {
  if (
    !isValidDie(input.d20, 1, 20) ||
    !isValidDie(input.d6First, 1, 6) ||
    !isValidDie(input.d6Second, 1, 6)
  ) {
    return null;
  }

  const effectiveLevel = effectiveTurnLevel(input.class, input.level);
  const religionBonus = input.religionBonus ? 2 : 0;

  const checkTotal =
    input.d20 + effectiveLevel + input.chaMod + religionBonus;
  const maxHdPerCreature = maxHdFromCheck(checkTotal, effectiveLevel);
  const damagePool =
    input.d6First + input.d6Second + effectiveLevel + input.chaMod;

  const creatures = expandCreatures(input);
  const eligibleCreatures = creatures.filter(
    (creature) => creature.hd <= maxHdPerCreature,
  );
  const eligibleHdTotal = eligibleCreatures.reduce(
    (total, creature) => total + creature.hd,
    0,
  );

  const sortedEligible = [...eligibleCreatures].sort((left, right) => {
    if (left.hd !== right.hd) {
      return left.hd - right.hd;
    }
    if (left.stackIndex !== right.stackIndex) {
      return left.stackIndex - right.stackIndex;
    }
    return left.creatureIndex - right.creatureIndex;
  });

  let damageRemaining = damagePool;
  const affectedByCreature = new Map<string, TurnUndeadOutcome>();

  for (const creature of sortedEligible) {
    if (damageRemaining < creature.hd) {
      break;
    }

    damageRemaining -= creature.hd;
    affectedByCreature.set(
      `${creature.stackIndex}:${creature.creatureIndex}`,
      creatureOutcome(effectiveLevel, creature.hd, input.greaterTurnUndead),
    );
  }

  const damageSpent = damagePool - damageRemaining;
  const stacks = aggregateStacks(input, affectedByCreature);

  return {
    effectiveLevel,
    checkTotal,
    maxHdPerCreature,
    damagePool,
    damageSpent,
    damageRemaining,
    eligibleHdTotal,
    allEligibleAffected:
      eligibleHdTotal > 0 && damageSpent === eligibleHdTotal,
    stacks,
  };
}

export function formatStackOutcome(stack: TurnUndeadStackResult): string {
  if (stack.affected === 0) {
    return "Unaffected";
  }

  const verb = stack.outcome === "destroyed" ? "Destroyed" : "Turned";

  if (stack.affected === stack.count) {
    return verb;
  }

  return `${verb} ${stack.affected}/${stack.count}`;
}

export type TurnUndeadOutcomeTone = "unaffected" | "turned" | "destroyed";

export function stackOutcomeTone(
  stack: TurnUndeadStackResult,
): TurnUndeadOutcomeTone {
  if (stack.affected === 0) {
    return "unaffected";
  }

  return stack.outcome === "destroyed" ? "destroyed" : "turned";
}
