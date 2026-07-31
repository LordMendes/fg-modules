import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateEncounterSummary } from "./calculateEl";
import { parseCr } from "./parseCr";
import { elFromTotalXp, xpForCR } from "./xpTable";
import type { EncounterEntry } from "./types";

describe("parseCr", () => {
  it("parses fractional CR strings", () => {
    assert.equal(parseCr("1/3"), 1 / 3);
    assert.equal(parseCr("1/2"), 0.5);
    assert.equal(parseCr("10"), 10);
  });

  it("returns null for invalid CR", () => {
    assert.equal(parseCr("—"), null);
    assert.equal(parseCr(""), null);
    assert.equal(parseCr(null), null);
  });
});

describe("xpForCR", () => {
  it("returns known XP values", () => {
    assert.equal(xpForCR(5), 1800);
    assert.equal(xpForCR(7), 3600);
    assert.equal(xpForCR(0.333), 135);
  });
});

describe("calculateEncounterSummary", () => {
  function entry(
    slug: string,
    cr: string,
    count: number,
  ): EncounterEntry {
    return { slug, name: slug, cr, count };
  }

  it("returns EL 5 for single CR 5 creature", () => {
    const summary = calculateEncounterSummary([entry("troll", "5", 1)]);
    assert.equal(summary.el, 5);
    assert.equal(summary.totalXpPerPc, 1800);
    assert.equal(summary.creatureCount, 1);
  });

  it("returns EL 7 for two CR 5 creatures", () => {
    const summary = calculateEncounterSummary([entry("troll", "5", 2)]);
    assert.equal(summary.totalXpPerPc, 3600);
    assert.equal(summary.el, 7);
  });

  it("handles mixed CR encounters", () => {
    const summary = calculateEncounterSummary([
      entry("dragon", "10", 1),
      entry("troll", "5", 2),
    ]);
    assert.equal(summary.totalXpPerPc, 5400 + 3600);
    assert.equal(summary.el, 12);
  });

  it("handles fractional CR", () => {
    const summary = calculateEncounterSummary([entry("goblin", "1/3", 4)]);
    assert.equal(summary.totalXpPerPc, 135 * 4);
    assert.equal(summary.creatureCount, 4);
  });

  it("counts invalid CR separately", () => {
    const summary = calculateEncounterSummary([
      entry("unknown", "—", 2),
      entry("goblin", "1/3", 1),
    ]);
    assert.equal(summary.invalidCrCount, 2);
    assert.equal(summary.totalXpPerPc, 135);
  });

  it("returns null EL for empty encounter", () => {
    const summary = calculateEncounterSummary([]);
    assert.equal(summary.el, null);
    assert.equal(summary.creatureCount, 0);
  });
});

describe("elFromTotalXp", () => {
  it("maps 3600 XP to EL 7", () => {
    assert.equal(elFromTotalXp(3600), 7);
  });
});
