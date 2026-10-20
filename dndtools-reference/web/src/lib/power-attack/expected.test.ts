import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_POWER_ATTACK_INPUT,
  expectedDamage,
  formatPowerAttackDamage,
  type PowerAttackInput,
} from "./expected";

function base(overrides: Partial<PowerAttackInput>): PowerAttackInput {
  return { ...DEFAULT_POWER_ATTACK_INPUT, ...overrides };
}

describe("power-attack expectedDamage", () => {
  it("prefers no penalty when hits are already easy", () => {
    const input = base({
      bab: 1,
      attackMod: 0,
      action: "single",
      weaponAverage: 10,
      extraAverage: 0,
      threatMin: 20,
      critMultiplier: 2,
      targetAc: 12,
      twoHanded: false,
    });
    const atZero = formatPowerAttackDamage(expectedDamage(input, 0));
    const atOne = formatPowerAttackDamage(expectedDamage(input, 1));
    assert.ok(Number(atZero) > Number(atOne));
  });

  it("doubles Power Attack damage bonus for two-handed weapons", () => {
    const shared = base({
      bab: 6,
      attackMod: 10,
      action: "single",
      weaponAverage: 8,
      extraAverage: 0,
      threatMin: 20,
      critMultiplier: 2,
      targetAc: 5,
      twoHanded: false,
    });
    const oneHanded = expectedDamage(shared, 2);
    const twoHanded = expectedDamage({ ...shared, twoHanded: true }, 2);
    assert.ok(twoHanded > oneHanded);
    assert.ok(twoHanded - oneHanded > 1.5);
  });

  it("treats immune targets as crit multiplier 1 regardless of weapon multiplier", () => {
    const shared = base({
      bab: 4,
      attackMod: 5,
      action: "single",
      weaponAverage: 12,
      extraAverage: 2,
      threatMin: 15,
      targetAc: 12,
    });
    const immuneX4 = expectedDamage(
      { ...shared, critMultiplier: 4, immuneToCrits: true },
      1,
    );
    const multOne = expectedDamage(
      { ...shared, critMultiplier: 1, immuneToCrits: false },
      1,
    );
    assert.equal(
      formatPowerAttackDamage(immuneX4),
      formatPowerAttackDamage(multOne),
    );
  });

  it("accounts for natural 1 missing", () => {
    const input = base({
      bab: 10,
      attackMod: 20,
      action: "single",
      weaponAverage: 10,
      extraAverage: 0,
      threatMin: 20,
      critMultiplier: 2,
      targetAc: 5,
      twoHanded: false,
    });
    const damageBonus = 0;
    const atD = input.weaponAverage + damageBonus + input.extraAverage;
    const total = expectedDamage(input, 0);
    assert.ok(total < atD);
  });
});
