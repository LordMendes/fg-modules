import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySpellItemKindDefaults,
  clampItemCharges,
  computeItemSpellActions,
  isScrollKind,
  isWandKind,
  itemSpellDisplayLabel,
  itemSpellSaveDcMod,
  minItemCasterLevel,
  restoreItemCharge,
  spendItemCharge,
  spellItemPriceGp,
  suggestedSpellItemName,
} from "./itemSpells";
import { canEquipAsWornItem } from "./itemBonuses";
import { createBlankInventoryRow } from "./inventoryItem";
import { createDefaultPcPlanState } from "./defaultState";
import type { InventoryRow } from "./types";

describe("minItemCasterLevel", () => {
  it("uses CL 1 for cantrips", () => {
    assert.equal(minItemCasterLevel(0), 1);
  });

  it("uses spellLevel * 2 - 1 for leveled spells", () => {
    assert.equal(minItemCasterLevel(1), 1);
    assert.equal(minItemCasterLevel(3), 5);
    assert.equal(minItemCasterLevel(9), 17);
  });
});

describe("itemSpellSaveDcMod", () => {
  it("uses floor(spellLevel / 2)", () => {
    assert.equal(itemSpellSaveDcMod(0), 0);
    assert.equal(itemSpellSaveDcMod(1), 0);
    assert.equal(itemSpellSaveDcMod(3), 1);
    assert.equal(itemSpellSaveDcMod(5), 2);
  });
});

describe("applySpellItemKindDefaults", () => {
  it("defaults a wand to 50 charges", () => {
    const row = createBlankInventoryRow();
    applySpellItemKindDefaults(row, "wand");
    assert.equal(isWandKind(row.kind), true);
    assert.equal(row.itemType, "Wand");
    assert.equal(row.chargesMax, 50);
    assert.equal(row.chargesCurrent, 50);
  });

  it("defaults a scroll to 1 charge", () => {
    const row = createBlankInventoryRow();
    applySpellItemKindDefaults(row, "scroll");
    assert.equal(isScrollKind(row.kind), true);
    assert.equal(row.itemType, "Scroll");
    assert.equal(row.chargesMax, 1);
    assert.equal(row.chargesCurrent, 1);
  });

  it("does not wipe an existing charge pool", () => {
    const row = createBlankInventoryRow();
    row.chargesMax = 12;
    row.chargesCurrent = 7;
    applySpellItemKindDefaults(row, "wand");
    assert.equal(row.chargesMax, 12);
    assert.equal(row.chargesCurrent, 7);
  });
});

describe("suggestedSpellItemName", () => {
  it("formats wand and scroll names", () => {
    assert.equal(suggestedSpellItemName("wand", "Fireball"), "Wand of Fireball");
    assert.equal(suggestedSpellItemName("scroll", "Cure Light Wounds"), "Scroll of Cure Light Wounds");
  });
});

describe("clampItemCharges / spend / restore", () => {
  it("clamps current within 0..max", () => {
    const row: InventoryRow = {
      name: "Wand",
      quantity: 1,
      weight: 0,
      chargesMax: 50,
      chargesCurrent: 99,
    };
    clampItemCharges(row);
    assert.equal(row.chargesCurrent, 50);
    row.chargesCurrent = -3;
    clampItemCharges(row);
    assert.equal(row.chargesCurrent, 0);
  });

  it("spends and restores charges", () => {
    const row: InventoryRow = {
      name: "Wand",
      quantity: 1,
      weight: 0,
      chargesMax: 5,
      chargesCurrent: 5,
    };
    assert.equal(spendItemCharge(row), true);
    assert.equal(row.chargesCurrent, 4);
    assert.equal(restoreItemCharge(row), true);
    assert.equal(row.chargesCurrent, 5);
    assert.equal(restoreItemCharge(row), false);
    row.chargesCurrent = 0;
    assert.equal(spendItemCharge(row), false);
  });
});

describe("spellItemPriceGp", () => {
  it("prices a wand of fireball at CL 5", () => {
    const row: InventoryRow = {
      name: "Wand of Fireball",
      quantity: 1,
      weight: 0,
      kind: "wand",
      itemCasterLevel: 5,
      spellEffects: [{ slug: "fireball", name: "Fireball", spellLevel: 3 }],
    };
    assert.equal(spellItemPriceGp(row), 3 * 5 * 750);
  });

  it("prices a scroll with half-level for cantrips", () => {
    const row: InventoryRow = {
      name: "Scroll of Light",
      quantity: 1,
      weight: 0,
      kind: "scroll",
      itemCasterLevel: 1,
      spellEffects: [{ slug: "light", name: "Light", spellLevel: 0 }],
    };
    assert.equal(spellItemPriceGp(row), Math.round(0.5 * 1 * 25));
  });
});

describe("canEquipAsWornItem", () => {
  it("allows wand and scroll equip toggles", () => {
    assert.equal(
      canEquipAsWornItem({
        name: "Wand",
        quantity: 1,
        weight: 0,
        kind: "wand",
      }),
      true,
    );
    assert.equal(
      canEquipAsWornItem({
        name: "Scroll",
        quantity: 1,
        weight: 0,
        kind: "scroll",
      }),
      true,
    );
  });
});

describe("computeItemSpellActions", () => {
  it("omits unequipped items and includes equipped wand spells", () => {
    const state = createDefaultPcPlanState();
    state.inventory = [
      {
        id: "unequipped",
        name: "Wand of Magic Missile",
        quantity: 1,
        weight: 0,
        kind: "wand",
        equipped: false,
        chargesMax: 50,
        chargesCurrent: 50,
        itemCasterLevel: 1,
        spellEffects: [
          { slug: "magic-missile", name: "Magic Missile", spellLevel: 1 },
        ],
      },
      {
        id: "equipped",
        name: "Wand of Fireball",
        quantity: 1,
        weight: 0,
        kind: "wand",
        equipped: true,
        chargesMax: 50,
        chargesCurrent: 12,
        itemCasterLevel: 5,
        spellEffects: [
          { slug: "fireball", name: "Fireball", spellLevel: 3 },
        ],
      },
    ];
    const actions = computeItemSpellActions(state);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].slug, "fireball");
    assert.equal(actions[0].casterLevel, 5);
    assert.equal(actions[0].chargesCurrent, 12);
    assert.equal(actions[0].chargesMax, 50);
  });
});

describe("itemSpellDisplayLabel", () => {
  it("avoids duplicating the spell when already in the item name", () => {
    assert.equal(
      itemSpellDisplayLabel("Wand of Fireball", "Fireball"),
      "Wand of Fireball",
    );
    assert.equal(
      itemSpellDisplayLabel("Pearl of Power", "Identify"),
      "Pearl of Power: Identify",
    );
  });
});
