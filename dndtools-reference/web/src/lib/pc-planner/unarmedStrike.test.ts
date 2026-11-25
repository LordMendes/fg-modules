import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import { computeCombatStats } from "./combatStats";
import { computeNaturalAttackRows } from "./specialAttacks";
import {
  computeUnarmedStrike,
  monkUnarmedLevel,
  unarmedDamageDice,
} from "./unarmedStrike";
import type { ClassLevelEntry } from "./types";

function withClasses(levels: ClassLevelEntry[]) {
  const state = createDefaultPcPlanState("Test");
  state.identity.classLevels = levels;
  return state;
}

describe("unarmedDamageDice", () => {
  it("uses the PHB unarmed table when the character is not a monk", () => {
    assert.equal(unarmedDamageDice(0, 0), "1d3");
    assert.equal(unarmedDamageDice(1, 0), "1d2");
    assert.equal(unarmedDamageDice(-1, 0), "1d4");
  });

  it("uses monk class level and size, including the PHB Large 20th die", () => {
    assert.equal(unarmedDamageDice(0, 4), "1d8");
    assert.equal(unarmedDamageDice(1, 1), "1d4");
    assert.equal(unarmedDamageDice(-1, 20), "4d8");
  });

  it("does not count non-monk classes toward the monk die", () => {
    assert.equal(monkUnarmedLevel([
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ]), 0);
    assert.equal(unarmedDamageDice(0, 0), "1d3");
  });
});

describe("computeUnarmedStrike", () => {
  it("keeps the non-monk die when fighter levels raise BAB", () => {
    const state = withClasses([
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ]);
    const stats = computeCombatStats(state);
    const { entry, row } = computeUnarmedStrike(state, stats);
    assert.equal(entry.damageM, "1d3");
    assert.equal(entry.damageS, "1d3");
    assert.equal(stats.bab, 6);
    assert.equal(row.attackBonus, 6);
  });

  it("adds Weapon Focus to the attack and Weapon Specialization to the damage", () => {
    const state = withClasses([
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ]);
    state.abilities.str = 14;
    state.feats = [
      { slug: "weapon-focus", name: "Weapon Focus", choice: "unarmed strike" },
      {
        slug: "weapon-specialization",
        name: "Weapon Specialization",
        choice: "unarmed strike",
      },
    ];
    const { row } = computeUnarmedStrike(state, computeCombatStats(state));
    assert.equal(row.attackBonus, 6 + 2 + 1);
    assert.equal(row.damageModifier, 2 + 2);
    assert.match(row.damageDisplay, /1d3\+4/);
  });

  it("accepts a bare unarmed feat choice", () => {
    const state = withClasses([
      { classSlug: "fighter", className: "Fighter", level: 1 },
    ]);
    state.feats = [
      { slug: "weapon-focus", name: "Weapon Focus", choice: "unarmed" },
    ];
    const { row } = computeUnarmedStrike(state, computeCombatStats(state));
    assert.equal(row.attackBonus, 1 + 1);
  });

  it("uses Dexterity to hit and Strength for damage with Weapon Finesse", () => {
    const state = withClasses([
      { classSlug: "wizard", className: "Wizard", level: 1 },
    ]);
    state.abilities.str = 14;
    state.abilities.dex = 16;
    state.feats = [{ slug: "weapon-finesse", name: "Weapon Finesse" }];
    const { row } = computeUnarmedStrike(state, computeCombatStats(state));
    assert.equal(row.attackBonus, 3);
    assert.equal(row.damageModifier, 2);
    assert.ok(row.attackSources.some((line) => line.startsWith("Dex ")));
    assert.ok(row.damageSources.some((line) => line.startsWith("Str ")));
  });

  it("includes a Small size modifier on the attack", () => {
    const state = withClasses([
      { classSlug: "wizard", className: "Wizard", level: 1 },
    ]);
    state.combat.sizeMod = 1;
    const { entry, row } = computeUnarmedStrike(state, computeCombatStats(state));
    assert.equal(entry.damageM, "1d2");
    assert.equal(row.attackBonus, 1);
    assert.ok(row.attackSources.some((line) => line.includes("Size +1")));
  });

  it("uses the monk die at monk level, not total character level", () => {
    const state = withClasses([
      { classSlug: "monk-94", className: "Monk", level: 4 },
      { classSlug: "fighter", className: "Fighter", level: 2 },
    ]);
    state.combat.sizeMod = 1;
    const stats = computeCombatStats(state);
    const { entry, row } = computeUnarmedStrike(state, stats);
    assert.equal(entry.damageM, "1d6");
    assert.equal(stats.bab, 3 + 2);
    assert.equal(row.attackBonus, stats.bab + 1);
  });

  it("does not also build a stored unarmed row through the natural-attack formula", () => {
    const state = createDefaultPcPlanState("Test");
    state.combat.specialAttacks = [
      {
        id: "stored",
        kind: "natural",
        templateId: "unarmed-strike",
        name: "Unarmed strike",
        count: 1,
        primary: true,
        damageM: "1d3",
        damageS: "1d2",
        damageType: "Bludgeoning",
        critical: "x2",
        attackMisc: 0,
        damageMisc: 0,
        saveDc: null,
        saveType: null,
        notes: "",
      },
    ];
    const rows = computeNaturalAttackRows(state, computeCombatStats(state));
    assert.equal(rows.length, 0);
  });
});
