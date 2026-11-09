import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveFeatEffects, emptyFeatDerivedFeatures } from "./parseFeatEffects";
import type { FeatEntry } from "./types";

describe("deriveFeatEffects - Spell Focus", () => {
  it("Spell Focus (Evocation) grants +1 DC to evocation spells", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-focus-evocation", name: "Spell Focus (Evocation)", choice: "evocation" },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellDcBonusBySchool["evocation"], 1);
  });

  it("Greater Spell Focus (Evocation) grants +2 DC to evocation spells", () => {
    const feats: FeatEntry[] = [
      {
        slug: "greater-spell-focus-evocation",
        name: "Greater Spell Focus (Evocation)",
        choice: "evocation",
      },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellDcBonusBySchool["evocation"], 2);
  });

  it("both Spell Focus and Greater Spell Focus stack to +2 (max)", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-focus-necromancy", name: "Spell Focus", choice: "necromancy" },
      {
        slug: "greater-spell-focus-necromancy",
        name: "Greater Spell Focus",
        choice: "necromancy",
      },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellDcBonusBySchool["necromancy"], 2);
  });

  it("different schools are independent", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-focus-evocation", name: "Spell Focus", choice: "evocation" },
      {
        slug: "greater-spell-focus-necromancy",
        name: "Greater Spell Focus",
        choice: "necromancy",
      },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellDcBonusBySchool["evocation"], 1);
    assert.equal(result.spellDcBonusBySchool["necromancy"], 2);
  });

  it("no choice means no bonus", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-focus", name: "Spell Focus" },
    ];
    const result = deriveFeatEffects(feats);
    assert.deepEqual(result.spellDcBonusBySchool, {});
  });
});

describe("deriveFeatEffects - Spell Penetration", () => {
  it("Spell Penetration grants +2 to CL checks", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-penetration", name: "Spell Penetration" },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellPenetrationBonus, 2);
  });

  it("Greater Spell Penetration grants +4 total", () => {
    const feats: FeatEntry[] = [
      { slug: "greater-spell-penetration", name: "Greater Spell Penetration" },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellPenetrationBonus, 4);
  });

  it("both Spell Penetration and Greater use max (+4)", () => {
    const feats: FeatEntry[] = [
      { slug: "spell-penetration", name: "Spell Penetration" },
      { slug: "greater-spell-penetration", name: "Greater Spell Penetration" },
    ];
    const result = deriveFeatEffects(feats);
    assert.equal(result.spellPenetrationBonus, 4);
  });

  it("defaults to 0 with no feats", () => {
    const result = emptyFeatDerivedFeatures();
    assert.equal(result.spellPenetrationBonus, 0);
  });
});
