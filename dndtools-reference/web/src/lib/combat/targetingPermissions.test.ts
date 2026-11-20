import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTargetingSource } from "./validation";

describe("Targeting permissions and source resolution", () => {
  const combatants = [
    { id: "c1" },
    { id: "c2" },
    { id: "c3" },
  ];

  describe("DM targeting", () => {
    it("DM targets from selected token when one is selected", () => {
      const perm = resolveTargetingSource(
        true,
        "c2",
        "c3",
        [],
        combatants,
      );
      assert.ok(perm.canTarget);
      assert.equal(perm.sourceCombatantId, "c3");
    });

    it("DM targets from current turn actor when no token selected", () => {
      const perm = resolveTargetingSource(
        true,
        "c2",
        null,
        [],
        combatants,
      );
      assert.ok(perm.canTarget);
      assert.equal(perm.sourceCombatantId, "c2");
    });

    it("DM targets from first combatant when no turn and no selection", () => {
      const perm = resolveTargetingSource(
        true,
        null,
        null,
        [],
        combatants,
      );
      assert.ok(perm.canTarget);
      assert.equal(perm.sourceCombatantId, "c1");
    });

    it("DM cannot target when no combatants exist", () => {
      const perm = resolveTargetingSource(
        true,
        null,
        null,
        [],
        [],
      );
      assert.ok(!perm.canTarget);
      assert.equal(perm.reason, "No combatants in combat");
    });
  });

  describe("Player targeting", () => {
    it("Player targets from their own PC", () => {
      const perm = resolveTargetingSource(
        false,
        "c1",
        null,
        ["c2"],
        combatants,
      );
      assert.ok(perm.canTarget);
      assert.equal(perm.sourceCombatantId, "c2");
    });

    it("Player targets from own PC regardless of whose turn it is", () => {
      const perm = resolveTargetingSource(
        false,
        "c1",
        null,
        ["c3"],
        combatants,
      );
      assert.ok(perm.canTarget);
      assert.equal(perm.sourceCombatantId, "c3");
    });

    it("Player cannot target when they have no PC in combat", () => {
      const perm = resolveTargetingSource(
        false,
        "c1",
        null,
        [],
        combatants,
      );
      assert.ok(!perm.canTarget);
      assert.equal(perm.reason, "No PC in combat");
    });
  });
});
