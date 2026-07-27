import {
  COHORT_MODIFIERS,
  FOLLOWER_MODIFIERS,
  REPUTATION_MODIFIERS,
} from "./modifiers";
import {
  EPIC_LEADERSHIP_TABLE,
  formatOrdinalLevel,
  PHB_LEADERSHIP_TABLE,
} from "./tables";
import type {
  FollowerCounts,
  LeadershipInput,
  LeadershipResult,
  LeadershipTableRow,
  LeadershipWarning,
} from "./types";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function charismaModifierFromInput(input: LeadershipInput): number {
  if (input.charismaMode === "modifier") {
    return input.charismaValue;
  }
  return abilityModifier(input.charismaValue);
}

function sumReputationModifiers(input: LeadershipInput): number {
  return REPUTATION_MODIFIERS.reduce((total, modifier) => {
    if (input.reputation[modifier.key as keyof typeof input.reputation]) {
      return total + modifier.value;
    }
    return total;
  }, 0);
}

function sumCohortModifiers(input: LeadershipInput): number {
  let total = 0;

  for (const modifier of COHORT_MODIFIERS) {
    if (modifier.key === "cohortDeaths") {
      total += modifier.value * Math.max(0, input.cohortModifiers.cohortDeaths);
      continue;
    }

    if (input.cohortModifiers[modifier.key as keyof typeof input.cohortModifiers]) {
      total += modifier.value;
    }
  }

  return total;
}

function sumFollowerModifiers(input: LeadershipInput): number {
  let total = 0;

  for (const modifier of FOLLOWER_MODIFIERS) {
    if (modifier.key === "followerDeaths") {
      total +=
        modifier.value * Math.max(0, input.followerModifiers.followerDeaths);
      continue;
    }

    if (
      input.followerModifiers[modifier.key as keyof typeof input.followerModifiers]
    ) {
      total += modifier.value;
    }
  }

  return total;
}

function lookupPhbScore(score: number): LeadershipTableRow | null {
  if (score <= 1) {
    return PHB_LEADERSHIP_TABLE[0] ?? null;
  }

  if (score >= 25) {
    return PHB_LEADERSHIP_TABLE[PHB_LEADERSHIP_TABLE.length - 1] ?? null;
  }

  return PHB_LEADERSHIP_TABLE.find((entry) => entry.score === score) ?? null;
}

function lookupEpicScore(score: number): LeadershipTableRow | null {
  if (score < 25) {
    return lookupPhbScore(score);
  }

  if (score >= 40) {
    return EPIC_LEADERSHIP_TABLE[EPIC_LEADERSHIP_TABLE.length - 1] ?? null;
  }

  return EPIC_LEADERSHIP_TABLE.find((entry) => entry.score === score) ?? null;
}

function lookupScore(
  score: number,
  useEpicTable: boolean,
): LeadershipTableRow | null {
  if (useEpicTable && score >= 25) {
    return lookupEpicScore(score);
  }

  return lookupPhbScore(score);
}

function hasFollowers(followers: FollowerCounts): boolean {
  return Object.values(followers).some((count) => count > 0);
}

function doubleFollowers(followers: FollowerCounts): FollowerCounts {
  return {
    level1: followers.level1 * 2,
    level2: followers.level2 * 2,
    level3: followers.level3 * 2,
    level4: followers.level4 * 2,
    level5: followers.level5 * 2,
    level6: followers.level6 * 2,
    ...(followers.level7 !== undefined
      ? { level7: followers.level7 * 2 }
      : {}),
    ...(followers.level8 !== undefined
      ? { level8: followers.level8 * 2 }
      : {}),
    ...(followers.level9 !== undefined
      ? { level9: followers.level9 * 2 }
      : {}),
    ...(followers.level10 !== undefined
      ? { level10: followers.level10 * 2 }
      : {}),
  };
}

function applyCohortCap(
  tableCohortLevel: number | null,
  characterLevel: number,
  improvedCohort: boolean,
): { effectiveCohortLevel: number | null; capped: boolean } {
  if (tableCohortLevel === null) {
    return { effectiveCohortLevel: null, capped: false };
  }

  const cap = characterLevel - (improvedCohort ? 1 : 2);
  if (cap < 1) {
    return { effectiveCohortLevel: null, capped: tableCohortLevel > 0 };
  }

  const effectiveCohortLevel = Math.min(tableCohortLevel, cap);
  return {
    effectiveCohortLevel,
    capped: effectiveCohortLevel < tableCohortLevel,
  };
}

export function calculateLeadership(input: LeadershipInput): LeadershipResult {
  const warnings: LeadershipWarning[] = [];
  const charismaModifier = charismaModifierFromInput(input);
  const featScoreBonus = input.feats.naturalLeader ? 2 : 0;
  const baseScore = input.characterLevel + charismaModifier + featScoreBonus;
  const reputationTotal = sumReputationModifiers(input);
  const cohortScore = baseScore + reputationTotal + sumCohortModifiers(input);
  const followerScore = baseScore + reputationTotal + sumFollowerModifiers(input);

  const useEpicTable = input.feats.epicLeadership;
  const needsEpicTable =
    useEpicTable && (cohortScore >= 25 || followerScore >= 25);
  const tableKind: LeadershipResult["tableKind"] = needsEpicTable
    ? "epic"
    : "phb";

  const displayTable = needsEpicTable
    ? [
        ...PHB_LEADERSHIP_TABLE.filter((entry) => entry.score < 25),
        ...EPIC_LEADERSHIP_TABLE,
      ]
    : PHB_LEADERSHIP_TABLE;

  const cohortLookup = lookupScore(cohortScore, useEpicTable);
  const followerLookup = lookupScore(followerScore, useEpicTable);

  const tableCohortLevel = cohortLookup?.cohortLevel ?? null;
  const { effectiveCohortLevel, capped: cohortCapped } = applyCohortCap(
    tableCohortLevel,
    input.characterLevel,
    input.feats.improvedCohort,
  );

  const tableFollowers =
    followerLookup && hasFollowers(followerLookup.followers)
      ? followerLookup.followers
      : null;
  const followersMultiplier = input.feats.extraFollowers ? 2 : 1;
  const followers =
    tableFollowers && followersMultiplier > 1
      ? doubleFollowers(tableFollowers)
      : tableFollowers;

  if (input.characterLevel < 6) {
    warnings.push({
      message:
        "Leadership requires character level 6 or higher. Results are shown for reference only.",
    });
  }

  if (cohortCapped && tableCohortLevel !== null && effectiveCohortLevel !== null) {
    warnings.push({
      message: `Table cohort level (${formatOrdinalLevel(tableCohortLevel)}) exceeds the level cap (${formatOrdinalLevel(effectiveCohortLevel)}).`,
    });
  }

  if (cohortScore <= 1) {
    warnings.push({
      message: "Cohort leadership score is 1 or lower — no cohort can be attracted.",
    });
  }

  if (followerScore <= 1 || !followers) {
    warnings.push({
      message: "Follower leadership score is too low — no followers can be attracted.",
    });
  }

  return {
    baseScore,
    charismaModifier,
    cohortScore,
    followerScore,
    cohortLookup,
    followerLookup,
    tableCohortLevel,
    effectiveCohortLevel,
    cohortCapped,
    followers,
    tableFollowers,
    followersMultiplier,
    tableKind,
    displayTable,
    warnings,
    featScoreBonus,
  };
}
