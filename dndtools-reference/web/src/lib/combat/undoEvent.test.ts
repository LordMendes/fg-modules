import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canUndoEvent } from "./undoEvent";

describe("canUndoEvent", () => {
  const baseEvents = [
    {
      id: "e1",
      kind: "damage" as const,
      targetCombatantId: "t1",
      revertedAt: null,
      seq: 1,
    },
    {
      id: "e2",
      kind: "damage" as const,
      targetCombatantId: "t1",
      revertedAt: null,
      seq: 2,
    },
  ];

  it("allows undo on most recent damage", () => {
    const result = canUndoEvent(
      { id: "e2", kind: "damage", targetCombatantId: "t1", reverted: false },
      baseEvents,
    );
    assert.equal(result.ok, true);
  });

  it("refuses undo on older damage", () => {
    const result = canUndoEvent(
      { id: "e1", kind: "damage", targetCombatantId: "t1", reverted: false },
      baseEvents,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /most recent/i);
    }
  });
});
