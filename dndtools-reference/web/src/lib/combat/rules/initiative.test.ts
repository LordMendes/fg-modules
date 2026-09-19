import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEngineContext } from "./engineContext";
import {
  actNow,
  computeStoredInit,
  delayCombatant,
  readyCombatant,
  rollInitiative,
  sortByInitiative,
} from "./initiative";

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

describe("rules/initiative (90-testing.md)", () => {
  it("faces 15 and 15, mods +3 and +1: order +3 first; stored 18.03 and 16.01", () => {
    const ctxA = buildEngineContext({ ...baseFields("a"), initMod: 3 });
    const ctxB = buildEngineContext({ ...baseFields("b"), initMod: 1 });

    const rollA = rollInitiative(ctxA, 15, 3);
    const rollB = rollInitiative(ctxB, 15, 1);

    assert.equal(rollA.payload.storedInit, 18.03);
    assert.equal(rollB.payload.storedInit, 16.01);

    const ordered = sortByInitiative([
      { id: "a", init: rollA.payload.storedInit, initMod: 3, turnState: "normal" },
      { id: "b", init: rollB.payload.storedInit, initMod: 1, turnState: "normal" },
    ]);

    assert.deepEqual(ordered.map((c) => c.id), ["a", "b"]);
  });

  it("computeStoredInit matches FG tiebreak formula", () => {
    assert.equal(computeStoredInit(15, 3, 0), 18.03);
    assert.equal(computeStoredInit(15, 1, 0), 16.01);
  });

  it("ready sets readied turn state", () => {
    assert.deepEqual(readyCombatant("readied-id"), [
      { combatantId: "readied-id", turnState: "readied" },
    ]);
  });

  it("delay then act now before actor at 12: init 11.99, normal state", () => {
    const delayPatches = delayCombatant("delayed-id");
    assert.deepEqual(delayPatches, [{ combatantId: "delayed-id", turnState: "delayed" }]);

    const act = actNow("delayed-id", 12);
    assert.equal(act.payload.init, 11.99);
    assert.equal(act.payload.turnState, "normal");
    assert.deepEqual(act.patches, [
      { combatantId: "delayed-id", init: 11.99, turnState: "normal" },
    ]);
  });
});
