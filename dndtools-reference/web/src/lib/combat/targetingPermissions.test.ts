import assert from "node:assert/strict";
import { describe, it } from "node:test";

export type TargetingPermission = {
  canTarget: boolean;
  sourceCombatantId: string | null;
  reason?: string;
};

export function resolveTargetingSource(
  isDm: boolean,
  currentTurnCombatantId: string | null,
  selectedTokenCombatantId: string | null,
  ownPcCombatantIds: string[],
  allCombatants: Array<{ id: string }>,
): TargetingPermission {
  if (isDm) {
    const source = 
      selectedTokenCombatantId ?? 
      currentTurnCombatantId ?? 
      allCombatants[0]?.id ?? 
      null;
    
    if (!source) {
      return { canTarget: false, sourceCombatantId: null, reason: "No combatants in combat" };
    }
    
    return { canTarget: true, sourceCombatantId: source };
  }

  if (ownPcCombatantIds.length === 0) {
    return { canTarget: false, sourceCombatantId: null, reason: "No PC in combat" };
  }

  const source = ownPcCombatantIds[0]!;
  return { canTarget: true, sourceCombatantId: source };
}

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
