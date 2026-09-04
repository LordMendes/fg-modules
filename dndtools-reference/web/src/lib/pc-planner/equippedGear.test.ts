import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeEquippedGear,
  equipInventoryRow,
  gearStatsFromEquipmentIndex,
  parseWeightPounds,
} from "./equippedGear";

describe("parseWeightPounds", () => {
  it("parses lb strings", () => {
    assert.equal(parseWeightPounds("35 lb."), 35);
    assert.equal(parseWeightPounds("6 lb."), 6);
  });
});

describe("gearStatsFromEquipmentIndex", () => {
  it("reads banded mail combat fields", () => {
    const stats = gearStatsFromEquipmentIndex({
      kind: "armor",
      weight: "35 lb.",
      indexData: {
        ac_bonus: "6",
        max_dex: "1",
        armor_check_penalty: "-6",
        speed_30: "20",
        speed_20: "15",
      },
    });
    assert.equal(stats.armorBonus, 6);
    assert.equal(stats.maxDex, 1);
    assert.equal(stats.acp, -6);
    assert.equal(stats.speed30, 20);
    assert.equal(stats.weight, 35);
  });
});

describe("computeEquippedGear", () => {
  it("applies equipped armor and shield", () => {
    const gear = computeEquippedGear(
      [
        {
          name: "Banded Mail",
          quantity: 1,
          weight: 35,
          kind: "armor",
          equipped: true,
          armorBonus: 6,
          maxDex: 1,
          acp: -6,
          speed30: 20,
        },
        {
          name: "Heavy Steel Shield",
          quantity: 1,
          weight: 15,
          kind: "shield",
          equipped: true,
          armorBonus: 2,
          acp: -2,
        },
      ],
      30,
    );
    assert.equal(gear.armor, 6);
    assert.equal(gear.shield, 2);
    assert.equal(gear.maxDex, 1);
    assert.equal(gear.acp, -8);
    assert.equal(gear.speedArmorDelta, -10);
  });
});

describe("equipInventoryRow", () => {
  it("unequips other armor when equipping a new suit", () => {
    const inventory = [
      {
        name: "Leather",
        quantity: 1,
        weight: 15,
        kind: "armor",
        equipped: true,
        armorBonus: 2,
      },
      {
        name: "Banded Mail",
        quantity: 1,
        weight: 35,
        kind: "armor",
        equipped: false,
        armorBonus: 6,
      },
    ];
    equipInventoryRow(inventory, 1);
    assert.equal(inventory[0].equipped, false);
    assert.equal(inventory[1].equipped, true);
  });
});

describe("computeCombatStats with equipped gear", () => {
  it("uses equipped armor for AC, max Dex, and speed", () => {
    const state = createDefaultPcPlanState();
    state.abilities.dex = 16;
    state.combat.armor = 0;
    state.combat.shield = 0;
    state.inventory = [
      {
        name: "Banded Mail",
        quantity: 1,
        weight: 35,
        kind: "armor",
        equipped: true,
        armorBonus: 6,
        maxDex: 1,
        acp: -6,
        speed30: 20,
      },
    ];
    const stats = computeCombatStats(state);
    assert.equal(stats.ac.parts.armor, 6);
    assert.equal(stats.ac.parts.stat, 1);
    assert.equal(stats.speed.parts.armor, -10);
    assert.equal(stats.speed.total, 20);
  });
});
