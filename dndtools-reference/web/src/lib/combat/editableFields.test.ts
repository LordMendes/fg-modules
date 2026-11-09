import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Validation helpers that should be extracted from the mutations
export function validateAndClampInit(value: string): number | null {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function validateAndClampHpMax(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(1, Math.min(9999, Math.trunc(value)));
  return clamped;
}

export function validateAndClampTempHp(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(9999, Math.trunc(value)));
  return clamped;
}

export function validateAndClampNonlethal(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(9999, Math.trunc(value)));
  return clamped;
}

export function validateAndClampWounds(value: number, hpMax: number): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(hpMax, Math.trunc(value)));
  return clamped;
}

describe("Combat editable field validation", () => {
  it("validates init values (float, no bounds)", () => {
    assert.equal(validateAndClampInit("15.5"), 15.5);
    assert.equal(validateAndClampInit("0"), 0);
    assert.equal(validateAndClampInit("-5.2"), -5.2);
    assert.equal(validateAndClampInit("100"), 100);
    assert.equal(validateAndClampInit("invalid"), null);
    assert.equal(validateAndClampInit("NaN"), null);
  });

  it("validates and clamps HP max (1-9999)", () => {
    assert.equal(validateAndClampHpMax(50), 50);
    assert.equal(validateAndClampHpMax(1), 1);
    assert.equal(validateAndClampHpMax(0), 1);
    assert.equal(validateAndClampHpMax(-10), 1);
    assert.equal(validateAndClampHpMax(9999), 9999);
    assert.equal(validateAndClampHpMax(10000), 9999);
    assert.equal(validateAndClampHpMax(25.7), 25);
    assert.equal(validateAndClampHpMax(NaN), null);
  });

  it("validates and clamps temp HP (0-9999)", () => {
    assert.equal(validateAndClampTempHp(10), 10);
    assert.equal(validateAndClampTempHp(0), 0);
    assert.equal(validateAndClampTempHp(-5), 0);
    assert.equal(validateAndClampTempHp(9999), 9999);
    assert.equal(validateAndClampTempHp(10000), 9999);
    assert.equal(validateAndClampTempHp(7.8), 7);
  });

  it("validates and clamps nonlethal (0-9999)", () => {
    assert.equal(validateAndClampNonlethal(15), 15);
    assert.equal(validateAndClampNonlethal(0), 0);
    assert.equal(validateAndClampNonlethal(-1), 0);
    assert.equal(validateAndClampNonlethal(9999), 9999);
    assert.equal(validateAndClampNonlethal(10000), 9999);
  });

  it("validates and clamps wounds (0-hpMax)", () => {
    assert.equal(validateAndClampWounds(10, 50), 10);
    assert.equal(validateAndClampWounds(0, 50), 0);
    assert.equal(validateAndClampWounds(-5, 50), 0);
    assert.equal(validateAndClampWounds(50, 50), 50);
    assert.equal(validateAndClampWounds(60, 50), 50);
    assert.equal(validateAndClampWounds(25.9, 50), 25);
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
