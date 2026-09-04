import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  castingModeLabel,
  getClassCastingInfo,
  spellModeFromProgression,
  usesDirectClassSpellList,
} from "./classCasting";

describe("getClassCastingInfo", () => {
  it("matches compendium slugs with numeric suffix", () => {
    const info = getClassCastingInfo("wizard-99", "Wizard");
    assert.equal(info?.fgClassName, "Wizard");
    assert.equal(info?.progression, "prepared");
  });

  it("matches base caster slug prefix only", () => {
    const info = getClassCastingInfo("sorcerer-98", "Sorcerer");
    assert.equal(info?.progression, "spontaneous");
    assert.equal(info?.dcAbility, "cha");
  });

  it("does not match battle-sorcerer slug to sorcerer casting table", () => {
    assert.equal(getClassCastingInfo("battle-sorcerer-119", "Battle Sorcerer"), null);
    assert.equal(usesDirectClassSpellList("battle-sorcerer-119", "Battle Sorcerer"), false);
  });

  it("does not match variant names containing base caster name", () => {
    assert.equal(getClassCastingInfo("custom-123", "Battle Sorcerer"), null);
  });

  it("returns null for non-casters", () => {
    assert.equal(getClassCastingInfo("fighter-93", "Fighter"), null);
  });

  it("paladin uses wisdom for spell DC", () => {
    const info = getClassCastingInfo("paladin-95", "Paladin");
    assert.equal(info?.dcAbility, "wis");
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
