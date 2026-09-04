import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  applyCriticalDamage,
  applyKeenThreat,
  computeWeaponAttackRows,
  formatCritSuffix,
  formatWeaponDamageText,
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
        weaponHand: "main",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].mode, "melee");
    assert.equal(rows[0].attackBonus, 9); // BAB 6 + Str 3
    assert.equal(rows[0].standardDisplay, "+9");
    assert.deepEqual(rows[0].standardBonuses, [9]);
    assert.equal(rows[0].fullAttackDisplay, "+9/+4");
    assert.deepEqual(rows[0].fullAttackBonuses, [9, 4]);
    assert.equal(rows[0].showFullAttack, true);
    assert.equal(rows[0].twfHand, null);
    assert.equal(rows[0].attackDisplay, "+9/+4");
    assert.deepEqual(rows[0].attackBonuses, [9, 4]);
    assert.equal(rows[0].damageModifier, 3);
    assert.equal(rows[0].fullAttackDamageModifier, 3);
    assert.equal(rows[0].damageDisplay, "1d8+3/19-20");
    assert.equal(rows[0].threatMin, 19);
    assert.equal(rows[0].critMultiplier, 2);
    assert.match(rows[0].summary, /Longsword \+9\/\+4 melee \(1d8\+3\/19-20\)/);
  });

  it("hides full attack when only a single strike is available", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 14;
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
        weaponHand: "main",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].standardDisplay, "+3");
    assert.deepEqual(rows[0].standardBonuses, [3]);
    assert.equal(rows[0].fullAttackDisplay, "+3");
    assert.equal(rows[0].showFullAttack, false);
  });

  it("omits unequipped weapons from Actions rows", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16;
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
      },
    ];
    const stats = computeCombatStats(state);
    assert.equal(computeWeaponAttackRows(state, stats).length, 0);
  });

  it("applies two-weapon fighting penalties without the feat", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 16; // +3
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        weaponHand: "main",
        equipped: true,
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        damageM: "1d6",
        critical: "19-20/x2",
        handed: "light",
        weaponHand: "off",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows.length, 2);
    // BAB 1 + Str 3 = 4; no feat + light off-hand: -4 / -8
    // Full Attack hidden: only one roll each (no iteratives / Improved)
    assert.equal(rows[0].twfHand, "main");
    assert.equal(rows[0].standardDisplay, "+4");
    assert.equal(rows[0].fullAttackDisplay, "+0");
    assert.deepEqual(rows[0].fullAttackBonuses, [0]);
    assert.equal(rows[0].showFullAttack, false);
    assert.equal(rows[0].damageModifier, 3);
    assert.equal(rows[0].fullAttackDamageModifier, 3);

    assert.equal(rows[1].twfHand, "off");
    assert.equal(rows[1].standardDisplay, "+4");
    assert.equal(rows[1].fullAttackDisplay, "-4");
    assert.deepEqual(rows[1].fullAttackBonuses, [-4]);
    assert.equal(rows[1].showFullAttack, false);
    assert.equal(rows[1].damageModifier, 3);
    assert.equal(rows[1].fullAttackDamageModifier, 1); // half Str
  });

  it("uses weaponHand slots for TWF, not inventory order", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16;
    state.feats = [
      { slug: "two-weapon-fighting-2998", name: "Two-Weapon Fighting" },
    ];
    // Short sword listed first but marked off-hand
    state.inventory = [
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        damageM: "1d6",
        critical: "19-20/x2",
        handed: "light",
        weaponHand: "off",
        equipped: true,
      },
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        weaponHand: "main",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].name, "Short Sword");
    assert.equal(rows[0].twfHand, "off");
    assert.equal(rows[1].name, "Longsword");
    assert.equal(rows[1].twfHand, "main");
    assert.equal(rows[1].fullAttackDisplay, "+7/+2");
  });

  it("reduces TWF penalties with Two-Weapon Fighting and light off-hand", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16; // +3
    state.feats = [
      { slug: "two-weapon-fighting-2998", name: "Two-Weapon Fighting" },
    ];
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        weaponHand: "main",
        equipped: true,
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        damageM: "1d6",
        critical: "19-20/x2",
        handed: "light",
        weaponHand: "off",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    // BAB 6 + Str 3 = 9; TWF + light: -2 / -2
    assert.equal(rows[0].twfHand, "main");
    assert.equal(rows[0].standardDisplay, "+9");
    assert.equal(rows[0].fullAttackDisplay, "+7/+2");
    assert.deepEqual(rows[0].fullAttackBonuses, [7, 2]);
    assert.equal(rows[0].showFullAttack, true);

    assert.equal(rows[1].twfHand, "off");
    assert.equal(rows[1].standardDisplay, "+9");
    assert.equal(rows[1].fullAttackDisplay, "+7");
    assert.deepEqual(rows[1].fullAttackBonuses, [7]);
    assert.equal(rows[1].showFullAttack, false); // single off-hand die
  });

  it("adds Improved and Greater off-hand attacks", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 11 },
    ];
    state.abilities.str = 16; // +3
    state.feats = [
      { slug: "two-weapon-fighting-2998", name: "Two-Weapon Fighting" },
      {
        slug: "improved-two-weapon-fighting-1593",
        name: "Improved Two-Weapon Fighting",
      },
      {
        slug: "greater-two-weapon-fighting-1311",
        name: "Greater Two-Weapon Fighting",
      },
    ];
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        weaponHand: "main",
        equipped: true,
      },
      {
        name: "Short Sword",
        quantity: 1,
        weight: 2,
        kind: "weapon",
        damageM: "1d6",
        critical: "19-20/x2",
        handed: "light",
        weaponHand: "off",
        equipped: true,
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    // BAB 11 + Str 3 = 14; TWF + light: -2
    assert.deepEqual(rows[0].fullAttackBonuses, [12, 7, 2]);
    assert.deepEqual(rows[1].fullAttackBonuses, [12, 7, 2]); // 14-2, then -5, -10
    assert.equal(rows[1].showFullAttack, true);
  });

  it("does not pair two-handed or ranged weapons for TWF", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16;
    state.abilities.dex = 14;
    state.feats = [
      { slug: "two-weapon-fighting-2998", name: "Two-Weapon Fighting" },
    ];
    state.inventory = [
      {
        name: "Greatsword",
        quantity: 1,
        weight: 8,
        kind: "weapon",
        damageM: "2d6",
        critical: "19-20/x2",
        handed: "two",
        weaponHand: "main",
        equipped: true,
      },
      {
        name: "Longbow",
        quantity: 1,
        weight: 3,
        kind: "weapon",
        damageM: "1d8",
        critical: "x3",
        handed: "ranged",
        // Not equipped; greatsword occupies both hands
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].twfHand, null);
    assert.equal(rows[0].fullAttackDisplay, "+9/+4");
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
        weaponHand: "main",
        equipped: true,
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
        weaponHand: "main",
        equipped: true,
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
        weaponHand: "main",
        equipped: true,
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
        weaponHand: "main",
        equipped: true,
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

  it("adds enhancement to attack and damage on a flaming greatsword", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 16;
    state.inventory = [
      {
        name: "+1 flaming greatsword",
        quantity: 1,
        weight: 8,
        kind: "weapon",
        damageM: "2d6",
        damageS: "1d10",
        critical: "19-20/x2",
        damageType: "S",
        handed: "two",
        masterwork: true,
        enhancementBonus: 1,
        weaponHand: "main",
        equipped: true,
        weaponAbilities: [{ abilityId: "flaming" }],
        damageLines: [
          {
            id: "primary",
            dice: "2d6",
            type: "S",
            diceS: "1d10",
            multiplyOnCrit: true,
          },
          {
            id: "fire",
            dice: "1d6",
            type: "fire",
            multiplyOnCrit: false,
            fromAbilityId: "flaming",
          },
        ],
      },
    ];

    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].attackBonus, 5); // BAB 1 + Str 3 + magic 1
    assert.equal(rows[0].damageModifier, 5); // 1.5 Str 4 + enhancement 1
    assert.equal(rows[0].extraDamageDisplay, "1d6 fire");
    assert.match(rows[0].damageDisplay, /2d6\+5 plus 1d6 fire\/19-20/);
    assert.deepEqual(rows[0].extraDamageDice, [
      { qty: 1, sides: 6, themeColor: "#E85D04" },
    ]);
    assert.equal(rows[0].damageDice[0]?.themeColor, "#A8B4C0");
    assert.equal(rows[0].damageParts[1]?.color, "#E85D04");
  });

  it("does not multiply extra fire dice on a critical", () => {
    const scaled = applyCriticalDamage([{ qty: 2, sides: 6 }], 5, 2);
    const text = formatWeaponDamageText(
      `${scaled.dice[0].qty}d${scaled.dice[0].sides}+${scaled.modifier}`,
      "1d6 fire",
    );
    assert.equal(text, "4d6+10 plus 1d6 fire");
  });

  it("masterwork-only adds +1 attack and no damage bonus", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.abilities.str = 12;
    state.inventory = [
      {
        name: "Masterwork longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        masterwork: true,
        weaponHand: "main",
        equipped: true,
      },
    ];
    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].attackBonus, 3); // BAB 1 + Str 1 + mw 1
    assert.equal(rows[0].damageModifier, 1);
    assert.equal(rows[0].damageDisplay, "1d8+1/19-20");
  });

  it("Keen doubles the threat range", () => {
    assert.equal(applyKeenThreat(19), 17);
    assert.equal(applyKeenThreat(18), 15);
    assert.equal(applyKeenThreat(20), 19);
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ];
    state.inventory = [
      {
        name: "Keen longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        handed: "one",
        weaponAbilities: [{ abilityId: "keen" }],
        weaponHand: "main",
        equipped: true,
      },
    ];
    const stats = computeCombatStats(state);
    const rows = computeWeaponAttackRows(state, stats);
    assert.equal(rows[0].threatMin, 17);
  });
});
