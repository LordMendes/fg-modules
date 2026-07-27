import type {
  CohortModifierKey,
  FollowerModifierKey,
  ReputationKey,
} from "./types";

type ModifierDefinitionBase = {
  label: string;
  value: number;
  description?: string;
};

export type ReputationModifierDefinition = ModifierDefinitionBase & {
  key: ReputationKey;
  scope: "reputation";
};

export type CohortModifierDefinition = ModifierDefinitionBase & {
  key: CohortModifierKey;
  scope: "cohort";
};

export type FollowerModifierDefinition = ModifierDefinitionBase & {
  key: FollowerModifierKey;
  scope: "follower";
};

export type ModifierDefinition =
  | ReputationModifierDefinition
  | CohortModifierDefinition
  | FollowerModifierDefinition;

export const REPUTATION_MODIFIERS: ReputationModifierDefinition[] = [
  {
    key: "greatRenown",
    label: "Great renown",
    value: 2,
    scope: "reputation",
  },
  {
    key: "fairnessGenerosity",
    label: "Fairness and generosity",
    value: 1,
    scope: "reputation",
  },
  {
    key: "specialPower",
    label: "Special power",
    value: 1,
    scope: "reputation",
  },
  {
    key: "failure",
    label: "Failure",
    value: -1,
    scope: "reputation",
  },
  {
    key: "aloofness",
    label: "Aloofness",
    value: -1,
    scope: "reputation",
  },
  {
    key: "cruelty",
    label: "Cruelty",
    value: -2,
    scope: "reputation",
  },
];

export const COHORT_MODIFIERS: CohortModifierDefinition[] = [
  {
    key: "familiarMountCompanion",
    label: "Has familiar, special mount, or animal companion",
    value: -2,
    scope: "cohort",
  },
  {
    key: "differentAlignment",
    label: "Recruiting cohort of different alignment",
    value: -1,
    scope: "cohort",
  },
  {
    key: "cohortDeaths",
    label: "Caused death of a cohort",
    value: -2,
    scope: "cohort",
    description: "−2 per cohort killed (cumulative)",
  },
];

export const FOLLOWER_MODIFIERS: FollowerModifierDefinition[] = [
  {
    key: "stronghold",
    label: "Has stronghold, base, guildhouse, or similar",
    value: 2,
    scope: "follower",
  },
  {
    key: "movesAround",
    label: "Moves around a lot",
    value: -1,
    scope: "follower",
  },
  {
    key: "followerDeaths",
    label: "Caused death of other followers",
    value: -1,
    scope: "follower",
  },
];
