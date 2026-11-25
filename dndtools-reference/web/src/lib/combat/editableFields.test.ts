import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampInt, parseInitiative } from "./validation";

describe("Combat editable field validation", () => {
  it("validates init values (float, no bounds)", () => {
    assert.equal(parseInitiative("15.5"), 15.5);
    assert.equal(parseInitiative("0"), 0);
    assert.equal(parseInitiative("-5.2"), -5.2);
    assert.equal(parseInitiative("100"), 100);
    assert.equal(parseInitiative("invalid"), null);
    assert.equal(parseInitiative("NaN"), null);
  });

  it("validates and clamps HP max (1-9999)", () => {
    assert.equal(clampInt(50, 1, 9999), 50);
    assert.equal(clampInt(1, 1, 9999), 1);
    assert.equal(clampInt(0, 1, 9999), 1);
    assert.equal(clampInt(-10, 1, 9999), 1);
    assert.equal(clampInt(9999, 1, 9999), 9999);
    assert.equal(clampInt(10000, 1, 9999), 9999);
    assert.equal(clampInt(25.7, 1, 9999), 25);
    assert.equal(clampInt(NaN, 1, 9999), null);
  });

  it("validates and clamps temp HP (0-9999)", () => {
    assert.equal(clampInt(10, 0, 9999), 10);
    assert.equal(clampInt(0, 0, 9999), 0);
    assert.equal(clampInt(-5, 0, 9999), 0);
    assert.equal(clampInt(9999, 0, 9999), 9999);
    assert.equal(clampInt(10000, 0, 9999), 9999);
    assert.equal(clampInt(7.8, 0, 9999), 7);
  });

  it("validates and clamps nonlethal (0-9999)", () => {
    assert.equal(clampInt(15, 0, 9999), 15);
    assert.equal(clampInt(0, 0, 9999), 0);
    assert.equal(clampInt(-1, 0, 9999), 0);
    assert.equal(clampInt(9999, 0, 9999), 9999);
    assert.equal(clampInt(10000, 0, 9999), 9999);
  });

  it("validates and clamps wounds (0-hpMax)", () => {
    const hpMax = 50;
    assert.equal(clampInt(10, 0, hpMax), 10);
    assert.equal(clampInt(0, 0, hpMax), 0);
    assert.equal(clampInt(-5, 0, hpMax), 0);
    assert.equal(clampInt(50, 0, hpMax), 50);
    assert.equal(clampInt(60, 0, hpMax), 50);
    assert.equal(clampInt(25.9, 0, hpMax), 25);
  });
});
