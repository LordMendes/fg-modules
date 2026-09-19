import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectModifiers, sumModifiers } from "./modifiers";

describe("modifiers stacking (90-testing.md)", () => {
  it("takes the highest morale bonus of the same type", () => {
    const parts = collectModifiers([
      { label: "Bless (+2 morale)", value: 2, bonusType: "morale" },
      { label: "Aid (+1 morale)", value: 1, bonusType: "morale" },
    ]);
    assert.equal(parts.length, 1);
    assert.equal(parts[0]!.value, 2);
    assert.equal(sumModifiers([
      { label: "Bless (+2 morale)", value: 2, bonusType: "morale" },
      { label: "Aid (+1 morale)", value: 1, bonusType: "morale" },
    ]), 2);
  });

  it("stacks dodge bonuses", () => {
    const parts = collectModifiers([
      { label: "Haste (dodge)", value: 1, bonusType: "dodge" },
      { label: "Dodge feat (dodge)", value: 1, bonusType: "dodge" },
    ]);
    assert.equal(parts.length, 2);
    assert.equal(sumModifiers(parts.map((p) => ({ ...p }))), 2);
  });

  it("stacks penalties regardless of type", () => {
    const parts = collectModifiers([
      { label: "Power Attack", value: -2 },
      { label: "Shaken (morale)", value: -2, bonusType: "morale" },
    ]);
    assert.equal(parts.length, 2);
    assert.equal(sumModifiers([
      { label: "Power Attack", value: -2 },
      { label: "Shaken (morale)", value: -2, bonusType: "morale" },
    ]), -4);
  });

  it("stacks untyped bonuses", () => {
    assert.equal(
      sumModifiers([
        { label: "Haste", value: 1 },
        { label: "Divine favor", value: 1 },
      ]),
      2,
    );
  });

  it("stacks circumstance bonuses", () => {
    assert.equal(
      sumModifiers([
        { label: "Higher ground (circumstance)", value: 1, bonusType: "circumstance" },
        { label: "Flanking (circumstance)", value: 2, bonusType: "circumstance" },
      ]),
      3,
    );
  });

  it("takes highest deflection bonus", () => {
    assert.equal(
      sumModifiers([
        { label: "Ring of protection +1", value: 1, bonusType: "deflection" },
        { label: "Shield of faith +2", value: 2, bonusType: "deflection" },
      ]),
      2,
    );
  });
});
