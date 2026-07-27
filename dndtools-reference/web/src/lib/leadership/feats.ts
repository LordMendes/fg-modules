import type { LeadershipInput } from "./types";

export type LeadershipFeatKey = keyof LeadershipInput["feats"];

export const LEADERSHIP_SCORE_FEATS = {
  naturalLeader: { label: "Natural Leader", bonus: 2, source: "Dragon #346" },
  improvedLeadership: {
    label: "Improved Leadership",
    bonus: 2,
    source: "Dragon #317",
  },
} as const;

export function sumFeatScoreBonus(feats: LeadershipInput["feats"]): number {
  let total = 0;
  if (feats.naturalLeader) {
    total += LEADERSHIP_SCORE_FEATS.naturalLeader.bonus;
  }
  if (feats.improvedLeadership) {
    total += LEADERSHIP_SCORE_FEATS.improvedLeadership.bonus;
  }
  return total;
}

export function computeFollowersMultiplier(
  feats: LeadershipInput["feats"],
): number {
  return (feats.extraFollowers ? 2 : 1) * (feats.legendaryCommander ? 10 : 1);
}

export function mightMakesRightStrengthBonus(
  feats: LeadershipInput["feats"],
  strengthModifier: number,
): number {
  return feats.mightMakesRight ? strengthModifier : 0;
}
