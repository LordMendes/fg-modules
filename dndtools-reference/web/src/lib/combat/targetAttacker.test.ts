import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTargetAttacker } from "./targetAttacker";

const ids = ["wizard", "goblin", "fighter"];

describe("resolveTargetAttacker", () => {
  it("DM targets from the requested combatant, including a foe", () => {
    const result = resolveTargetAttacker({
      isDm: true,
      requestedAttackerId: "goblin",
      currentCombatantId: "wizard",
      combatantIds: ids,
      ownedCombatantId: null,
    });
    assert.deepEqual(result, { ok: true, attackerId: "goblin" });
  });

  it("DM without a request uses the current turn, then the first combatant", () => {
    assert.deepEqual(
      resolveTargetAttacker({
        isDm: true,
        currentCombatantId: null,
        combatantIds: ids,
        ownedCombatantId: null,
      }),
      { ok: true, attackerId: "wizard" },
    );
  });

  it("player can target from their own PC only", () => {
    assert.deepEqual(
      resolveTargetAttacker({
        isDm: false,
        requestedAttackerId: "fighter",
        currentCombatantId: "goblin",
        combatantIds: ids,
        ownedCombatantId: "fighter",
      }),
      { ok: true, attackerId: "fighter" },
    );
    const rejected = resolveTargetAttacker({
      isDm: false,
      requestedAttackerId: "goblin",
      currentCombatantId: "goblin",
      combatantIds: ids,
      ownedCombatantId: "fighter",
    });
    assert.equal(rejected.ok, false);
  });
});
