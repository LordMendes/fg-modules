export type TurnUndeadClass = "cleric" | "paladin";

export type TurnUndeadOutcome = "turned" | "destroyed";

export type TurnUndeadTarget = {
  label: string;
  hd: number;
  count: number;
};

export type TurnUndeadInput = {
  class: TurnUndeadClass;
  level: number;
  /** Ability score, not the modifier. 3 is a -4 modifier. */
  charisma: number;
  religionBonus: boolean;
  greaterTurnUndead: boolean;
  d20: number | null;
  d6First: number | null;
  d6Second: number | null;
  targets: TurnUndeadTarget[];
};

export type TurnUndeadStackResult = {
  label: string;
  hd: number;
  count: number;
  affected: number;
  outcome: TurnUndeadOutcome | null;
};

export type TurnUndeadResult = {
  effectiveLevel: number;
  charismaModifier: number;
  /** 3 + Charisma modifier. Negative means no attempts. */
  turningAttempts: number;
  checkTotal: number;
  maxHdPerCreature: number;
  /** 2d6 + effective level + Charisma modifier, before the 0 HD floor. */
  damageRoll: number;
  damagePool: number;
  damageSpent: number;
  damageRemaining: number;
  eligibleHdTotal: number;
  allEligibleAffected: boolean;
  stacks: TurnUndeadStackResult[];
};
