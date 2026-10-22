import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  RollExpressionError,
  averageExpression,
  coinUnitToCp,
  rollExpression,
} from "./roll-expression";

describe("rollExpression", () => {
  it("rolls 1d6 cp with seeded rng", () => {
    const rng = createSeededRng(42);
    const result = rollExpression("1d6 cp", rng);
    assert.equal(result.unit, "cp");
    assert.ok(result.count >= 1 && result.count <= 6);
    assert.equal(result.gp, result.count / 100);
  });

  it("parses multiplier and unicode times", () => {
    const rng = createSeededRng(1);
    const ascii = rollExpression("2d8 x 10 gp", rng);
    const unicode = rollExpression("2d8 × 10 gp", createSeededRng(1));
    const star = rollExpression("2d8 * 10 gp", createSeededRng(1));
    assert.equal(ascii.unit, "gp");
    assert.equal(ascii.gp, unicode.gp);
    assert.equal(ascii.gp, star.gp);
  });

  it("supports modifiers", () => {
    const rng = createSeededRng(5);
    const result = rollExpression("1d4+1", rng);
    assert.ok(result.count >= 2 && result.count <= 5);
  });

  it("rejects empty expressions", () => {
    assert.throws(() => rollExpression("", createSeededRng(1)), RollExpressionError);
    assert.throws(() => rollExpression("not dice", createSeededRng(1)), RollExpressionError);
  });
});

describe("averageExpression", () => {
  it("returns mean gp for coin expressions", () => {
    const avg = averageExpression("1d6 × 1,000 cp");
    assert.equal(avg, 35);
  });

  it("averages a starred multiplier the same as x", () => {
    assert.equal(averageExpression("2d100 * 1000"), averageExpression("2d100 x 1000"));
    assert.equal(averageExpression("2d100 * 1000"), 101000);
  });

  it("converts pp correctly", () => {
    assert.equal(coinUnitToCp(1, "pp"), 1000);
    const avg = averageExpression("1d4 × 10 pp");
    assert.equal(avg, 250);
  });
});
