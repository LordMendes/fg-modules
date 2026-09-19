import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EffectComponent } from "../types";
import { formatEffect } from "./formatEffect";
import { parseEffect } from "./parseEffect";

function expectComponents(
  input: string,
  expected: EffectComponent[],
  expectedWarnings: string[] = [],
): void {
  const { components, warnings } = parseEffect(input);
  assert.deepEqual(components, expected, `components for "${input}"`);
  assert.deepEqual(warnings, expectedWarnings, `warnings for "${input}"`);
}

describe("parseEffect", () => {
  describe("05-effects-dsl.md examples", () => {
    it("Bless with attack and save morale bonuses", () => {
      expectComponents("Bless; ATK: 1 morale; SAVE: 1 morale vs fear", [
        { tag: "LABEL", text: "Bless" },
        { tag: "ATK", value: 1, bonusType: "morale", descriptors: [] },
        {
          tag: "SAVE",
          value: 1,
          bonusType: "morale",
          descriptors: ["vs fear"],
        },
      ]);
    });

    it("Mage Armor with AC bonus", () => {
      expectComponents("Mage Armor; AC: 4 armor", [
        { tag: "LABEL", text: "Mage Armor" },
        { tag: "AC", value: 4, bonusType: "armor", descriptors: [] },
      ]);
    });

    it("Haste with multiple bonuses", () => {
      expectComponents("Haste; ATK: 1; AC: 1 dodge; REF: 1 dodge; SPEED: 30", [
        { tag: "LABEL", text: "Haste" },
        { tag: "ATK", value: 1, descriptors: [] },
        { tag: "AC", value: 1, bonusType: "dodge", descriptors: [] },
        { tag: "REF", value: 1, bonusType: "dodge", descriptors: [] },
        { tag: "SPEED", value: 30, descriptors: [] },
      ]);
    });

    it("Prone condition", () => {
      expectComponents("Prone", [{ tag: "COND", condition: "prone" }]);
    });

    it("Stunned and Flat-footed conditions", () => {
      expectComponents("Stunned; Flat-footed", [
        { tag: "COND", condition: "stunned" },
        { tag: "COND", condition: "flatFooted" },
      ]);
    });

    it("Shaken condition", () => {
      expectComponents("Shaken", [{ tag: "COND", condition: "shaken" }]);
    });

    it("Bull's Strength ability enhancement", () => {
      expectComponents("Bull's Strength; STR: 4 enhancement", [
        { tag: "LABEL", text: "Bull's Strength" },
        { tag: "ABIL", ability: "str", value: 4, bonusType: "enhancement" },
      ]);
    });

    it("Stoneskin damage reduction", () => {
      expectComponents("Stoneskin; DR: 10 adamantine", [
        { tag: "LABEL", text: "Stoneskin" },
        { tag: "DR", amount: 10, bypass: ["adamantine"] },
      ]);
    });

    it("Resist Energy", () => {
      expectComponents("Resist Energy; RESIST: 10 fire", [
        { tag: "LABEL", text: "Resist Energy" },
        { tag: "RESIST", amount: 10, types: ["fire"] },
      ]);
    });

    it("Protection from Energy immunity", () => {
      expectComponents("Protection from Energy; IMMUNE: fire", [
        { tag: "LABEL", text: "Protection from Energy" },
        { tag: "IMMUNE", types: ["fire"] },
      ]);
    });

    it("Troll regeneration", () => {
      expectComponents("Troll; REGEN: 5 fire acid", [
        { tag: "LABEL", text: "Troll" },
        { tag: "REGEN", amount: 5, bypass: ["fire", "acid"] },
      ]);
    });

    it("Fast healing", () => {
      expectComponents("FHEAL: 3", [{ tag: "FHEAL", amount: 3 }]);
    });

    it("Flaming weapon damage", () => {
      expectComponents("Flaming; DMG: 1d6 fire", [
        { tag: "LABEL", text: "Flaming" },
        {
          tag: "DMG",
          dice: "1d6",
          value: 0,
          types: ["fire"],
          descriptors: [],
        },
      ]);
    });

    it("Sneak Attack precision melee damage", () => {
      expectComponents("Sneak Attack; DMG: 3d6 precision melee", [
        { tag: "LABEL", text: "Sneak Attack" },
        {
          tag: "DMG",
          dice: "3d6",
          value: 0,
          types: ["precision"],
          descriptors: ["melee"],
        },
      ]);
    });

    it("Acid Arrow ongoing damage", () => {
      expectComponents("Acid Arrow; DMGO: 2d4 acid", [
        { tag: "LABEL", text: "Acid Arrow" },
        { tag: "DMGO", dice: "2d4", types: ["acid"] },
      ]);
    });

    it("Power Attack tradeoff", () => {
      expectComponents("Power Attack; ATK: -2 melee; DMG: 4 melee", [
        { tag: "LABEL", text: "Power Attack" },
        { tag: "ATK", value: -2, descriptors: ["melee"] },
        {
          tag: "DMG",
          dice: "",
          value: 4,
          types: [],
          descriptors: ["melee"],
        },
      ]);
    });

    it("Cover", () => {
      expectComponents("Cover; COVER", [
        { tag: "LABEL", text: "Cover" },
        { tag: "COVER" },
      ]);
    });

    it("Blur concealment", () => {
      expectComponents("Blur; CONC", [
        { tag: "LABEL", text: "Blur" },
        { tag: "CONC" },
      ]);
    });

    it("Invisible condition", () => {
      expectComponents("Invisible", [{ tag: "COND", condition: "invisible" }]);
    });

    it("Caster level bonus", () => {
      expectComponents("CL: 2", [{ tag: "CL", value: 2, descriptors: [] }]);
    });

    it("Initiative bonus", () => {
      expectComponents("INIT: 4", [{ tag: "INIT", value: 4, descriptors: [] }]);
    });

    it("system condition Dying", () => {
      expectComponents("Dying", [{ tag: "COND", condition: "dying" }]);
    });

    it("system condition Dead", () => {
      expectComponents("Dead", [{ tag: "COND", condition: "dead" }]);
    });

    it("system condition Stable", () => {
      expectComponents("Stable", [{ tag: "COND", condition: "stable" }]);
    });

    it("system condition Disabled", () => {
      expectComponents("Disabled", [{ tag: "COND", condition: "disabled" }]);
    });
  });

  describe("90-testing.md parseEffect matrix", () => {
    it("parses duplicate morale attack bonuses separately for stacking", () => {
      expectComponents("ATK: +2 morale; ATK: +1 morale", [
        { tag: "ATK", value: 2, bonusType: "morale", descriptors: [] },
        { tag: "ATK", value: 1, bonusType: "morale", descriptors: [] },
      ]);
    });

    it("parses duplicate dodge AC bonuses separately for stacking", () => {
      expectComponents("AC: 1 dodge; AC: 1 dodge", [
        { tag: "AC", value: 1, bonusType: "dodge", descriptors: [] },
        { tag: "AC", value: 1, bonusType: "dodge", descriptors: [] },
      ]);
    });

    it("parses duplicate attack penalties separately for stacking", () => {
      expectComponents("ATK: -2; ATK: -2 morale", [
        { tag: "ATK", value: -2, descriptors: [] },
        { tag: "ATK", value: -2, bonusType: "morale", descriptors: [] },
      ]);
    });

    it("resolves electricity alias on RESIST", () => {
      expectComponents("RESIST: 10 elec", [
        { tag: "RESIST", amount: 10, types: ["electricity"] },
      ]);
    });

    it("parses a plain label without warnings", () => {
      expectComponents("just a label", [{ tag: "LABEL", text: "just a label" }]);
    });

    it("treats unknown tags as label with warning", () => {
      expectComponents(
        "FOO: 3",
        [{ tag: "LABEL", text: "FOO: 3" }],
        ["Unknown tag: FOO"],
      );
    });
  });

  describe("formatEffect round-trip", () => {
    it("formats Bless example canonically", () => {
      const input = "Bless; ATK: 1 morale; SAVE: 1 morale vs fear";
      const { components } = parseEffect(input);
      assert.equal(formatEffect(components), input);
    });

    it("formats Haste example canonically", () => {
      const input = "Haste; ATK: 1; AC: 1 dodge; REF: 1 dodge; SPEED: 30";
      const { components } = parseEffect(input);
      assert.equal(formatEffect(components), input);
    });

    it("formats conditions canonically", () => {
      const input = "Stunned; Flat-footed";
      const { components } = parseEffect(input);
      assert.equal(formatEffect(components), input);
    });

    it("never throws on garbage input", () => {
      assert.doesNotThrow(() => parseEffect(";;; @@@ ; ATK: not-a-number ;"));
    });
  });
});
