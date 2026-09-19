import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averagePartyLevel,
  computeDefeatedNpcXpRows,
  scaleXpForPartySize,
  sumSelectedXp,
} from "./combatXp";

describe("combatXp", () => {
  it("scales XP for party size", () => {
    assert.equal(scaleXpForPartySize(300, 4), 300);
    assert.equal(scaleXpForPartySize(300, 2), 600);
  });

  it("computes defeated NPC xp rows", () => {
    const rows = computeDefeatedNpcXpRows(
      [
        {
          id: "a",
          name: "Goblin",
          deathState: "dead",
          turnState: "normal",
          snapshot: { challengeRating: "1/3" },
        },
      ],
      4,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.xpPerPc, 135);
  });

  it("sums selected xp only", () => {
    const total = sumSelectedXp([
      { combatantId: "a", name: "A", cr: 1, crLabel: "1", xpPerPc: 100, selected: true },
      { combatantId: "b", name: "B", cr: 1, crLabel: "1", xpPerPc: 50, selected: false },
    ]);
    assert.equal(total, 100);
  });

  it("averages party level from sheets", () => {
    const level = averagePartyLevel([
      {
        state: {
          identity: { classLevels: [{ slug: "a", name: "A", level: 4 }] },
        },
      },
      {
        state: {
          identity: { classLevels: [{ slug: "b", name: "B", level: 6 }] },
        },
      },
    ]);
    assert.equal(level, 5);
  });
});
