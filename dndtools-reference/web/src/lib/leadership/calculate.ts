import {
  computeFollowersMultiplier,
  mightMakesRightStrengthBonus,
  sumFeatScoreBonus,
} from "./feats";
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

export function modifierToScore(modifier: number): number {
  return 10 + modifier * 2;
}

export function convertAbilityInputValue(
  value: number,
  fromMode: LeadershipInput["charismaMode"],
  toMode: LeadershipInput["charismaMode"],
): number {
  if (fromMode === toMode) {
    return value;
  }

  if (toMode === "modifier") {
    return fromMode === "score" ? abilityModifier(value) : value;
  }

  const modifier = fromMode === "modifier" ? value : abilityModifier(value);
  return modifierToScore(modifier);
}

export function charismaModifierFromInput(input: LeadershipInput): number {
  if (input.charismaMode === "modifier") {
    return input.charismaValue;
  }
  return abilityModifier(input.charismaValue);
}

export function strengthModifierFromInput(input: LeadershipInput): number {
  if (input.strengthMode === "modifier") {
    return input.strengthValue;
  }
  return abilityModifier(input.strengthValue);
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

function scaleFollowers(
  followers: FollowerCounts,
  multiplier: number,
): FollowerCounts {
  return {
    level1: followers.level1 * multiplier,
    level2: followers.level2 * multiplier,
    level3: followers.level3 * multiplier,
    level4: followers.level4 * multiplier,
    level5: followers.level5 * multiplier,
    level6: followers.level6 * multiplier,
    ...(followers.level7 !== undefined
      ? { level7: followers.level7 * multiplier }
      : {}),
    ...(followers.level8 !== undefined
      ? { level8: followers.level8 * multiplier }
      : {}),
    ...(followers.level9 !== undefined
      ? { level9: followers.level9 * multiplier }
      : {}),
    ...(followers.level10 !== undefined
      ? { level10: followers.level10 * multiplier }
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
  const strengthModifier = strengthModifierFromInput(input);
  const featScoreBonus = sumFeatScoreBonus(input.feats);
  const followerScoreBonus = mightMakesRightStrengthBonus(
    input.feats,
    strengthModifier,
  );
  const baseScore = input.characterLevel + charismaModifier + featScoreBonus;
  const reputationTotal = sumReputationModifiers(input);
  const cohortScore = baseScore + reputationTotal + sumCohortModifiers(input);
  const followerScore =
    baseScore +
    followerScoreBonus +
    reputationTotal +
    sumFollowerModifiers(input);

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
  const followersMultiplier = computeFollowersMultiplier(input.feats);
  const followers =
    tableFollowers && followersMultiplier > 1
      ? scaleFollowers(tableFollowers, followersMultiplier)
      : tableFollowers;

  if (input.characterLevel < 6) {
    warnings.push({
      message:
        "Leadership requires character level 6 or higher. Results are shown for reference only.",
    });
  }

  if (input.feats.legendaryCommander && !input.feats.epicLeadership) {
    warnings.push({
      message:
        "Legendary Commander requires Epic Leadership (Epic Level Handbook). Results are shown for reference only.",
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
    strengthModifier,
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
    followerScoreBonus,
  };
}
