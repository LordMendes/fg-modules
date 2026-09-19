import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDefensesText } from "./parseDefenses";

describe("converters/parseDefenses", () => {
  it("parses DR 10/magic", () => {
    assert.deepEqual(parseDefensesText("DR 10/magic"), {
      dr: [{ amount: 10, bypass: ["magic"] }],
    });
  });

  it("parses DR 15/adamantine or silver", () => {
    assert.deepEqual(parseDefensesText("DR 15/adamantine or silver"), {
      dr: [{ amount: 15, bypass: ["adamantine", "silver"] }],
    });
  });

  it("parses resistance to fire 10, cold 5", () => {
    assert.deepEqual(parseDefensesText("resistance to fire 10, cold 5"), {
      resist: { fire: 10, cold: 5 },
    });
  });

  it("parses immunity to fire and poison", () => {
    assert.deepEqual(parseDefensesText("immunity to fire and poison"), {
      immune: ["fire"],
    });
  });

  it("parses SR 18", () => {
    assert.deepEqual(parseDefensesText("SR 18"), {
      sr: 18,
    });
  });

  it("parses regeneration 5 (fire, acid)", () => {
    assert.deepEqual(parseDefensesText("regeneration 5 (fire, acid)"), {
      regen: { amount: 5, bypass: ["fire", "acid"] },
    });
  });

  it("parses fast healing 3", () => {
    assert.deepEqual(parseDefensesText("fast healing 3"), {
      fastHeal: 3,
    });
  });
});
