import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  applyCriticalDamage,
  computeWeaponAttackRows,
  formatCritSuffix,
  isCriticalThreat,
  meleeDamageAbilityBonus,
  parseDamageDice,
  parseWeaponCritical,
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

describe("parseWeaponCritical", () => {
  it("defaults to 20/x2", () => {
    assert.deepEqual(parseWeaponCritical(null), { threatMin: 20, multiplier: 2 });
    assert.deepEqual(parseWeaponCritical("x2"), { threatMin: 20, multiplier: 2 });
  });

  it("parses threat ranges and multipliers", () => {
    assert.deepEqual(parseWeaponCritical("19-20/x2"), {
      threatMin: 19,
      multiplier: 2,
    });
    assert.deepEqual(parseWeaponCritical("x3"), { threatMin: 20, multiplier: 3 });
    assert.deepEqual(parseWeaponCritical("18-20/x2"), {
      threatMin: 18,
      multiplier: 2,
    });
  });
});

describe("isCriticalThreat", () => {
  it("uses inclusive threat floor", () => {
    assert.equal(isCriticalThreat(19, 19), true);
    assert.equal(isCriticalThreat(18, 19), false);
    assert.equal(isCriticalThreat(20, 20), true);
  });
});

describe("applyCriticalDamage", () => {
  it("multiplies dice qty and modifier", () => {
    assert.deepEqual(
      applyCriticalDamage([{ qty: 2, sides: 6 }], 6, 2),
      { dice: [{ qty: 4, sides: 6 }], modifier: 12 },
    );
    assert.deepEqual(
      applyCriticalDamage([{ qty: 1, sides: 8 }], 3, 3),
      { dice: [{ qty: 3, sides: 8 }], modifier: 9 },
    );
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
    assert.deepEqual(rows[0].attackBonuses, [9, 4]);
    assert.equal(rows[0].damageModifier, 3);
    assert.equal(rows[0].damageDisplay, "1d8+3/19-20");
    assert.equal(rows[0].threatMin, 19);
    assert.equal(rows[0].critMultiplier, 2);
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
