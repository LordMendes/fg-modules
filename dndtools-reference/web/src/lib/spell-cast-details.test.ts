import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSpellCastDetailsFromSrd } from "./spell-cast-details";

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
