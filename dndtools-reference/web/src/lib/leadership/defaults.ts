import type { LeadershipInput } from "./types";

export const DEFAULT_LEADERSHIP_INPUT: LeadershipInput = {
  characterLevel: 10,
  charismaMode: "modifier",
  charismaValue: 2,
  strengthMode: "modifier",
  strengthValue: 0,
  reputation: {},
  cohortModifiers: {
    familiarMountCompanion: false,
    differentAlignment: false,
    cohortDeaths: 0,
  },
  followerModifiers: {
    stronghold: false,
    movesAround: false,
    followerDeaths: 0,
  },
  feats: {
    improvedCohort: false,
    dragonCohort: false,
    epicLeadership: false,
    naturalLeader: false,
    extraFollowers: false,
    improvedLeadership: false,
    mightMakesRight: false,
    legendaryCommander: false,
  },
};
