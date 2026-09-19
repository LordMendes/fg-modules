import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeDuration,
  shouldTick,
  tick,
  type TimedEffect,
} from "./duration";

describe("duration (90-testing.md)", () => {
  it("converts 1 minute to 10 rounds on creation", () => {
    const normalized = normalizeDuration({ duration: 1, durationUnit: "minute" });
    assert.equal(normalized.duration, 10);
    assert.equal(normalized.durationUnit, "round");
  });

  it("converts hours and days to rounds", () => {
    assert.equal(normalizeDuration({ duration: 1, durationUnit: "hour" }).duration, 600);
    assert.equal(normalizeDuration({ duration: 1, durationUnit: "day" }).duration, 14400);
  });

  it("preserves null duration as until removed", () => {
    const normalized = normalizeDuration({ duration: null, durationUnit: "minute" });
    assert.equal(normalized.duration, null);
  });

  it("ticks at source init on startOfTurn and expires at 0", () => {
    const effect: TimedEffect = {
      duration: 1,
      durationUnit: "round",
      tickInit: 18,
      expiry: "startOfTurn",
    };

    assert.equal(shouldTick(effect, 18, "startOfTurn"), true);
    assert.equal(shouldTick(effect, 18, "endOfTurn"), false);
    assert.equal(shouldTick(effect, 12, "startOfTurn"), false);

    const { effect: afterTick, expired } = tick(effect);
    assert.equal(expired, true);
    assert.equal(afterTick.duration, 0);
  });

  it("endOfTurn effect ticks after the actor turn, not at startOfTurn", () => {
    const effect: TimedEffect = {
      duration: 3,
      durationUnit: "round",
      tickInit: 15,
      expiry: "endOfTurn",
    };

    assert.equal(shouldTick(effect, 15, "startOfTurn"), false);
    assert.equal(shouldTick(effect, 15, "endOfTurn"), true);
    assert.equal(shouldTick(effect, 10, "endOfTurn"), false);

    const { effect: afterTick, expired } = tick(effect);
    assert.equal(expired, false);
    assert.equal(afterTick.duration, 2);
  });

  it("does not tick effects with null duration", () => {
    const effect: TimedEffect = {
      duration: null,
      durationUnit: "round",
      tickInit: 18,
      expiry: "startOfTurn",
    };
    assert.equal(shouldTick(effect, 18, "startOfTurn"), false);
    assert.equal(tick(effect).expired, false);
  });

  it("decrements through multiple ticks until expired", () => {
    let effect: TimedEffect = {
      duration: 3,
      durationUnit: "round",
      tickInit: 20,
      expiry: "startOfTurn",
    };

    for (let i = 0; i < 2; i += 1) {
      const result = tick(effect);
      assert.equal(result.expired, false);
      effect = result.effect;
    }

    const final = tick(effect);
    assert.equal(final.expired, true);
    assert.equal(final.effect.duration, 0);
  });
});
