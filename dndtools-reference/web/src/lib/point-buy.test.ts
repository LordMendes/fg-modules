import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BASELINE_SCORE,
  abilityModifier,
  clampScoreToBudget,
  clampScoreToRange,
  defaultPurchasedScore,
  formatModifier,
  normalizeRange,
  scoreCost,
  totalSpent,
} from "./point-buy";

describe("point-buy scoreCost", () => {
  it("matches the official 8–18 table", () => {
    assert.equal(scoreCost(8), 0);
    assert.equal(scoreCost(9), 1);
    assert.equal(scoreCost(10), 2);
    assert.equal(scoreCost(11), 3);
    assert.equal(scoreCost(12), 4);
    assert.equal(scoreCost(13), 5);
    assert.equal(scoreCost(14), 6);
    assert.equal(scoreCost(15), 8);
    assert.equal(scoreCost(16), 10);
    assert.equal(scoreCost(17), 13);
    assert.equal(scoreCost(18), 16);
  });

  it("refunds points for scores below 8", () => {
    assert.equal(scoreCost(7), -1);
    assert.equal(scoreCost(6), -2);
    assert.equal(scoreCost(5), -4);
    assert.equal(scoreCost(4), -6);
    assert.equal(scoreCost(3), -8);
  });

  it("applies the house curve above 18", () => {
    // 18→19 +4, 19→20 +4
    assert.equal(scoreCost(19), 20);
    assert.equal(scoreCost(20), 24);
    // 20→21 +5, 21→22 +5
    assert.equal(scoreCost(21), 29);
    assert.equal(scoreCost(22), 34);
  });
});

describe("point-buy modifiers and spent", () => {
  it("uses floor((score − 10) / 2)", () => {
    assert.equal(abilityModifier(10), 0);
    assert.equal(abilityModifier(11), 0);
    assert.equal(abilityModifier(8), -1);
    assert.equal(abilityModifier(18), 4);
    assert.equal(abilityModifier(3), -4);
    assert.equal(formatModifier(0), "+0");
    assert.equal(formatModifier(-2), "-2");
  });

  it("sums costs across abilities", () => {
    assert.equal(totalSpent([8, 8, 8, 8, 8, 8]), 0);
    assert.equal(totalSpent([18, 8, 8, 8, 8, 8]), 16);
    assert.equal(totalSpent([3, 8, 8, 8, 8, 8]), -8);
  });
});

describe("point-buy range helpers", () => {
  it("normalizes inverted and out-of-bounds min/max", () => {
    assert.deepEqual(normalizeRange({ min: 10, max: 8 }), { min: 10, max: 10 });
    assert.deepEqual(normalizeRange({ min: 1, max: 50 }), { min: 3, max: 45 });
  });

  it("clamps scores into the live range", () => {
    assert.equal(clampScoreToRange(5, { min: 8, max: 18 }), 8);
    assert.equal(clampScoreToRange(20, { min: 8, max: 18 }), 18);
    assert.equal(defaultPurchasedScore({ min: 10, max: 18 }), 10);
    assert.equal(defaultPurchasedScore({ min: 3, max: 45 }), BASELINE_SCORE);
  });

  it("respects budget and live min/max when clamping a score", () => {
    const scores = [8, 8, 8, 8, 8, 8];
    assert.equal(
      clampScoreToBudget(0, 18, scores, 16, { min: 8, max: 18 }),
      18,
    );
    assert.equal(
      clampScoreToBudget(0, 18, scores, 10, { min: 8, max: 18 }),
      16,
    );
    assert.equal(
      clampScoreToBudget(0, 3, scores, 28, { min: 8, max: 18 }),
      8,
    );
  });
});
