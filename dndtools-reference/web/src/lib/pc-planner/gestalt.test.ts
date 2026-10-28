import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeGestaltBaseAttackBonus,
  computeGestaltClassSave,
  computeBaseAttackBonus,
  computeClassSave,
  computeCombatStats,
} from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  characterLevelFromPlan,
  classLevelsFromGestaltRows,
  expandClassLevelsToGestaltRows,
  formatGestaltClassSummary,
  normalizeGestaltLevels,
  syncGestaltClassLevels,
} from "./gestalt";
import { computeMaxHitPoints, syncHitDice } from "./hitPoints";
import { seedResourcesFromAbilities } from "./resources";
import { computeSkillPointSummary } from "./skillPoints";
import { finalizePcPlanState } from "./syncState";

describe("gestalt class level derivation", () => {
  it("keeps empty gestalt rows during normalize", () => {
    const rows = normalizeGestaltLevels([{ a: null, b: null }]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.a, null);
    assert.equal(rows[0]?.b, null);
  });

  it("expands multiclass into side A with empty side B", () => {
    const rows = expandClassLevelsToGestaltRows([
      { classSlug: "fighter", className: "Fighter", level: 2 },
      { classSlug: "wizard", className: "Wizard", level: 1 },
    ]);
    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.a?.classSlug, "fighter");
    assert.equal(rows[0]?.b, null);
    assert.equal(rows[2]?.a?.classSlug, "wizard");
  });

  it("counts same class on both sides of a row once", () => {
    const levels = classLevelsFromGestaltRows([
      {
        a: { classSlug: "fighter", className: "Fighter" },
        b: { classSlug: "fighter", className: "Fighter" },
      },
      {
        a: { classSlug: "fighter", className: "Fighter" },
        b: { classSlug: "wizard", className: "Wizard" },
      },
    ]);
    assert.deepEqual(
      levels.map((cl) => `${cl.classSlug}:${cl.level}`).sort(),
      ["fighter:2", "wizard:1"],
    );
  });
});

describe("gestalt combat status", () => {
  it("keeps stacked BAB when gestalt is off", () => {
    const classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 5 },
      { classSlug: "wizard", className: "Wizard", level: 5 },
    ];
    assert.equal(computeBaseAttackBonus(classLevels), 7);
    assert.equal(characterLevelFromPlan({ identity: { classLevels, gestalt: false } }), 10);
  });

  it("uses better side BAB and saves for Fighter 5 // Wizard 5", () => {
    const state = createDefaultPcPlanState();
    state.identity.gestalt = true;
    state.identity.gestaltLevels = Array.from({ length: 5 }, () => ({
      a: { classSlug: "fighter", className: "Fighter" },
      b: { classSlug: "wizard", className: "Wizard" },
    }));
    syncGestaltClassLevels(state);

    assert.equal(characterLevelFromPlan(state), 5);
    assert.equal(formatGestaltClassSummary(state.identity.classLevels), "Fighter 5 // Wizard 5");
    assert.equal(computeGestaltBaseAttackBonus(state), 5);
    assert.equal(computeGestaltClassSave("fort", state), 4);
    assert.equal(computeGestaltClassSave("will", state), 4);
    assert.equal(computeGestaltClassSave("ref", state), 1);

    const stats = computeCombatStats(state);
    assert.equal(stats.bab, 5);
    assert.equal(stats.fortitude.parts.class, 4);
    assert.equal(stats.will.parts.class, 4);
  });

  it("does not change BAB when side B is empty", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 5 },
    ];
    const normalBab = computeBaseAttackBonus(state.identity.classLevels);

    state.identity.gestalt = true;
    state.identity.gestaltLevels = expandClassLevelsToGestaltRows(state.identity.classLevels);
    syncGestaltClassLevels(state);

    assert.equal(computeGestaltBaseAttackBonus(state), normalBab);
    assert.equal(characterLevelFromPlan(state), 5);
  });
});

describe("gestalt hit dice and skills", () => {
  it("uses five d10s for Fighter 5 // Wizard 5", () => {
    const state = createDefaultPcPlanState();
    state.identity.gestalt = true;
    state.identity.gestaltLevels = Array.from({ length: 5 }, () => ({
      a: { classSlug: "fighter", className: "Fighter" },
      b: { classSlug: "wizard", className: "Wizard" },
    }));
    state.abilities.con = 10;
    syncGestaltClassLevels(state);
    syncHitDice(state, { fighter: "d10", wizard: "d4" });

    assert.equal(state.hitPoints.rolls.length, 5);
    assert.equal(state.hitPoints.rolls[0]?.rolled, 10);
    assert.equal(state.hitPoints.rolls[0]?.classSlug, "fighter");
    assert.equal(state.hitPoints.rolls[1]?.rolled, 6);
    assert.equal(computeMaxHitPoints(state, { fighter: "d10", wizard: "d4" }), 34);
  });

  it("takes better skill points per level with ×4 only at level 1", () => {
    const state = createDefaultPcPlanState();
    state.identity.gestalt = true;
    state.identity.gestaltLevels = Array.from({ length: 5 }, () => ({
      a: { classSlug: "fighter", className: "Fighter" },
      b: { classSlug: "wizard", className: "Wizard" },
    }));
    state.abilities.int = 10;
    syncGestaltClassLevels(state);

    const summary = computeSkillPointSummary(state, {
      fighter: 2,
      wizard: 2,
    });
    // Both 2+Int=2; level 1 ×4 = 8; levels 2–5 = 2 each → 16
    assert.equal(summary.available, 16);
  });

  it("takes rogue skill points over fighter when gestalt", () => {
    const state = createDefaultPcPlanState();
    state.identity.gestalt = true;
    state.identity.gestaltLevels = Array.from({ length: 2 }, () => ({
      a: { classSlug: "fighter", className: "Fighter" },
      b: { classSlug: "rogue", className: "Rogue" },
    }));
    state.abilities.int = 10;
    syncGestaltClassLevels(state);

    const summary = computeSkillPointSummary(state, {
      fighter: 2,
      rogue: 8,
    });
    // Better is 8; L1 ×4 = 32; L2 = 8 → 40
    assert.equal(summary.available, 40);
  });
});

describe("gestalt shared resources", () => {
  it("keeps one rage pool with the higher max", () => {
    const resources = seedResourcesFromAbilities(
      [
        { className: "Barbarian", classSlug: "barbarian", level: 4, name: "Rage" },
        { className: "Barbarian", classSlug: "barbarian", level: 8, name: "Rage" },
      ],
      [],
    );
    const rage = resources.filter((r) => r.name === "Rage / day");
    assert.equal(rage.length, 1);
    // floor((8+3)/4)=2
    assert.equal(rage[0]?.max, 2);
  });
});

describe("finalizePcPlanState with gestalt", () => {
  it("rebuilds classLevels from gestalt rows", () => {
    const state = createDefaultPcPlanState();
    state.identity.gestalt = true;
    state.identity.gestaltLevels = Array.from({ length: 3 }, () => ({
      a: { classSlug: "fighter", className: "Fighter" },
      b: { classSlug: "wizard", className: "Wizard" },
    }));
    state.identity.classLevels = [];
    const next = finalizePcPlanState(state);
    assert.deepEqual(
      next.identity.classLevels.map((cl) => `${cl.classSlug}:${cl.level}`).sort(),
      ["fighter:3", "wizard:3"],
    );
  });
});
