import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import {
  computeBaseAttackBonus,
  computeClassSave,
  computeCombatStats,
  iterativeAttackBonuses,
  normalizeCombatState,
} from "./combatStats";

describe("computeBaseAttackBonus", () => {
  it("stacks full and half BAB across classes", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 5 },
      { classSlug: "wizard", className: "Wizard", level: 3 },
    ];
    assert.equal(computeBaseAttackBonus(state.identity.classLevels), 6);
  });
});

describe("computeClassSave", () => {
  it("stacks good and poor saves from multiclass levels", () => {
    const classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 5 },
      { classSlug: "wizard", className: "Wizard", level: 5 },
    ];
    assert.equal(computeClassSave("fort", classLevels), 5);
    assert.equal(computeClassSave("will", classLevels), 5);
  });
});

describe("computeCombatStats", () => {
  it("computes FG-style melee, saves, and AC breakdown", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "fighter", className: "Fighter", level: 11 }];
    state.abilities.str = 20;
    state.abilities.dex = 16;
    state.abilities.con = 16;
    state.abilities.wis = 12;
    state.combat.armor = 6;
    state.combat.natural = 1;
    state.combat.initMisc = 4;
    state.combat.fortMisc = 5;
    state.combat.refMisc = 5;
    state.combat.willMisc = 5;
    state.combat.rangedMisc = -2;

    const stats = computeCombatStats(state);

    assert.equal(stats.bab, 11);
    assert.equal(stats.melee.total, 16);
    assert.equal(stats.ranged.total, 12);
    assert.equal(stats.grapple.total, 16);
    assert.equal(stats.fortitude.total, 15);
    assert.equal(stats.reflex.total, 11);
    assert.equal(stats.will.total, 9);
    assert.equal(stats.ac.total, 20);
    assert.equal(stats.flatFooted.total, 17);
    assert.equal(stats.touch.total, 13);
    assert.equal(stats.initiative.total, 7);
    assert.equal(stats.speed.total, 30);
  });

  it("uses pre-synced ability scores without re-applying racial ability mods", () => {
    const state = createDefaultPcPlanState();
    state.abilities.dex = 14;
    const raceFeatures: RaceDerivedFeatures = {
      traits: [],
      abilityMods: { dex: 2 },
      skillBonuses: {},
      skillPointBonus: null,
      saveBonus: { fort: 0, ref: 2, will: 0 },
      naturalArmor: 0,
      sizeMod: 0,
      speed: 30,
    };

    const stats = computeCombatStats(state, raceFeatures);

    assert.equal(stats.reflex.parts.stat, 2);
    assert.equal(stats.reflex.parts.racial, 2);
    assert.equal(stats.reflex.parts.misc, 0);
    assert.equal(stats.reflex.total, 4);
  });

  it("uses grapple size modifier distinct from attack size", () => {
    const state = createDefaultPcPlanState();
    state.combat.sizeMod = 1;
    const stats = computeCombatStats(state);
    assert.equal(stats.melee.parts.size, 1);
    assert.equal(stats.grapple.parts.size, -4);
  });
});

describe("normalizeCombatState", () => {
  it("migrates legacy combat fields", () => {
    const combat = normalizeCombatState({
      bab: 5,
      ac: 18,
      acNotes: "notes",
      attacks: "Longsword +8",
    });
    assert.equal(combat.attacks, "Longsword +8");
    assert.equal(combat.speedBase, 30);
    assert.equal(combat.armor, 0);
  });
});

describe("iterativeAttackBonuses", () => {
  it("adds a second attack at -5 when the bonus stays positive", () => {
    assert.deepEqual(iterativeAttackBonuses(5), [5]);
    assert.deepEqual(iterativeAttackBonuses(6), [6, 1]);
    assert.deepEqual(iterativeAttackBonuses(9), [9, 4]);
    assert.deepEqual(iterativeAttackBonuses(11), [11, 6, 1]);
  });
});
