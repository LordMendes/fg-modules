import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEffect } from "../effects/parseEffect";
import { buildEngineContext, contextFromEffectString } from "./engineContext";
import { resolveAttack } from "./attack";

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

function ctxWithEffects(id: string, ...effectStrings: string[]) {
  return contextFromEffectString(baseFields(id), ...effectStrings);
}

const scimitar = { name: "Scimitar", bonus: 9, mode: "melee" as const };

describe("rules/attack (90-testing.md)", () => {
  it("face 20 vs AC 40: hit, autoHit", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext({ ...baseFields("target"), ac: 40, acTouch: 40, acFlat: 40 });

    const result = resolveAttack({ attacker, target, line: scimitar, face: 20 });
    assert.equal(result.payload.hit, true);
    assert.equal(result.payload.autoHit, true);
    assert.equal(result.payload.autoMiss, false);
  });

  it("face 1 vs AC 5: miss, autoMiss", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext({ ...baseFields("target"), ac: 5, acTouch: 5, acFlat: 5 });

    const result = resolveAttack({ attacker, target, line: scimitar, face: 1 });
    assert.equal(result.payload.hit, false);
    assert.equal(result.payload.autoMiss, true);
    assert.equal(result.payload.autoHit, false);
  });

  it("+9 face 8 vs AC 17: 17 hits (equal)", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext(baseFields("target"));

    const result = resolveAttack({ attacker, target, line: scimitar, face: 8 });
    assert.equal(result.payload.total, 17);
    assert.equal(result.payload.acValue, 17);
    assert.equal(result.payload.hit, true);
  });

  it("mtouch vs ac 20 / touch 12: uses 12", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext({ ...baseFields("target"), ac: 20, acTouch: 12, acFlat: 10 });

    const result = resolveAttack({
      attacker,
      target,
      line: { name: "Ray", bonus: 5, mode: "ranged", attackType: "mtouch" },
      face: 10,
    });

    assert.equal(result.payload.acType, "touch");
    assert.equal(result.payload.acValue, 12);
  });

  it("target Flat-footed: uses acFlat", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = contextFromEffectString(
      { ...baseFields("target"), ac: 20, acTouch: 15, acFlat: 10 },
      "Flat-footed",
    );

    const result = resolveAttack({ attacker, target, line: scimitar, face: 10 });
    assert.equal(result.payload.acType, "flat");
    assert.equal(result.payload.acValue, 10);
  });

  it("target Prone, melee: +4; ranged -4", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const proneTarget = contextFromEffectString(baseFields("target"), "Prone");

    const melee = resolveAttack({
      attacker,
      target: proneTarget,
      line: { name: "Sword", bonus: 5, mode: "melee" },
      face: 10,
    });
    const meleeMod = melee.payload.modifiers.find((m) => m.label.includes("Prone target"));
    assert.ok(meleeMod);
    assert.equal(meleeMod!.value, 4);
    assert.equal(melee.payload.total, 19);

    const ranged = resolveAttack({
      attacker,
      target: proneTarget,
      line: { name: "Bow", bonus: 5, mode: "ranged" },
      face: 10,
    });
    const rangedMod = ranged.payload.modifiers.find((m) => m.label.includes("Prone target"));
    assert.ok(rangedMod);
    assert.equal(rangedMod!.value, -4);
    assert.equal(ranged.payload.total, 11);
  });

  it("attacker Shaken: -2 in modifiers with label", () => {
    const attacker = contextFromEffectString(baseFields("attacker"), "Shaken");
    const target = buildEngineContext(baseFields("target"));

    const result = resolveAttack({
      attacker,
      target,
      line: { name: "Sword", bonus: 5, mode: "melee" },
      face: 10,
    });

    const shaken = result.payload.modifiers.find((m) => m.label === "Shaken");
    assert.ok(shaken);
    assert.equal(shaken!.value, -2);
  });

  it("ATK: 1 morale on attacker, Bless label: +1, tooltip names Bless", () => {
    const attacker = ctxWithEffects("attacker", "Bless; ATK: 1 morale");
    const target = buildEngineContext(baseFields("target"));

    const result = resolveAttack({
      attacker,
      target,
      line: { name: "Sword", bonus: 5, mode: "melee" },
      face: 10,
    });

    const bless = result.payload.modifiers.find((m) => m.label === "Bless (morale)");
    assert.ok(bless);
    assert.equal(bless!.value, 1);
    assert.equal(result.payload.total, 16);
  });

  it("AC: 4 armor on target: AC raised", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = ctxWithEffects("target", "Mage Armor; AC: 4 armor");

    const result = resolveAttack({
      attacker,
      target,
      line: { name: "Sword", bonus: 5, mode: "melee" },
      face: 10,
    });

    assert.equal(result.payload.acValue, 21);
  });

  it("target CONC, d% 15: miss by concealment; d% 25 -> normal resolution", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = ctxWithEffects("target", "Blur; CONC");

    const miss = resolveAttack({
      attacker,
      target,
      line: scimitar,
      face: 20,
      concealmentFace: 15,
    });
    assert.equal(miss.payload.concealmentRoll?.missed, true);
    assert.equal(miss.payload.hit, false);

    const hit = resolveAttack({
      attacker,
      target,
      line: scimitar,
      face: 20,
      concealmentFace: 25,
    });
    assert.equal(hit.payload.concealmentRoll?.missed, false);
    assert.equal(hit.payload.hit, true);
  });

  it("threatMin 19, face 19 hit: threat true; face 19 miss (low total): threat false", () => {
    const attacker = buildEngineContext(baseFields("attacker"));
    const target = buildEngineContext(baseFields("target"));
    const line = { name: "Rapier", bonus: 9, mode: "melee" as const, threatMin: 19 };

    const threatHit = resolveAttack({ attacker, target, line, face: 19 });
    assert.equal(threatHit.payload.hit, true);
    assert.equal(threatHit.payload.threat, true);
    assert.ok(threatHit.patches.some((p) => p.pendingCrit));

    const threatMiss = resolveAttack({
      attacker,
      target: buildEngineContext(baseFields("target")),
      line: { ...line, bonus: -5 },
      face: 19,
    });
    assert.equal(threatMiss.payload.hit, false);
    assert.equal(threatMiss.payload.threat, false);
  });
});
