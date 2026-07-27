import { DEFAULT_LEADERSHIP_INPUT } from "./defaults";
import type { LeadershipInput } from "./types";

const REPUTATION_KEYS = [
  "greatRenown",
  "fairnessGenerosity",
  "specialPower",
  "failure",
  "aloofness",
  "cruelty",
] as const;

const COHORT_BOOLEAN_KEYS = [
  "familiarMountCompanion",
  "differentAlignment",
] as const;

const FOLLOWER_BOOLEAN_KEYS = ["stronghold", "movesAround"] as const;

const FEAT_PARAM_TO_KEY = {
  ic: "improvedCohort",
  dc: "dragonCohort",
  el: "epicLeadership",
  nl: "naturalLeader",
  ef: "extraFollowers",
  il: "improvedLeadership",
  mmr: "mightMakesRight",
  lc: "legendaryCommander",
} as const satisfies Record<string, keyof LeadershipInput["feats"]>;

type FeatParam = keyof typeof FEAT_PARAM_TO_KEY;

const FEAT_KEY_TO_PARAM = Object.fromEntries(
  Object.entries(FEAT_PARAM_TO_KEY).map(([param, key]) => [key, param]),
) as Record<keyof LeadershipInput["feats"], FeatParam>;

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseIntParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseAbilityMode(
  value: string | undefined,
  fallback: LeadershipInput["charismaMode"],
): LeadershipInput["charismaMode"] {
  return value === "score" ? "score" : fallback;
}

function setBooleanFlags<T extends string>(
  keys: readonly T[],
  activeKeys: string[],
): Partial<Record<T, boolean>> {
  const active = new Set(activeKeys);
  const result: Partial<Record<T, boolean>> = {};

  for (const key of keys) {
    if (active.has(key)) {
      result[key] = true;
    }
  }

  return result;
}

export function parseLeadershipSearchParams(
  searchParams: Record<string, string | string[] | undefined> = {},
): LeadershipInput {
  const defaults = DEFAULT_LEADERSHIP_INPUT;

  function readParam(key: string): string | undefined {
    const value = searchParams[key];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  const reputationActive = parseCsv(readParam("rep")).filter((key) =>
    REPUTATION_KEYS.includes(key as (typeof REPUTATION_KEYS)[number]),
  );
  const cohortActive = parseCsv(readParam("cohort")).filter((key) =>
    COHORT_BOOLEAN_KEYS.includes(key as (typeof COHORT_BOOLEAN_KEYS)[number]),
  );
  const followerActive = parseCsv(readParam("follower")).filter((key) =>
    FOLLOWER_BOOLEAN_KEYS.includes(key as (typeof FOLLOWER_BOOLEAN_KEYS)[number]),
  );

  const feats = { ...defaults.feats };
  for (const param of parseCsv(readParam("feats"))) {
    const featKey = FEAT_PARAM_TO_KEY[param as FeatParam];
    if (featKey) {
      feats[featKey] = true;
    }
  }

  return {
    characterLevel: parseIntParam(readParam("lvl"), defaults.characterLevel, 1, 40),
    charismaMode: parseAbilityMode(readParam("chaMode"), defaults.charismaMode),
    charismaValue: parseIntParam(
      readParam("cha"),
      defaults.charismaValue,
      -5,
      50,
    ),
    strengthMode: parseAbilityMode(readParam("strMode"), defaults.strengthMode),
    strengthValue: parseIntParam(readParam("str"), defaults.strengthValue, -5, 50),
    reputation: setBooleanFlags(REPUTATION_KEYS, reputationActive),
    cohortModifiers: {
      ...defaults.cohortModifiers,
      ...setBooleanFlags(COHORT_BOOLEAN_KEYS, cohortActive),
      cohortDeaths: parseIntParam(
        readParam("cohortDeaths"),
        defaults.cohortModifiers.cohortDeaths,
        0,
        20,
      ),
    },
    followerModifiers: {
      ...defaults.followerModifiers,
      ...setBooleanFlags(FOLLOWER_BOOLEAN_KEYS, followerActive),
      followerDeaths: parseIntParam(
        readParam("followerDeaths"),
        defaults.followerModifiers.followerDeaths,
        0,
        20,
      ),
    },
    feats,
  };
}

export function buildLeadershipSearchParams(
  input: LeadershipInput,
): URLSearchParams {
  const defaults = DEFAULT_LEADERSHIP_INPUT;
  const params = new URLSearchParams();

  if (input.characterLevel !== defaults.characterLevel) {
    params.set("lvl", String(input.characterLevel));
  }

  if (input.charismaMode !== defaults.charismaMode) {
    params.set("chaMode", input.charismaMode);
  }

  if (input.charismaValue !== defaults.charismaValue) {
    params.set("cha", String(input.charismaValue));
  }

  if (input.strengthMode !== defaults.strengthMode) {
    params.set("strMode", input.strengthMode);
  }

  if (input.strengthValue !== defaults.strengthValue) {
    params.set("str", String(input.strengthValue));
  }

  const reputation = REPUTATION_KEYS.filter((key) => input.reputation[key]);
  if (reputation.length > 0) {
    params.set("rep", reputation.join(","));
  }

  const cohort = COHORT_BOOLEAN_KEYS.filter((key) => input.cohortModifiers[key]);
  if (cohort.length > 0) {
    params.set("cohort", cohort.join(","));
  }

  if (input.cohortModifiers.cohortDeaths !== defaults.cohortModifiers.cohortDeaths) {
    params.set("cohortDeaths", String(input.cohortModifiers.cohortDeaths));
  }

  const follower = FOLLOWER_BOOLEAN_KEYS.filter(
    (key) => input.followerModifiers[key],
  );
  if (follower.length > 0) {
    params.set("follower", follower.join(","));
  }

  if (
    input.followerModifiers.followerDeaths !==
    defaults.followerModifiers.followerDeaths
  ) {
    params.set("followerDeaths", String(input.followerModifiers.followerDeaths));
  }

  const feats = (Object.keys(FEAT_KEY_TO_PARAM) as Array<keyof LeadershipInput["feats"]>)
    .filter((key) => input.feats[key])
    .map((key) => FEAT_KEY_TO_PARAM[key]);

  if (feats.length > 0) {
    params.set("feats", feats.join(","));
  }

  return params;
}

export function serializeLeadershipInput(input: LeadershipInput): string {
  return buildLeadershipSearchParams(input).toString();
}
