import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEffect } from "../effects/parseEffect";
import type { DamageEventPayload } from "../events/types";
import {
  nextActor,
  turnEnd,
  turnStart,
  type RegenEventPayload,
  type TurnActor,
  type TurnEffect,
} from "./turn";

function effectFromString(id: string, input: string): TurnEffect {
  const { components } = parseEffect(input);
  return {
    id,
    label: input.split(";")[0]?.trim() ?? input,
    components,
    active: true,
    duration: null,
    durationUnit: "round",
    tickInit: null,
    expiry: "startOfTurn",
  };
}

function baseActor(overrides: Partial<TurnActor> = {}): TurnActor {
  return {
    id: "actor-1",
    name: "Actor",
    init: 15,
    hpMax: 10,
    wounds: 0,
    hpTemp: 0,
    nonlethal: 0,
    defenses: {},
    effects: [],
    ...overrides,
  };
}

describe("rules/turn (90-testing.md)", () => {
  it("REGEN 5 at turn start heals 5 wounds and emits regen event", () => {
    const actor = baseActor({
      wounds: 8,
      effects: [effectFromString("regen-1", "Troll; REGEN: 5 fire acid")],
    });

    const result = turnStart(actor);

    assert.equal(result.patches[0]?.wounds, 3);
    const regenEvent = result.events.find((event) => event.kind === "regen");
    assert.ok(regenEvent);
    const payload = regenEvent.payload as RegenEventPayload;
    assert.equal(payload.amount, 5);
    assert.equal(payload.woundsBefore, 8);
    assert.equal(payload.woundsAfter, 3);
    assert.equal(payload.kind, "regen");
  });

  it("DMGO 1d6 fire with face 4 deals 4 fire damage at turn start", () => {
    const actor = baseActor({
      wounds: 0,
      effects: [effectFromString("dmgo-1", "Burning; DMGO: 1d6 fire")],
    });

    const result = turnStart(actor, { dmgoFaces: [4] });

    assert.equal(result.patches[0]?.wounds, 4);
    const damageEvent = result.events.find((event) => event.kind === "damage");
    assert.ok(damageEvent);
    const payload = damageEvent.payload as DamageEventPayload;
    assert.equal(payload.applied, 4);
    assert.deepEqual(payload.packets[0]?.types, ["fire"]);
    assert.equal(payload.packets[0]?.amount, 4);
  });

  it("dying actor at turn start loses 1 hp and emits dying note", () => {
    const actor = baseActor({
      wounds: 13,
      deathState: "dying",
    });

    const result = turnStart(actor);

    assert.equal(result.patches[0]?.wounds, 14);
    const noteEvent = result.events.find((event) => event.kind === "note");
    assert.ok(noteEvent);
    assert.equal((noteEvent.payload as { text: string }).text, "[DYING] -1");
  });

  it("next actor skips dead and increments round on wrap", () => {
    const combatants = [
      { id: "a", init: 20, initMod: 0, turnState: "normal" as const },
      { id: "b", init: 15, initMod: 0, turnState: "normal" as const },
      { id: "c", init: 10, initMod: 0, turnState: "dead" as const },
    ];

    assert.deepEqual(nextActor(combatants, "a"), {
      nextId: "b",
      roundIncrement: false,
    });

    assert.deepEqual(nextActor(combatants, "b"), {
      nextId: "a",
      roundIncrement: true,
    });

    const withRemoved = [
      ...combatants,
      { id: "d", init: 5, initMod: 0, turnState: "removed" as const },
    ];
    assert.deepEqual(nextActor(withRemoved, "b"), {
      nextId: "a",
      roundIncrement: true,
    });
  });

  it("turnEnd clears pending targets and crit", () => {
    const actor = baseActor({
      pendingTargetIds: ["target-1"],
      pendingCrit: { multiplier: 2, threatFace: 19, attackName: "Longsword" },
    });

    const result = turnEnd(actor);

    assert.deepEqual(result.patches, [
      {
        combatantId: "actor-1",
        pendingTargetIds: [],
        pendingCrit: null,
      },
    ]);
    assert.ok(result.events.some((event) => event.kind === "turnEnd"));
  });
});
