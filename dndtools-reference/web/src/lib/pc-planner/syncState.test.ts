import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import { syncPcPlanState } from "./syncState";

describe("syncPcPlanState spell preservation", () => {
  it("keeps spellbook entries beyond daily slot limits", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "wizard-99", className: "Wizard", level: 1 }];
    state.abilities.int = 12;
    state.spellClasses = [
      {
        label: "Wizard",
        classSlug: "wizard-99",
        casterLevel: 1,
        dcAbility: "int",
        mode: "preparation",
        spells: [
          { slug: "a", name: "A", level: 1, prepared: 1 },
          { slug: "b", name: "B", level: 1, prepared: 1 },
          { slug: "c", name: "C", level: 1, prepared: 1 },
        ],
      },
    ];

    const synced = syncPcPlanState(state);
    assert.equal(synced.spellClasses[0].spells.length, 3);
    const preparedTotal = synced.spellClasses[0].spells.reduce(
      (sum, sp) => sum + (sp.prepared ?? 0),
      0,
    );
    assert.equal(preparedTotal, 2);
  });

  it("does not drop spells when caster level decreases", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "wizard-99", className: "Wizard", level: 5 }];
    state.spellClasses = [
      {
        label: "Wizard",
        classSlug: "wizard-99",
        casterLevel: 5,
        dcAbility: "int",
        mode: "preparation",
        spells: [{ slug: "fireball", name: "Fireball", level: 3, prepared: 1 }],
      },
    ];

    state.identity.classLevels[0].level = 1;
    const synced = syncPcPlanState(state);
    assert.equal(synced.spellClasses[0].spells.length, 1);
    assert.equal(synced.spellClasses[0].spells[0].slug, "fireball");
  });
});

describe("syncPcPlanState skill orphan preservation", () => {
  it("is handled by mergeClassSkillsIntoRows in syncSkills.test.ts", () => {
    assert.ok(true);
  });
});

describe("syncPcPlanState half casters", () => {
  it("creates no spell class for paladin below level 4", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "paladin-95", className: "Paladin", level: 3 }];
    state.spellClasses = [];
    const synced = syncPcPlanState(state);
    assert.equal(synced.spellClasses.length, 0);
  });

  it("creates a spell class for paladin 4", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "paladin-95", className: "Paladin", level: 4 }];
    state.abilities.wis = 14;
    state.abilityBase.wis = 14;
    state.spellClasses = [];
    const synced = syncPcPlanState(state);
    assert.equal(synced.spellClasses.length, 1);
    assert.equal(synced.spellClasses[0].dcAbility, "wis");
    assert.equal(synced.spellClasses[0].mode, "preparation");
  });
});
