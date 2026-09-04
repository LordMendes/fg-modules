import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeEquippedGear,
  equipInventoryRow,
  equipWeaponHand,
  gearStatsFromEquipmentIndex,
  parseWeightPounds,
  unequipWeapon,
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

  it("reads longsword weapon combat fields", () => {
    const stats = gearStatsFromEquipmentIndex({
      kind: "weapon",
      weight: "4 lb.",
      indexData: {
        damage_m: "1d8",
        damage_s: "1d6",
        critical: "19-20/x2",
        damage_type: "S",
        handed: "one",
      },
    });
    assert.equal(stats.kind, "weapon");
    assert.equal(stats.weight, 4);
    assert.equal(stats.damageM, "1d8");
    assert.equal(stats.damageS, "1d6");
    assert.equal(stats.critical, "19-20/x2");
    assert.equal(stats.damageType, "S");
    assert.equal(stats.handed, "one");
  });

  it("reads ranged weapon fields including range increment", () => {
    const stats = gearStatsFromEquipmentIndex({
      kind: "weapon",
      weight: "3 lb.",
      indexData: {
        damage_m: "1d8",
        damage_s: "1d6",
        critical: "x3",
        damage_type: "P",
        handed: "ranged",
        range_increment: "100 ft.",
      },
    });
    assert.equal(stats.handed, "ranged");
    assert.equal(stats.rangeIncrement, "100 ft.");
    assert.equal(stats.critical, "x3");
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
    assert.equal(gear.armorCategory, "heavy");
  });

  it("adds enhancement to armor AC and improves masterwork ACP", () => {
    const gear = computeEquippedGear(
      [
        {
          name: "+1 banded mail",
          quantity: 1,
          weight: 35,
          kind: "armor",
          equipped: true,
          armorBonus: 6,
          maxDex: 1,
          acp: -6,
          speed30: 20,
          enhancementBonus: 1,
          masterwork: true,
        },
      ],
      30,
    );
    assert.equal(gear.armor, 7);
    assert.equal(gear.acp, -5);
  });

  it("masterwork-only armor improves ACP without changing AC", () => {
    const gear = computeEquippedGear(
      [
        {
          name: "Masterwork banded mail",
          quantity: 1,
          weight: 35,
          kind: "armor",
          equipped: true,
          armorBonus: 6,
          acp: -6,
          masterwork: true,
        },
      ],
      30,
    );
    assert.equal(gear.armor, 6);
    assert.equal(gear.acp, -5);
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

  it("clears off-hand weapon when equipping a shield", () => {
    const inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        handed: "one",
        weaponHand: "main" as const,
        equipped: true,
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        handed: "light",
        weaponHand: "off" as const,
        equipped: true,
      },
      {
        name: "Heavy Steel Shield",
        quantity: 1,
        weight: 15,
        kind: "shield",
        equipped: false,
        armorBonus: 2,
      },
    ];
    equipInventoryRow(inventory, 2);
    assert.equal(inventory[0].weaponHand, "main");
    assert.equal(inventory[1].weaponHand, null);
    assert.equal(inventory[1].equipped, false);
    assert.equal(inventory[2].equipped, true);
  });
});

describe("equipWeaponHand", () => {
  it("assigns main and off exclusivity for one-handed weapons", () => {
    const inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        handed: "one",
      },
      {
        name: "Rapier",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        handed: "one",
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        handed: "light",
      },
    ];
    equipWeaponHand(inventory, 0, "main");
    equipWeaponHand(inventory, 2, "off");
    assert.equal(inventory[0].weaponHand, "main");
    assert.equal(inventory[2].weaponHand, "off");
    equipWeaponHand(inventory, 1, "main");
    assert.equal(inventory[0].weaponHand, null);
    assert.equal(inventory[0].equipped, false);
    assert.equal(inventory[1].weaponHand, "main");
    assert.equal(inventory[2].weaponHand, "off");
  });

  it("greatsword equip clears off-hand and shield", () => {
    const inventory = [
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        handed: "light",
        weaponHand: "off" as const,
        equipped: true,
      },
      {
        name: "Heavy Steel Shield",
        quantity: 1,
        weight: 15,
        kind: "shield",
        equipped: true,
        armorBonus: 2,
      },
      {
        name: "Greatsword",
        quantity: 1,
        weight: 8,
        kind: "weapon",
        handed: "two",
      },
    ];
    equipWeaponHand(inventory, 2, "main");
    assert.equal(inventory[2].weaponHand, "main");
    assert.equal(inventory[2].equipped, true);
    assert.equal(inventory[0].weaponHand, null);
    assert.equal(inventory[0].equipped, false);
    assert.equal(inventory[1].equipped, false);
  });

  it("off-hand equip unequips a shield", () => {
    const inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        handed: "one",
        weaponHand: "main" as const,
        equipped: true,
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        handed: "light",
      },
      {
        name: "Buckler",
        quantity: 1,
        weight: 5,
        kind: "shield",
        equipped: true,
        armorBonus: 1,
      },
    ];
    equipWeaponHand(inventory, 1, "off");
    assert.equal(inventory[1].weaponHand, "off");
    assert.equal(inventory[2].equipped, false);
  });

  it("unequipWeapon clears hand and equipped", () => {
    const inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        handed: "one",
        weaponHand: "main" as const,
        equipped: true,
      },
    ];
    unequipWeapon(inventory, 0);
    assert.equal(inventory[0].weaponHand, null);
    assert.equal(inventory[0].equipped, false);
  });

  it("reports main and off names in computeEquippedGear", () => {
    const gear = computeEquippedGear(
      [
        {
          name: "Longsword",
          quantity: 1,
          weight: 4,
          kind: "weapon",
          weaponHand: "main",
          equipped: true,
        },
        {
          name: "Dagger",
          quantity: 1,
          weight: 1,
          kind: "weapon",
          weaponHand: "off",
          equipped: true,
        },
      ],
      30,
    );
    assert.equal(gear.mainWeaponName, "Longsword");
    assert.equal(gear.offWeaponName, "Dagger");
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

  it("lists equipped wondrous items in wornItemNames", () => {
    const gear = computeEquippedGear(
      [
        {
          name: "Gauntlets of Ogre Power",
          quantity: 1,
          weight: 4,
          kind: "item",
          source: "item",
          equipped: true,
        },
      ],
      30,
    );
    assert.deepEqual(gear.wornItemNames, ["Gauntlets of Ogre Power"]);
  });
});
