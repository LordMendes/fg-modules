import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bonusSlotsForLevel,
  buildBaseSlots,
  computeSpellClass,
  splitBaseAndBonus,
} from "./spellSlots";

describe("bonusSlotsForLevel", () => {
  it("returns 0 for level 0", () => {
    assert.equal(bonusSlotsForLevel(20, 0), 0);
  });

  it("returns 0 below threshold", () => {
    assert.equal(bonusSlotsForLevel(11, 1), 0);
  });

  it("returns 1 at threshold for level 1", () => {
    assert.equal(bonusSlotsForLevel(12, 1), 1);
  });

  it("returns 1 for Int 16 at level 2", () => {
    assert.equal(bonusSlotsForLevel(16, 2), 1);
  });
});

describe("wizard spell slots", () => {
  it("level 1 has L0=3 L1=2 with Int 12 bonus", () => {
    const { slots } = buildBaseSlots("Wizard", 1, 12);
    assert.equal(slots[0], 3);
    assert.equal(slots[1], 2);
  });

  it("level 3 Int 16 matches FG: L0=4 L1=3 L2=2", () => {
    const { slots } = buildBaseSlots("Wizard", 3, 16);
    assert.equal(slots[0], 4);
    assert.equal(slots[1], 3);
    assert.equal(slots[2], 2);
  });

  it("wizard skips extra L0 at CL 4 vs cleric", () => {
    const wizard = buildBaseSlots("Wizard", 4, 10);
    const cleric = buildBaseSlots("Cleric", 4, 10);
    assert.equal(wizard.slots[0], 4);
    assert.equal(cleric.slots[0], 5);
  });
});

describe("cleric spell slots", () => {
  it("level 1 has L0=3 L1=1 without bonus", () => {
    const { slots } = buildBaseSlots("Cleric", 1, 10);
    assert.equal(slots[0], 3);
    assert.equal(slots[1], 1);
  });

  it("level 3 Wis 16 gets bonus on L1 and L2", () => {
    const { baseSlots, bonusSlots } = splitBaseAndBonus("Cleric", 3, 16);
    assert.equal(baseSlots[0], 4);
    assert.equal(baseSlots[1], 2);
    assert.equal(baseSlots[2], 1);
    assert.equal(bonusSlots[1], 1);
    assert.equal(bonusSlots[2], 1);
    const { slots } = buildBaseSlots("Cleric", 3, 16);
    assert.equal(slots[1], 3);
    assert.equal(slots[2], 2);
  });
});

describe("computeSpellClass", () => {
  it("uses class casting ability from slug", () => {
    const result = computeSpellClass(
      "wizard",
      "Wizard",
      3,
      { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    );
    assert.equal(result.slots[0], 4);
    assert.equal(result.slots[1], 3);
    assert.equal(result.slots[2], 2);
    assert.equal(result.maxSpellLevel, 2);
    assert.equal(result.mode, "preparation");
    assert.equal(result.dcAbility, "int");
    assert.equal(result.dcModifier, 3);
  });

  it("computes sorcerer slots and spontaneous mode from compendium slug", () => {
    const result = computeSpellClass(
      "sorcerer-98",
      "Battle Sorcerer",
      3,
      { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    );
    assert.equal(result.mode, "spontaneous");
    assert.equal(result.dcAbility, "cha");
    assert.equal(result.slots[0], 6);
    assert.equal(result.slots[1], 6);
  });
});
