import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEngineContext, contextFromEffectString } from "./engineContext";
import { computeMissChance, resolveConcealment } from "./concealment";

function baseFields(id: string) {
  return {
    id,
    name: id,
    kind: "npc" as const,
    ac: 15,
    acTouch: null,
    acFlat: null,
    initMod: 0,
    hpMax: 10,
    hpTemp: 0,
    wounds: 0,
    nonlethal: 0,
    defenses: {},
    effects: [],
  };
}

describe("rules/concealment (90-testing.md attack rows)", () => {
  it("target CONC imposes 20% miss chance", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = contextFromEffectString(baseFields("target"), "Blur; CONC");

    assert.equal(computeMissChance(attacker, target), 20);

    const miss = resolveConcealment(20, 15);
    assert.ok(miss);
    assert.equal(miss!.missed, true);

    const hit = resolveConcealment(20, 25);
    assert.ok(hit);
    assert.equal(hit!.missed, false);
  });

  it("returns null when miss chance is 0", () => {
    assert.equal(resolveConcealment(0, 50), null);
  });

  it("blinded attacker suffers 50% miss on all attacks", () => {
    const attacker = contextFromEffectString(baseFields("attacker"), "Blinded");
    const target = buildEngineContext(baseFields("target"));

    assert.equal(computeMissChance(attacker, target), 50);
  });
});
