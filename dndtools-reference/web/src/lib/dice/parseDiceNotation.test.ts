import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDiceNotation } from "./parseDiceNotation";
import { actorDisplayName, formatRollSummary } from "./notation";
import type { RollResult } from "./types";

describe("parseDiceNotation", () => {
  it("parses mixed pools and modifiers", () => {
    assert.deepEqual(parseDiceNotation("8d6"), {
      dice: [{ qty: 8, sides: 6 }],
      modifier: 0,
    });
    assert.deepEqual(parseDiceNotation("1d8+5"), {
      dice: [{ qty: 1, sides: 8 }],
      modifier: 5,
    });
    assert.deepEqual(parseDiceNotation("3d6+1d8+2 fire"), {
      dice: [
        { qty: 3, sides: 6 },
        { qty: 1, sides: 8 },
      ],
      modifier: 2,
    });
  });

  it("returns null for non-dice text", () => {
    assert.equal(parseDiceNotation("see text"), null);
    assert.equal(parseDiceNotation(""), null);
  });
});

describe("formatRollSummary with actor and kind", () => {
  it("includes who and kind", () => {
    const result: RollResult = {
      id: "1",
      label: "Fortitude",
      faces: [14],
      faceSum: 14,
      modifier: 4,
      total: 18,
      natural20: false,
      natural1: false,
      at: Date.now(),
      kind: "save",
      actor: { userId: "u1", username: "bob", characterName: "Boromir" },
    };
    assert.equal(actorDisplayName(result.actor), "Boromir");
    assert.match(formatRollSummary(result), /Boromir/);
    assert.match(formatRollSummary(result), /Save/);
    assert.match(formatRollSummary(result), /Fortitude/);
  });

  it("marks hidden rolls", () => {
    const result: RollResult = {
      id: "2",
      label: "Stealth",
      faces: [12],
      faceSum: 12,
      modifier: 7,
      total: 19,
      natural20: false,
      natural1: false,
      at: Date.now(),
      kind: "skill",
      hidden: true,
      actor: { userId: "u1", username: "bob", characterName: null },
    };
    assert.match(formatRollSummary(result), /\[hidden\]/);
  });
});
