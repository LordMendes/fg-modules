export type ReputationKey =
  | "greatRenown"
  | "fairnessGenerosity"
  | "specialPower"
  | "failure"
  | "aloofness"
  | "cruelty";

export type CohortModifierKey =
  | "familiarMountCompanion"
  | "differentAlignment"
  | "cohortDeaths";

export type FollowerModifierKey =
  | "stronghold"
  | "movesAround"
  | "followerDeaths";

export type LeadershipInput = {
  characterLevel: number;
  charismaMode: "score" | "modifier";
  charismaValue: number;
  strengthMode: "score" | "modifier";
  strengthValue: number;
  reputation: Partial<Record<ReputationKey, boolean>>;
  cohortModifiers: {
    familiarMountCompanion: boolean;
    differentAlignment: boolean;
    cohortDeaths: number;
  };
  followerModifiers: {
    stronghold: boolean;
    movesAround: boolean;
    followerDeaths: number;
  };
  feats: {
    improvedCohort: boolean;
    dragonCohort: boolean;
    epicLeadership: boolean;
    naturalLeader: boolean;
    extraFollowers: boolean;
    improvedLeadership: boolean;
    mightMakesRight: boolean;
    legendaryCommander: boolean;
  };
};

export type FollowerCounts = {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  level7?: number;
  level8?: number;
  level9?: number;
  level10?: number;
};

export type LeadershipTableRow = {
  score: number;
  scoreLabel: string;
  cohortLevel: number | null;
  cohortLabel: string;
  followers: FollowerCounts;
};

export type LeadershipWarning = {
  message: string;
};

export type LeadershipResult = {
  baseScore: number;
  charismaModifier: number;
  strengthModifier: number;
  cohortScore: number;
  followerScore: number;
  cohortLookup: LeadershipTableRow | null;
  followerLookup: LeadershipTableRow | null;
  tableCohortLevel: number | null;
  effectiveCohortLevel: number | null;
  cohortCapped: boolean;
  followers: FollowerCounts | null;
  tableFollowers: FollowerCounts | null;
  followersMultiplier: number;
  tableKind: "phb" | "epic";
  displayTable: LeadershipTableRow[];
  warnings: LeadershipWarning[];
  featScoreBonus: number;
  followerScoreBonus: number;
};
