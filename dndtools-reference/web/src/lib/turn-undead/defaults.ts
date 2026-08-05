import type { TurnUndeadInput } from "./types";

export const DEFAULT_TURN_UNDEAD_INPUT: TurnUndeadInput = {
  class: "cleric",
  level: 1,
  chaMod: 0,
  religionBonus: false,
  greaterTurnUndead: false,
  d20: null,
  d6First: null,
  d6Second: null,
  targets: [],
};
