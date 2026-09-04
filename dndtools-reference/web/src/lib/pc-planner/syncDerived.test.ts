import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";
import {
  applyDerivedFromRace,
  applyRaceCombatBasicsOnRaceChange,
  effectiveAbilities,
  ensureAbilityBase,
} from "./syncDerived";

const elfRace: RaceDerivedFeatures = {
  traits: [],
  abilityMods: { dex: 2, con: -2 },
  skillBonuses: { listen: 2, search: 2, spot: 2 },
  skillPointBonus: null,
  saveBonus: { fort: 0, ref: 0, will: 0 },
  naturalArmor: 0,
  sizeMod: 0,
  speed: 30,
  speedUnhinderedByEncumbrance: false,
};

describe("effectiveAbilities", () => {
  it("adds racial modifiers to base scores", () => {
    const base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const effective = effectiveAbilities(base, elfRace);
    assert.equal(effective.dex, 12);
    assert.equal(effective.con, 8);
  });
});

describe("ensureAbilityBase", () => {
  it("strips baked-in racial mods from legacy saves once", () => {
    const state = createDefaultPcPlanState();
    state.abilities.dex = 12;
    state.abilities.con = 8;

    ensureAbilityBase(state, elfRace);

    assert.equal(state.abilityBase!.dex, 10);
    assert.equal(state.abilityBase!.con, 10);
  });
});

describe("applyDerivedFromRace", () => {
  it("applies ability and skill bonuses without overwriting combat", () => {
    const state = createDefaultPcPlanState();
    state.identity.raceSlug = "elf";
    state.skills = [{ name: "Listen", slug: "listen", ranks: 0, misc: 0 }];
    state.combat.speedBase = 40;

    applyDerivedFromRace(state, elfRace);

    assert.equal(state.abilities.dex, 12);
    assert.equal(state.abilities.con, 8);
    assert.equal(state.skills[0].racialMisc, 2);
    assert.equal(state.combat.speedBase, 40);
  });
});

describe("applyRaceCombatBasicsOnRaceChange", () => {
  it("sets racial size speed and natural armor", () => {
    const state = createDefaultPcPlanState();
    const dwarfRace: RaceDerivedFeatures = {
      ...elfRace,
      naturalArmor: 0,
      sizeMod: 1,
      speed: 20,
    };
    applyRaceCombatBasicsOnRaceChange(state, dwarfRace);
    assert.equal(state.combat.sizeMod, 1);
    assert.equal(state.combat.speedBase, 20);
  });
});
