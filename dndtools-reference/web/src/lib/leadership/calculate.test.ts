import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateLeadership, convertAbilityInputValue } from "./calculate";
import type { LeadershipInput } from "./types";

const defaultInput: LeadershipInput = {
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

describe("calculateLeadership", () => {
  it("computes base score from level and charisma modifier", () => {
    const result = calculateLeadership(defaultInput);
    assert.equal(result.baseScore, 12);
    assert.equal(result.cohortScore, 12);
    assert.equal(result.followerScore, 12);
  });

  it("computes charisma modifier from score", () => {
    const result = calculateLeadership({
      ...defaultInput,
      charismaMode: "score",
      charismaValue: 14,
    });
    assert.equal(result.charismaModifier, 2);
    assert.equal(result.baseScore, 12);
  });

  it("returns 8th cohort and eight 1st-level followers at score 12", () => {
    const result = calculateLeadership(defaultInput);
    assert.equal(result.tableCohortLevel, 8);
    assert.equal(result.effectiveCohortLevel, 8);
    assert.equal(result.followers?.level1, 8);
    assert.equal(result.tableKind, "phb");
  });

  it("applies improved cohort level cap", () => {
    const capped = calculateLeadership({
      ...defaultInput,
      characterLevel: 9,
      charismaMode: "modifier",
      charismaValue: 3,
    });
    assert.equal(capped.tableCohortLevel, 8);
    assert.equal(capped.effectiveCohortLevel, 7);
    assert.equal(capped.cohortCapped, true);

    const improved = calculateLeadership({
      ...defaultInput,
      characterLevel: 9,
      charismaMode: "modifier",
      charismaValue: 3,
      feats: { ...defaultInput.feats, improvedCohort: true },
    });
    assert.equal(improved.effectiveCohortLevel, 8);
    assert.equal(improved.cohortCapped, false);
  });

  it("applies stronghold modifier to followers only", () => {
    const result = calculateLeadership({
      ...defaultInput,
      followerModifiers: {
        ...defaultInput.followerModifiers,
        stronghold: true,
      },
    });
    assert.equal(result.cohortScore, 12);
    assert.equal(result.followerScore, 14);
    assert.equal(result.tableCohortLevel, 8);
    assert.equal(result.followers?.level1, 15);
  });

  it("applies familiar penalty to cohort score only", () => {
    const result = calculateLeadership({
      ...defaultInput,
      cohortModifiers: {
        ...defaultInput.cohortModifiers,
        familiarMountCompanion: true,
      },
    });
    assert.equal(result.cohortScore, 10);
    assert.equal(result.followerScore, 12);
    assert.equal(result.tableCohortLevel, 7);
    assert.equal(result.followers?.level1, 8);
  });

  it("uses epic table at score 26 when epic leadership is selected", () => {
    const result = calculateLeadership({
      ...defaultInput,
      characterLevel: 24,
      charismaMode: "modifier",
      charismaValue: 2,
      feats: { ...defaultInput.feats, epicLeadership: true },
    });
    assert.equal(result.cohortScore, 26);
    assert.equal(result.tableKind, "epic");
    assert.equal(result.tableCohortLevel, 18);
    assert.equal(result.followers?.level1, 160);
    assert.equal(result.followers?.level7, 1);
  });

  it("returns no cohort or followers at score 1 or lower", () => {
    const result = calculateLeadership({
      ...defaultInput,
      characterLevel: 6,
      charismaMode: "modifier",
      charismaValue: -5,
    });
    assert.equal(result.baseScore, 1);
    assert.equal(result.tableCohortLevel, null);
    assert.equal(result.effectiveCohortLevel, null);
    assert.equal(result.followers, null);
  });

  it("applies +2 Leadership score from Natural Leader (Dragon #346)", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: { ...defaultInput.feats, naturalLeader: true },
    });
    assert.equal(result.featScoreBonus, 2);
    assert.equal(result.baseScore, 14);
    assert.equal(result.cohortScore, 14);
    assert.equal(result.followerScore, 14);
    assert.equal(result.tableCohortLevel, 10);
    assert.equal(result.followers?.level1, 15);
  });

  it("applies +2 Leadership score from Improved Leadership (Dragon #317)", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: { ...defaultInput.feats, improvedLeadership: true },
    });
    assert.equal(result.featScoreBonus, 2);
    assert.equal(result.baseScore, 14);
    assert.equal(result.tableCohortLevel, 10);
    assert.equal(result.followers?.level1, 15);
  });

  it("stacks Natural Leader and Improved Leadership for +4 total", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: {
        ...defaultInput.feats,
        naturalLeader: true,
        improvedLeadership: true,
      },
    });
    assert.equal(result.featScoreBonus, 4);
    assert.equal(result.baseScore, 16);
    assert.equal(result.tableCohortLevel, 11);
    assert.equal(result.followers?.level1, 25);
  });

  it("doubles follower counts with Extra Followers", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: { ...defaultInput.feats, extraFollowers: true },
    });
    assert.equal(result.tableFollowers?.level1, 8);
    assert.equal(result.followers?.level1, 16);
    assert.equal(result.followersMultiplier, 2);
    assert.equal(result.tableCohortLevel, 8);
  });

  it("applies Might Makes Right to follower score only", () => {
    const result = calculateLeadership({
      ...defaultInput,
      strengthMode: "modifier",
      strengthValue: 4,
      feats: { ...defaultInput.feats, mightMakesRight: true },
    });
    assert.equal(result.cohortScore, 12);
    assert.equal(result.followerScoreBonus, 4);
    assert.equal(result.followerScore, 16);
    assert.equal(result.tableCohortLevel, 8);
    assert.equal(result.tableFollowers?.level1, 25);
    assert.equal(result.followers?.level1, 25);
  });

  it("converts strength score to modifier for Might Makes Right", () => {
    const result = calculateLeadership({
      ...defaultInput,
      strengthMode: "score",
      strengthValue: 16,
      feats: { ...defaultInput.feats, mightMakesRight: true },
    });
    assert.equal(result.strengthModifier, 3);
    assert.equal(result.followerScoreBonus, 3);
    assert.equal(result.followerScore, 15);
  });

  it("multiplies followers by 10 with Legendary Commander", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: {
        ...defaultInput.feats,
        epicLeadership: true,
        legendaryCommander: true,
      },
    });
    assert.equal(result.tableFollowers?.level1, 8);
    assert.equal(result.followers?.level1, 80);
    assert.equal(result.followersMultiplier, 10);
    assert.equal(result.tableCohortLevel, 8);
  });

  it("stacks Extra Followers and Legendary Commander for ×20 followers", () => {
    const result = calculateLeadership({
      ...defaultInput,
      feats: {
        ...defaultInput.feats,
        extraFollowers: true,
        epicLeadership: true,
        legendaryCommander: true,
      },
    });
    assert.equal(result.tableFollowers?.level1, 8);
    assert.equal(result.followers?.level1, 160);
    assert.equal(result.followersMultiplier, 20);
  });

  it("accumulates cohort death penalties", () => {
    const result = calculateLeadership({
      ...defaultInput,
      cohortModifiers: {
        ...defaultInput.cohortModifiers,
        cohortDeaths: 2,
      },
    });
    assert.equal(result.cohortScore, 8);
    assert.equal(result.tableCohortLevel, 5);
  });
});

describe("convertAbilityInputValue", () => {
  it("converts modifier 3 to score 16 when switching to score mode", () => {
    assert.equal(convertAbilityInputValue(3, "modifier", "score"), 16);
  });

  it("converts score 16 to modifier 3 when switching to modifier mode", () => {
    assert.equal(convertAbilityInputValue(16, "score", "modifier"), 3);
  });
});
