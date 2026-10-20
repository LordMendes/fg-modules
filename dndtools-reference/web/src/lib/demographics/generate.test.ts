import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  buildRacialMix,
  computeGpLimit,
  computeKingdomPopulation,
  computeReadyCash,
  rollClassHighestLevel,
  splitCastleWilderness,
  walkClassLevelsForTest,
} from "./index";

describe("demographics kingdom population", () => {
  it("computes population from area and density", () => {
    assert.equal(computeKingdomPopulation(100, "average"), 8000);
  });
});

describe("demographics town wealth", () => {
  it("looks up gp limit by population", () => {
    assert.equal(computeGpLimit(50), 40);
    assert.equal(computeGpLimit(30000), 100000);
  });

  it("computes ready cash for a thorp", () => {
    assert.equal(computeReadyCash(40), 80);
  });
});

describe("demographics racial mix", () => {
  it("isolated human primary assigns 96 2 1", () => {
    const lines = buildRacialMix("isolated", "Human");
    assert.equal(lines[0]?.race, "Human");
    assert.equal(lines[0]?.percent, 96);
    assert.equal(lines[1]?.race, "Halfling");
    assert.equal(lines[1]?.percent, 2);
    assert.equal(lines[2]?.race, "Elf");
    assert.equal(lines[2]?.percent, 1);
  });
});

describe("demographics class walk", () => {
  it("places halved levels without skipping intermediate slots incorrectly", () => {
    const highest = rollClassHighestLevel(1, 4, 1, 0, () => 4);
    assert.equal(highest, 4);
    const levels = walkClassLevelsForTest(1000, highest);
    assert.equal(levels[4], 1);
    assert.equal(levels[2], 2);
    assert.equal(levels[3], undefined);
  });
});

describe("demographics castles", () => {
  it("never assigns more wilderness castles than active total", () => {
    const rng = createSeededRng(4242);
    for (let total = 0; total <= 50; total++) {
      for (let trial = 0; trial < 20; trial++) {
        const split = splitCastleWilderness(total, rng);
        assert.ok(split.wilderness <= total);
        assert.ok(split.wilderness >= 0);
        assert.equal(split.wilderness + split.settled, total);
      }
    }
  });
});
