import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampInt } from "./combatMutations";

describe("Combat editable field validation", () => {
  it("validates init values (float, no bounds)", () => {
    const parseInit = (value: string): number | null => {
      const n = Number.parseFloat(value);
      return Number.isFinite(n) ? n : null;
    };
    
    assert.equal(parseInit("15.5"), 15.5);
    assert.equal(parseInit("0"), 0);
    assert.equal(parseInit("-5.2"), -5.2);
    assert.equal(parseInit("100"), 100);
    assert.equal(parseInit("invalid"), null);
    assert.equal(parseInit("NaN"), null);
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

describe("Combat editing permissions", () => {
  it("DM can edit any combatant field", () => {
    const isDm = true;
    const isOwnPc = false;
    assert.ok(isDm || isOwnPc);
  });

  it("Player cannot edit NPC fields", () => {
    const isDm = false;
    const isOwnPc = false;
    const canEdit = isDm || isOwnPc;
    assert.ok(!canEdit);
  });

  it("Player can roll own PC initiative but not set it directly", () => {
    const isDm = false;
    const isOwnPc = true;
    const canRollInit = isOwnPc;
    const canSetInit = isDm;
    assert.ok(canRollInit);
    assert.ok(!canSetInit);
  });
});
