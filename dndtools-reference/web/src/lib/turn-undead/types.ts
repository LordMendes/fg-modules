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
  chaMod: number;
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
  checkTotal: number;
  maxHdPerCreature: number;
  damagePool: number;
  damageSpent: number;
  damageRemaining: number;
  eligibleHdTotal: number;
  allEligibleAffected: boolean;
  stacks: TurnUndeadStackResult[];
};
