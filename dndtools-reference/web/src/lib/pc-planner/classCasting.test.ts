import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  castingModeLabel,
  getClassCastingInfo,
  spellModeFromProgression,
} from "./classCasting";

describe("getClassCastingInfo", () => {
  it("matches compendium slugs with numeric suffix", () => {
    const info = getClassCastingInfo("wizard-99", "Wizard");
    assert.equal(info?.fgClassName, "Wizard");
    assert.equal(info?.progression, "prepared");
  });

  it("matches variant class names containing base caster name", () => {
    const info = getClassCastingInfo("sorcerer-98", "Battle Sorcerer");
    assert.equal(info?.progression, "spontaneous");
    assert.equal(info?.dcAbility, "cha");
  });

  it("returns null for non-casters", () => {
    assert.equal(getClassCastingInfo("fighter-93", "Fighter"), null);
  });
});

describe("spellModeFromProgression", () => {
  it("maps progression to spell mode", () => {
    assert.equal(spellModeFromProgression("spontaneous"), "spontaneous");
    assert.equal(spellModeFromProgression("prepared"), "preparation");
    assert.equal(castingModeLabel("spontaneous"), "Spontaneous");
    assert.equal(castingModeLabel("preparation"), "Prepared");
  });
});
