import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateTreasureMap } from "@/lib/treasure-map";

describe("treasure map generator", () => {
  it("places left-to-right markers with increasing base x", () => {
    const rng = createSeededRng(42);
    const result = generateTreasureMap(
      { seed: 42, markerCount: 5, layout: "left-to-right" },
      rng,
    );
    for (let i = 0; i < result.markers.length - 1; i++) {
      assert.ok(
        result.markers[i + 1]!.baseX > result.markers[i]!.baseX,
        `baseX should increase at index ${i}`,
      );
    }
  });

  it("uses a marker count of 4, 5, or 6", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createSeededRng(seed);
      const result = generateTreasureMap(
        { seed, markerCount: "random", layout: "random" },
        rng,
      );
      assert.ok(result.markerCount >= 4 && result.markerCount <= 6);
      assert.equal(result.markers.length, result.markerCount);
    }
  });

  it("marks the hoard within the marker list", () => {
    const rng = createSeededRng(7);
    const result = generateTreasureMap(
      { seed: 7, markerCount: 6, layout: "top-to-bottom" },
      rng,
    );
    assert.ok(result.hoardIndex >= 0);
    assert.ok(result.hoardIndex < result.markers.length);
    assert.equal(result.markers[result.hoardIndex]?.isHoard, true);
  });

  it("returns the same place names for the same seed", () => {
    const input = { seed: 999, markerCount: 5 as const, layout: "right-to-left" as const };
    const a = generateTreasureMap(input, createSeededRng(999));
    const b = generateTreasureMap(input, createSeededRng(999));
    assert.deepEqual(
      a.markers.map((m) => m.name),
      b.markers.map((m) => m.name),
    );
  });
});
