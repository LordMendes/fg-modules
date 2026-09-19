import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEffect } from "../effects/parseEffect";
import { buildEngineContext, contextFromEffectString } from "./engineContext";
import { isImmuneToCrit, resolveCriticalConfirm, scaleCriticalDamage } from "./critical";

function baseFields(id: string) {
  return {
    id,
    name: id,
    kind: "npc" as const,
    ac: 17,
    acTouch: 12,
    acFlat: 10,
    initMod: 0,
    hpMax: 10,
    hpTemp: 0,
    wounds: 0,
    nonlethal: 0,
    defenses: {},
    effects: [],
  };
}

const longsword = { name: "Longsword", bonus: 9, mode: "melee" as const };

describe("rules/critical (90-testing.md)", () => {
  it("confirm face 1: not confirmed", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext(baseFields("target"));

    const result = resolveCriticalConfirm({
      attacker,
      target,
      line: longsword,
      face: 1,
      pendingCrit: { multiplier: 2, threatFace: 19, attackName: "Longsword" },
    });

    assert.equal(result.payload.confirmed, false);
    assert.equal(result.payload.autoMiss, true);
    assert.deepEqual(result.patches, [{ combatantId: "attacker", pendingCrit: null }]);
  });

  it("IMMUNE: crit target: no confirmation, immune flag", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = contextFromEffectString(baseFields("target"), "IMMUNE: crit");

    assert.equal(isImmuneToCrit(target), true);

    const result = resolveCriticalConfirm({
      attacker,
      target,
      line: longsword,
      face: 20,
      pendingCrit: { multiplier: 2, threatFace: 19, attackName: "Longsword" },
    });

    assert.equal(result.payload.immuneToCrit, true);
    assert.equal(result.payload.confirmed, false);
    assert.deepEqual(result.patches, [{ combatantId: "attacker", pendingCrit: null }]);
  });

  it("1d8+4 x2 with DMG: 1d6 fire extra: 2d8+8 plus 1d6 once", () => {
    const { components } = parseEffect("Flaming; DMG: 1d6 fire");
    const dmgComponent = components.find((c) => c.tag === "DMG");
    assert.ok(dmgComponent);

    const scaled = scaleCriticalDamage({
      baseDice: "1d8",
      baseModifier: 4,
      multiplier: 2,
      extraComponents: [dmgComponent!],
    });

    assert.equal(scaled.scaledDice, "2d8");
    assert.equal(scaled.scaledModifier, 8);
    assert.equal(scaled.extraDice.length, 1);
    assert.equal(scaled.extraDice[0]!.dice, "1d6");
    assert.deepEqual(scaled.extraDice[0]!.types, ["fire"]);
  });
});
