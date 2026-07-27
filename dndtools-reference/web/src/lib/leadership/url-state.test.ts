import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_LEADERSHIP_INPUT } from "./defaults";
import {
  buildLeadershipSearchParams,
  parseLeadershipSearchParams,
  serializeLeadershipInput,
} from "./url-state";

describe("leadership url-state", () => {
  it("returns defaults for an empty query string", () => {
    assert.deepEqual(parseLeadershipSearchParams({}), DEFAULT_LEADERSHIP_INPUT);
    assert.equal(serializeLeadershipInput(DEFAULT_LEADERSHIP_INPUT), "");
  });

  it("round-trips a customized build", () => {
    const input = {
      ...DEFAULT_LEADERSHIP_INPUT,
      characterLevel: 12,
      charismaMode: "score" as const,
      charismaValue: 16,
      strengthMode: "modifier" as const,
      strengthValue: 4,
      reputation: { greatRenown: true, cruelty: true },
      cohortModifiers: {
        familiarMountCompanion: true,
        differentAlignment: false,
        cohortDeaths: 1,
      },
      followerModifiers: {
        stronghold: true,
        movesAround: false,
        followerDeaths: 2,
      },
      feats: {
        ...DEFAULT_LEADERSHIP_INPUT.feats,
        naturalLeader: true,
        mightMakesRight: true,
        extraFollowers: true,
      },
    };

    const params = buildLeadershipSearchParams(input);
    const parsed = parseLeadershipSearchParams(
      Object.fromEntries(params.entries()),
    );

    assert.deepEqual(parsed, input);
    assert.equal(
      params.toString(),
      "lvl=12&chaMode=score&cha=16&str=4&rep=greatRenown%2Ccruelty&cohort=familiarMountCompanion&cohortDeaths=1&follower=stronghold&followerDeaths=2&feats=nl%2Cef%2Cmmr",
    );
  });

  it("ignores unknown reputation, cohort, follower, and feat keys", () => {
    const parsed = parseLeadershipSearchParams({
      rep: "greatRenown,unknown",
      cohort: "familiarMountCompanion,invalid",
      follower: "stronghold,bogus",
      feats: "nl,zz",
    });

    assert.equal(parsed.reputation.greatRenown, true);
    assert.equal(parsed.reputation.cruelty, undefined);
    assert.equal(parsed.cohortModifiers.familiarMountCompanion, true);
    assert.equal(parsed.followerModifiers.stronghold, true);
    assert.equal(parsed.feats.naturalLeader, true);
    assert.equal(parsed.feats.extraFollowers, false);
  });

  it("clamps numeric values to supported ranges", () => {
    const parsed = parseLeadershipSearchParams({
      lvl: "999",
      cha: "-99",
      str: "999",
      cohortDeaths: "99",
      followerDeaths: "99",
    });

    assert.equal(parsed.characterLevel, 40);
    assert.equal(parsed.charismaValue, -5);
    assert.equal(parsed.strengthValue, 50);
    assert.equal(parsed.cohortModifiers.cohortDeaths, 20);
    assert.equal(parsed.followerModifiers.followerDeaths, 20);
  });
});
