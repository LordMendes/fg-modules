import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getSpellCastDetailsFromSrd,
  resolveSpellCastDetails,
  spellSaveDc,
} from "./spell-cast-details";

describe("getSpellCastDetailsFromSrd", () => {
  it("extracts save and damage for fireball", () => {
    const details = getSpellCastDetailsFromSrd("Fireball", 3);
    assert.equal(details.save, "Reflex half");
    assert.match(details.damage ?? "", /1d6\/level \(max 10d6\) fire/);
    assert.equal(details.effect, null);
  });

  it("uses short as damage when no structured action exists", () => {
    const details = getSpellCastDetailsFromSrd("Magic Missile", 1);
    assert.equal(details.save, null);
    assert.match(details.damage ?? "", /1d4\+1 damage/);
    assert.equal(details.effect, null);
  });

  it("uses short as effect for non-damage spells", () => {
    const details = getSpellCastDetailsFromSrd("Hold Person", 2);
    assert.equal(details.save, "Will negates; see text");
    assert.equal(details.damage, null);
    assert.match(details.effect ?? "", /Paralyzes/);
  });
});

describe("resolveSpellCastDetails", () => {
  it("computes save DC from spell level and class ability modifier", () => {
    const context = { casterLevel: 5, spellLevel: 3, dcModifier: 3 };
    assert.equal(spellSaveDc(context), 16);
    const details = resolveSpellCastDetails("Fireball", context);
    assert.match(details.save ?? "", /Reflex half \(DC 16\)/);
  });

  it("scales area damage by caster level", () => {
    const details = resolveSpellCastDetails("Fireball", {
      casterLevel: 5,
      spellLevel: 3,
      dcModifier: 3,
    });
    assert.equal(details.damage, "5d6 fire");
  });

  it("caps scaled damage at the spell maximum", () => {
    const details = resolveSpellCastDetails("Fireball", {
      casterLevel: 15,
      spellLevel: 3,
      dcModifier: 3,
    });
    assert.equal(details.damage, "10d6 fire");
  });

  it("computes magic missile damage from caster level", () => {
    const details = resolveSpellCastDetails("Magic Missile", {
      casterLevel: 5,
      spellLevel: 1,
      dcModifier: 2,
    });
    assert.equal(details.damage, "3× (1d4+1) force (3d4+3)");
  });

  it("computes inflict wounds as fixed die plus capped level bonus", () => {
    const details = resolveSpellCastDetails("Inflict Light Wounds", {
      casterLevel: 8,
      spellLevel: 1,
      dcModifier: 0,
    });
    assert.match(details.save ?? "", /Will half \(DC 11\)/);
    assert.equal(details.damage, "1d8+5 negative");
  });
});
