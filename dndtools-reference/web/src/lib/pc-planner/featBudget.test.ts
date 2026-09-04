import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCombatStats } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeFeatBudget,
  fighterBonusFeatBudget,
  generalFeatBudget,
  humanBonusFeatBudget,
} from "./featBudget";
import { deriveFeatEffects } from "./parseFeatEffects";

describe("feat budget", () => {
  it("counts general feats at 1st and every 3rd level", () => {
    assert.equal(generalFeatBudget(1), 1);
    assert.equal(generalFeatBudget(2), 1);
    assert.equal(generalFeatBudget(3), 2);
    assert.equal(generalFeatBudget(6), 3);
  });

  it("grants human bonus feat", () => {
    assert.equal(humanBonusFeatBudget(1, null, "Human"), 1);
    assert.equal(humanBonusFeatBudget(1, null, "Elf"), 0);
  });

  it("counts fighter bonus feats", () => {
    assert.equal(
      fighterBonusFeatBudget([{ classSlug: "fighter-93", className: "Fighter", level: 2 }]),
      2,
    );
  });

  it("sums human fighter 2 budget", () => {
    const state = createDefaultPcPlanState();
    state.identity.race = "Human";
    state.identity.classLevels = [{ classSlug: "fighter-93", className: "Fighter", level: 2 }];
    state.feats = [];
    const budget = computeFeatBudget(state, {
      traits: [],
      abilityMods: {},
      skillBonuses: {},
      skillPointBonus: { firstLevel: 4, perAdditionalLevel: 1 },
      saveBonus: { fort: 0, ref: 0, will: 0 },
      naturalArmor: 0,
      sizeMod: 0,
      speed: 30,
    });
    // general 1 + human 1 + fighter 2 = 4
    assert.equal(budget.total, 4);
  });
});

describe("feat effects", () => {
  it("applies Dodge and Improved Initiative without writing misc fields", () => {
    const effects = deriveFeatEffects([
      { slug: "dodge", name: "Dodge" },
      { slug: "improved-initiative", name: "Improved Initiative" },
    ]);
    assert.equal(effects.dodgeBonus, 1);
    assert.equal(effects.initBonus, 4);

    const state = createDefaultPcPlanState();
    state.abilities.dex = 10;
    state.combat.dodge = 0;
    state.combat.initMisc = 0;
    const stats = computeCombatStats(state, null, null, null, effects);
    assert.equal(stats.ac.parts.dodge, 1);
    assert.equal(stats.initiative.parts.misc, 4);
    assert.equal(state.combat.dodge, 0);
    assert.equal(state.combat.initMisc, 0);
  });
});
