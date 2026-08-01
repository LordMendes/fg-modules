import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateEncounterSummary } from "./calculateEl";
import {
  combinePair,
  elForSameCrGroup,
  elOffsetForCount,
} from "./encounterNumbers";
import { calculateTargetEl, DEFAULT_PARTY_CONFIG } from "./partyConfig";
import { compareCrValues, parseCr, sortCrFilterOptions } from "./parseCr";
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

describe("compareCrValues", () => {
  it("orders integer CRs numerically, not lexicographically", () => {
    assert.ok(compareCrValues("1", "2") < 0);
    assert.ok(compareCrValues("2", "10") < 0);
    assert.ok(compareCrValues("9", "10") < 0);
    assert.ok(compareCrValues("10", "2") > 0);
  });

  it("orders fractional CRs numerically", () => {
    assert.ok(compareCrValues("1/3", "1/2") < 0);
    assert.ok(compareCrValues("0.5", "1") < 0);
  });
});

describe("sortCrFilterOptions", () => {
  it("sorts filter options in ascending CR order", () => {
    const sorted = sortCrFilterOptions([
      { value: "10", label: "10" },
      { value: "1", label: "1" },
      { value: "1/2", label: "1/2" },
      { value: "2", label: "2" },
    ]);
    assert.deepEqual(
      sorted.map((opt) => opt.value),
      ["1/2", "1", "2", "10"],
    );
  });
});

describe("xpForCR", () => {
  it("returns known XP values", () => {
    assert.equal(xpForCR(5), 1800);
    assert.equal(xpForCR(7), 3600);
    assert.equal(xpForCR(0.333), 135);
  });
});

describe("encounterNumbers", () => {
  it("returns Table 3-1 count offsets", () => {
    assert.equal(elOffsetForCount(1), 0);
    assert.equal(elOffsetForCount(2), 2);
    assert.equal(elOffsetForCount(4), 4);
    assert.equal(elOffsetForCount(7), 6);
  });

  it("computes same-CR group EL", () => {
    assert.equal(elForSameCrGroup(5, 1), 5);
    assert.equal(elForSameCrGroup(5, 2), 7);
    assert.equal(elForSameCrGroup(2, 4), 6);
    assert.equal(elForSameCrGroup(1 / 3, 4), 1 / 3 + 4);
  });

  it("combines mixed pairs per DMG approximation", () => {
    assert.equal(combinePair(7, 5), 8);
    assert.equal(combinePair(10, 7), 12);
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

  it("returns EL 8 for CR 7 plus CR 5", () => {
    const summary = calculateEncounterSummary([
      entry("aboleth", "7", 1),
      entry("troll", "5", 1),
    ]);
    assert.equal(summary.el, 8);
  });

  it("handles fractional CR mob with Table 3-1 EL", () => {
    const summary = calculateEncounterSummary([entry("goblin", "1/3", 4)]);
    assert.equal(summary.totalXpPerPc, 135 * 4);
    assert.equal(summary.creatureCount, 4);
    assert.equal(summary.el, 1 / 3 + 4);
  });

  it("returns EL 6 for four CR 2 ogres", () => {
    const summary = calculateEncounterSummary([entry("ogre", "2", 4)]);
    assert.equal(summary.el, 6);
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

  it("computes target EL and delta from party config", () => {
    const summary = calculateEncounterSummary([entry("troll", "5", 2)], {
      partySize: 4,
      partyLevel: 5,
      difficulty: "medium",
    });
    assert.equal(summary.targetEl, 5);
    assert.equal(summary.elDelta, 2);
  });
});

describe("calculateTargetEl", () => {
  it("applies difficulty and party size adjustments", () => {
    assert.equal(
      calculateTargetEl({
        partySize: 4,
        partyLevel: 6,
        difficulty: "medium",
      }),
      6,
    );
    assert.equal(
      calculateTargetEl({
        partySize: 4,
        partyLevel: 6,
        difficulty: "hard",
      }),
      8,
    );
    assert.equal(
      calculateTargetEl({
        partySize: 6,
        partyLevel: 5,
        difficulty: "medium",
      }),
      7,
    );
  });

  it("uses defaults for medium at level 5", () => {
    assert.equal(calculateTargetEl(DEFAULT_PARTY_CONFIG), 5);
  });
});

describe("elFromTotalXp", () => {
  it("maps 3600 XP to EL 7", () => {
    assert.equal(elFromTotalXp(3600), 7);
  });

  it("floors to highest EL with XP less than or equal to total", () => {
    assert.equal(elFromTotalXp(3500), 6);
    assert.equal(elFromTotalXp(3600), 7);
    assert.equal(elFromTotalXp(2700), 6);
  });
});
