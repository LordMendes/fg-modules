import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeWeaponAttackRows,
  formatCritSuffix,
  meleeDamageAbilityBonus,
  parseDamageDice,
} from "./weaponAttacks";

describe("parseDamageDice", () => {
  it("parses NdS and bare dS", () => {
    assert.deepEqual(parseDamageDice("1d8"), [{ qty: 1, sides: 8 }]);
    assert.deepEqual(parseDamageDice("2d6"), [{ qty: 2, sides: 6 }]);
    assert.deepEqual(parseDamageDice("d10"), [{ qty: 1, sides: 10 }]);
  });

  it("returns empty for garbage", () => {
    assert.deepEqual(parseDamageDice(""), []);
    assert.deepEqual(parseDamageDice("special"), []);
  });
});

describe("formatCritSuffix", () => {
  it("omits default x2", () => {
    assert.equal(formatCritSuffix("x2"), "");
    assert.equal(formatCritSuffix("20/x2"), "");
  });

  it("keeps threat and non-default multipliers", () => {
    assert.equal(formatCritSuffix("19-20/x2"), "/19-20");
    assert.equal(formatCritSuffix("x3"), "/×3");
    assert.equal(formatCritSuffix("18-20/x2"), "/18-20");
  });
});

describe("meleeDamageAbilityBonus", () => {
  it("applies 1.5 Str for two-handed when Str is positive", () => {
    assert.equal(meleeDamageAbilityBonus(3, true), 4);
    assert.equal(meleeDamageAbilityBonus(2, true), 3);
    assert.equal(meleeDamageAbilityBonus(3, false), 3);
  });

  it("applies full Str penalty when negative", () => {
    assert.equal(meleeDamageAbilityBonus(-2, true), -2);
  });
});

describe("computeWeaponAttackRows", () => {
  it("builds fighter longsword attack and damage", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16;
    state.abilities.dex = 12;
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        damageS: "1d6",
        critical: "19-20/x2",
        damageType: "S",
        handed: "one",
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].mode, "melee");
    assert.equal(rows[0].attackBonus, 9); // BAB 6 + Str 3
    assert.equal(rows[0].attackDisplay, "+9/+4");
    assert.equal(rows[0].damageModifier, 3);
    assert.equal(rows[0].damageDisplay, "1d8+3/19-20");
    assert.match(rows[0].summary, /Longsword \+9\/\+4 melee \(1d8\+3\/19-20\)/);
  });

  it("uses damage_s for small PCs", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 14;
    state.combat.sizeMod = 1;
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        damageS: "1d6",
        critical: "19-20/x2",
        handed: "one",
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].damageDisplay, "1d6+2/19-20");
    assert.equal(rows[0].attackBonus, 4); // BAB 1 + Str 2 + size 1
  });

  it("applies 1.5 Str to two-handed greatsword", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 16;
    state.inventory = [
      {
        name: "Greatsword",
        quantity: 1,
        weight: 8,
        kind: "weapon",
        damageM: "2d6",
        damageS: "1d10",
        critical: "19-20/x2",
        handed: "two",
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].damageModifier, 4);
    assert.equal(rows[0].damageDisplay, "2d6+4/19-20");
  });

  it("uses Dex and no Str for ranged longbow", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 16;
    state.abilities.dex = 14;
    state.inventory = [
      {
        name: "Longbow",
        quantity: 1,
        weight: 3,
        kind: "weapon",
        damageM: "1d8",
        damageS: "1d6",
        critical: "x3",
        handed: "ranged",
        rangeIncrement: "100 ft.",
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].mode, "ranged");
    assert.equal(rows[0].attackBonus, 3); // BAB 1 + Dex 2
    assert.equal(rows[0].damageModifier, 0);
    assert.equal(rows[0].damageDisplay, "1d8/×3");
  });

  it("Weapon Finesse uses Dex to hit on light melee, Str for damage", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "rogue", className: "Rogue", level: 1 },
    ];
    state.abilities.str = 10;
    state.abilities.dex = 16;
    state.feats = [{ slug: "weapon-finesse", name: "Weapon Finesse" }];
    state.inventory = [
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        damageM: "1d6",
        damageS: "1d4",
        critical: "19-20/x2",
        handed: "light",
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].mode, "melee");
    assert.equal(rows[0].attackBonus, 3); // BAB 0 + Dex 3
    assert.equal(rows[0].damageModifier, 0); // Str 0
    assert.equal(rows[0].damageDisplay, "1d6/19-20");
  });

  it("skips non-weapon inventory and weapons without dice", () => {
    const state = createDefaultPcPlanState();
    state.inventory = [
      {
        name: "Banded Mail",
        quantity: 1,
        weight: 35,
        kind: "armor",
        armorBonus: 6,
      },
      {
        name: "Mystery Blade",
        quantity: 1,
        weight: 4,
        kind: "weapon",
      },
    ];
    const stats = computeCombatStats(state);
    assert.equal(computeWeaponAttackRows(state, stats).length, 0);
  });
});
