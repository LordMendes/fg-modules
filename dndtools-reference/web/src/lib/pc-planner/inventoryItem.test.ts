import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyKeenThreat,
  createBlankInventoryRow,
  inventoryAttackBonus,
  inventoryDamageBonus,
  inventoryDamageLines,
  matchBuilderWeaponId,
  prepareRowForEdit,
  syncAbilityDamageLines,
} from "./inventoryItem";
import { needsWeaponStatBackfill } from "./weaponAttacks";
import type { InventoryRow } from "./types";

describe("createBlankInventoryRow", () => {
  it("assigns a stable id", () => {
    const row = createBlankInventoryRow();
    assert.equal(typeof row.id, "string");
    assert.ok((row.id ?? "").length > 0);
    assert.equal(row.quantity, 1);
  });
});

describe("inventoryDamageLines", () => {
  it("derives a primary line from cached catalog fields", () => {
    const lines = inventoryDamageLines({
      name: "Longsword",
      quantity: 1,
      weight: 4,
      damageM: "1d8",
      damageS: "1d6",
      damageType: "S",
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].dice, "1d8");
    assert.equal(lines[0].diceS, "1d6");
    assert.equal(lines[0].type, "S");
    assert.equal(lines[0].multiplyOnCrit, true);
  });
});

describe("syncAbilityDamageLines", () => {
  it("adds tagged flaming and burst-crit lines", () => {
    const row: InventoryRow = {
      name: "Greatsword",
      quantity: 1,
      weight: 8,
      kind: "weapon",
      damageM: "2d6",
      damageType: "S",
      weaponAbilities: [{ abilityId: "flaming-burst" }],
    };
    syncAbilityDamageLines(row);
    const types = (row.damageLines ?? []).map((line) => ({
      dice: line.dice,
      type: line.type,
      critOnly: Boolean(line.critOnly),
      from: line.fromAbilityId,
    }));
    assert.ok(types.some((line) => line.dice === "2d6" && line.type === "S"));
    assert.ok(
      types.some(
        (line) =>
          line.dice === "1d6" && line.type === "fire" && line.from === "flaming-burst",
      ),
    );
    assert.ok(
      types.some(
        (line) =>
          line.dice === "1d10" &&
          line.type === "fire" &&
          line.critOnly &&
          line.from === "flaming-burst",
      ),
    );
  });

  it("removes tagged lines when the ability is cleared", () => {
    const row: InventoryRow = {
      name: "Greatsword",
      quantity: 1,
      weight: 8,
      kind: "weapon",
      damageM: "2d6",
      damageType: "S",
      weaponAbilities: [{ abilityId: "flaming" }],
    };
    syncAbilityDamageLines(row);
    row.weaponAbilities = [];
    syncAbilityDamageLines(row);
    assert.equal(
      (row.damageLines ?? []).some((line) => line.fromAbilityId === "flaming"),
      false,
    );
    assert.ok((row.damageLines ?? []).some((line) => line.dice === "2d6"));
  });
});

describe("magic bonuses", () => {
  it("enhancement replaces masterwork on attack and adds damage", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      masterwork: true,
      enhancementBonus: 2,
    };
    assert.equal(inventoryAttackBonus(row), 2);
    assert.equal(inventoryDamageBonus(row), 2);
  });

  it("masterwork-only is +1 attack", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      masterwork: true,
    };
    assert.equal(inventoryAttackBonus(row), 1);
    assert.equal(inventoryDamageBonus(row), 0);
  });
});

describe("prepareRowForEdit", () => {
  it("marks the row customized and skips catalog backfill", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      source: "equipment",
      slug: "longsword",
      damageM: "1d8",
    };
    prepareRowForEdit(row);
    assert.equal(row.customized, true);
    assert.ok(row.id);
    assert.equal(needsWeaponStatBackfill(row), false);
  });
});

describe("matchBuilderWeaponId", () => {
  it("matches greatsword by slug and by enhanced name suffix", () => {
    assert.equal(
      matchBuilderWeaponId({
        name: "Greatsword",
        quantity: 1,
        weight: 8,
        slug: "greatsword",
      }),
      "greatsword",
    );
    assert.equal(
      matchBuilderWeaponId({
        name: "+1 flaming greatsword",
        quantity: 1,
        weight: 8,
      }),
      "greatsword",
    );
  });
});

describe("applyKeenThreat", () => {
  it("doubles 19-20 to 17-20", () => {
    assert.equal(applyKeenThreat(19), 17);
  });
});
