import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveConcentrationCheck, requiresConcentrationCheck } from "./concentration";

describe("resolveConcentrationCheck", () => {
  it("passes simple check with no damage", () => {
    const result = resolveConcentrationCheck({
      face: 10,
      casterLevel: 5,
      conModifier: 2,
      damageTaken: 0,
      spellLevel: 3,
    });

    // DC = 10 + 0 + 3 = 13
    // Total = 10 + 5 + 2 = 17
    assert.equal(result.dc, 13);
    assert.equal(result.total, 17);
    assert.equal(result.success, true);
  });

  it("fails check with high damage", () => {
    const result = resolveConcentrationCheck({
      face: 8,
      casterLevel: 3,
      conModifier: 1,
      damageTaken: 15,
      spellLevel: 2,
    });

    // DC = 10 + 15 + 2 = 27
    // Total = 8 + 3 + 1 = 12
    assert.equal(result.dc, 27);
    assert.equal(result.total, 12);
    assert.equal(result.success, false);
  });

  it("applies misc bonus from Combat Casting", () => {
    const result = resolveConcentrationCheck({
      face: 10,
      casterLevel: 5,
      conModifier: 2,
      damageTaken: 10,
      spellLevel: 3,
      miscBonus: 4,
    });

    // DC = 10 + 10 + 3 = 23
    // Total = 10 + 5 + 2 + 4 = 21
    assert.equal(result.dc, 23);
    assert.equal(result.total, 21);
    assert.equal(result.success, false);
  });

  it("applies Combat Casting feat (+4)", () => {
    const result = resolveConcentrationCheck({
      face: 10,
      casterLevel: 5,
      conModifier: 2,
      damageTaken: 10,
      spellLevel: 3,
      miscBonus: 4,
    });

    // DC = 10 + 10 + 3 = 23
    // Total = 10 + 5 + 2 + 4 = 21
    assert.equal(result.dc, 23);
    assert.equal(result.miscBonus, 4);
    assert.equal(result.total, 21);
    assert.equal(result.success, false);
  });

  it("handles natural 1 (still uses math, no auto-fail in concentration)", () => {
    const result = resolveConcentrationCheck({
      face: 1,
      casterLevel: 10,
      conModifier: 3,
      damageTaken: 5,
      spellLevel: 1,
    });

    // DC = 10 + 5 + 1 = 16
    // Total = 1 + 10 + 3 = 14
    assert.equal(result.total, 14);
    assert.equal(result.success, false);
  });

  it("handles level 0 spell", () => {
    const result = resolveConcentrationCheck({
      face: 15,
      casterLevel: 5,
      conModifier: 2,
      damageTaken: 8,
      spellLevel: 0,
    });

    // DC = 10 + 8 + 0 = 18
    // Total = 15 + 5 + 2 = 22
    assert.equal(result.dc, 18);
    assert.equal(result.success, true);
  });
});

describe("requiresConcentrationCheck", () => {
  it("returns true when casting", () => {
    assert.equal(requiresConcentrationCheck(true, false), true);
  });

  it("returns true when maintaining concentration", () => {
    assert.equal(requiresConcentrationCheck(false, true), true);
  });

  it("returns false when neither", () => {
    assert.equal(requiresConcentrationCheck(false, false), false);
  });

  it("returns true when both", () => {
    assert.equal(requiresConcentrationCheck(true, true), true);
  });
});
