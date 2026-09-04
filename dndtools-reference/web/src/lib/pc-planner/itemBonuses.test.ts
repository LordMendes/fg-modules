import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeEquippedBonuses,
  inferItemBonuses,
  isItemWorn,
  skillItemBonus,
  stackArmorBonus,
  stackBonuses,
} from "./itemBonuses";
import type { InventoryRow } from "./types";

function wornItem(partial: Partial<InventoryRow> & { name: string }): InventoryRow {
  return {
    quantity: 1,
    weight: 0,
    kind: "item",
    source: "item",
    equipped: true,
    ...partial,
  };
}

describe("inferItemBonuses", () => {
  it("parses Belt of Giant Strength +4", () => {
    const bonuses = inferItemBonuses("Belt of Giant Strength +4");
    assert.deepEqual(bonuses, [
      { kind: "ability", ability: "str", amount: 4, bonusType: "enhancement" },
    ]);
  });

  it("parses Cloak of Resistance +2 as all saves", () => {
    const bonuses = inferItemBonuses("Cloak of Resistance +2");
    assert.deepEqual(bonuses, [
      { kind: "combat", stat: "saves", amount: 2, bonusType: "resistance" },
    ]);
  });

  it("parses Ring of Protection +1 as deflection", () => {
    const bonuses = inferItemBonuses("Ring of Protection +1");
    assert.deepEqual(bonuses, [
      { kind: "combat", stat: "deflection", amount: 1, bonusType: "deflection" },
    ]);
  });

  it("parses Amulet of Natural Armor +3", () => {
    const bonuses = inferItemBonuses("Amulet of Natural Armor +3");
    assert.deepEqual(bonuses, [
      { kind: "combat", stat: "naturalArmor", amount: 3, bonusType: "natural" },
    ]);
  });

  it("knows Gauntlets of Ogre Power", () => {
    const bonuses = inferItemBonuses("Gauntlets of Ogre Power");
    assert.deepEqual(bonuses, [
      { kind: "ability", ability: "str", amount: 2, bonusType: "enhancement" },
    ]);
  });

  it("defaults Gloves of Dexterity without +N to +2", () => {
    const bonuses = inferItemBonuses("Gloves of Dexterity");
    assert.deepEqual(bonuses, [
      { kind: "ability", ability: "dex", amount: 2, bonusType: "enhancement" },
    ]);
  });

  it("knows Cloak of Elvenkind", () => {
    const bonuses = inferItemBonuses("Cloak of Elvenkind");
    assert.equal(bonuses.length, 1);
    assert.equal(bonuses[0].kind, "skill");
    if (bonuses[0].kind === "skill") {
      assert.equal(bonuses[0].skill, "hide");
      assert.equal(bonuses[0].amount, 5);
    }
  });

  it("returns empty for unknown items", () => {
    assert.deepEqual(inferItemBonuses("Bag of Holding"), []);
  });
});

describe("stackBonuses", () => {
  it("adds every bonus for the same target", () => {
    const stacked = stackBonuses([
      { key: "str", amount: 2, bonusType: "enhancement", label: "Gauntlets" },
      { key: "str", amount: 4, bonusType: "enhancement", label: "Belt" },
    ]);
    assert.equal(stacked.total, 6);
    assert.equal(stacked.sources.length, 2);
    assert.deepEqual(
      stacked.sources.map((s) => s.label).sort(),
      ["Belt", "Gauntlets"],
    );
  });

  it("adds different bonus types", () => {
    const stacked = stackBonuses([
      { key: "str", amount: 2, bonusType: "enhancement", label: "Belt" },
      { key: "str", amount: 2, bonusType: "morale", label: "Potion" },
    ]);
    assert.equal(stacked.total, 4);
    assert.equal(stacked.sources.length, 2);
  });
});

describe("computeEquippedBonuses", () => {
  it("ignores unequipped items", () => {
    const bonuses = computeEquippedBonuses([
      {
        name: "Gauntlets of Ogre Power",
        quantity: 1,
        weight: 4,
        kind: "item",
        source: "item",
        equipped: false,
        statBonuses: inferItemBonuses("Gauntlets of Ogre Power"),
      },
    ]);
    assert.equal(bonuses.abilities.str.total, 0);
  });

  it("applies equipped ability and save bonuses", () => {
    const bonuses = computeEquippedBonuses([
      wornItem({
        name: "Gauntlets of Ogre Power",
        statBonuses: inferItemBonuses("Gauntlets of Ogre Power"),
      }),
      wornItem({
        name: "Cloak of Resistance +2",
        statBonuses: inferItemBonuses("Cloak of Resistance +2"),
      }),
    ]);
    assert.equal(bonuses.abilities.str.total, 2);
    assert.equal(bonuses.combat.fort.total, 2);
    assert.equal(bonuses.combat.ref.total, 2);
    assert.equal(bonuses.combat.will.total, 2);
  });

  it("adds enhancement from two STR items", () => {
    const bonuses = computeEquippedBonuses([
      wornItem({
        name: "Gauntlets of Ogre Power",
        statBonuses: inferItemBonuses("Gauntlets of Ogre Power"),
      }),
      wornItem({
        name: "Belt of Giant Strength +4",
        statBonuses: inferItemBonuses("Belt of Giant Strength +4"),
      }),
    ]);
    assert.equal(bonuses.abilities.str.total, 6);
    assert.equal(bonuses.abilities.str.sources.length, 2);
  });
});

describe("skillItemBonus", () => {
  it("matches skill by name", () => {
    const bonuses = computeEquippedBonuses([
      wornItem({
        name: "Cloak of Elvenkind",
        statBonuses: inferItemBonuses("Cloak of Elvenkind"),
      }),
    ]);
    const stacked = skillItemBonus(bonuses, { name: "Hide", slug: "hide" });
    assert.equal(stacked.total, 5);
  });
});

describe("stackArmorBonus", () => {
  it("takes the higher armor bonus", () => {
    assert.equal(stackArmorBonus(5, 3), 5);
    assert.equal(stackArmorBonus(2, 4), 4);
  });
});

describe("isItemWorn", () => {
  it("treats equipped non-weapons as worn", () => {
    assert.equal(
      isItemWorn({ name: "x", quantity: 1, weight: 0, kind: "item", equipped: true }),
      true,
    );
    assert.equal(
      isItemWorn({ name: "x", quantity: 1, weight: 0, kind: "item", equipped: false }),
      false,
    );
  });

  it("treats weapons with a hand as worn", () => {
    assert.equal(
      isItemWorn({
        name: "Sword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        weaponHand: "main",
      }),
      true,
    );
  });
});
