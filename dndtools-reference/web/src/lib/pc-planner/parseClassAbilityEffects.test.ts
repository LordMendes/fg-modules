import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import { computeCombatStats } from "./combatStats";
import {
  deriveClassFeatures,
  emptyClassDerivedFeatures,
  extractClassAbilityDescription,
  parseSaveAbilityBonusFromText,
} from "./parseClassAbilityEffects";
import type { ClassAbilityEntry } from "./parseClassFeatures";

const PALADIN_DESC = `Divine Grace (Su)
: At 2nd level, a paladin gains a bonus equal to her Charisma bonus (if any) on all saving throws.
Lay on Hands (Su)
: Beginning at 2nd level, a paladin with a Charisma score of 12 or higher can heal wounds.`;

describe("parseSaveAbilityBonusFromText", () => {
  it("parses charisma bonus to all saves", () => {
    const text =
      "At 2nd level, a paladin gains a bonus equal to her Charisma bonus (if any) on all saving throws.";
    assert.deepEqual(parseSaveAbilityBonusFromText(text), ["cha"]);
  });
});

describe("extractClassAbilityDescription", () => {
  it("extracts divine grace rules text", () => {
    const section = extractClassAbilityDescription(PALADIN_DESC, "Divine grace");
    assert.match(section ?? "", /Charisma bonus/i);
  });
});

describe("deriveClassFeatures", () => {
  it("applies divine grace from registry", () => {
    const abilities: ClassAbilityEntry[] = [
      {
        className: "Paladin",
        classSlug: "paladin-95",
        level: 2,
        name: "Divine grace",
      },
    ];
    const features = deriveClassFeatures(abilities);
    assert.deepEqual(features.saveAbilityBonus, {
      fort: ["cha"],
      ref: ["cha"],
      will: ["cha"],
    });
  });

  it("parses divine grace from class description when registry misses", () => {
    const abilities: ClassAbilityEntry[] = [
      {
        className: "Paladin",
        classSlug: "paladin-95",
        level: 2,
        name: "Divine Grace",
      },
    ];
    const descriptions = new Map([["paladin-95", PALADIN_DESC]]);
    const features = deriveClassFeatures(abilities, descriptions);
    assert.deepEqual(features.saveAbilityBonus.fort, ["cha"]);
  });
});

describe("computeCombatStats with class features", () => {
  it("adds charisma modifier to all saves for divine grace", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "paladin-95", className: "Paladin", level: 2 }];
    state.abilities.cha = 14;

    const classFeatures = deriveClassFeatures([
      { className: "Paladin", classSlug: "paladin-95", level: 2, name: "Divine grace" },
    ]);

    const stats = computeCombatStats(state, null, classFeatures);

    assert.equal(stats.fortitude.parts.ability, 2);
    assert.equal(stats.reflex.parts.ability, 2);
    assert.equal(stats.will.parts.ability, 2);
    assert.equal(stats.fortitude.total, stats.fortitude.parts.class + stats.fortitude.parts.stat + 2);
  });

  it("ignores class features when empty", () => {
    const state = createDefaultPcPlanState();
    const stats = computeCombatStats(state, null, emptyClassDerivedFeatures());
    assert.equal(stats.fortitude.parts.ability, 0);
  });
});
