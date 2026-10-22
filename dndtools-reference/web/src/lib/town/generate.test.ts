import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateTown } from "@/lib/town";
import { normalizeTownTopography } from "@/lib/town/normalize";

function baseInput(
  overrides: Partial<import("@/lib/town").TownInput> = {},
): import("@/lib/town").TownInput {
  return {
    name: "",
    environment: "grassland",
    topography: "inland",
    river: false,
    size: "village",
    walled: false,
    labels: true,
    race: "any",
    culture: "default",
    ...overrides,
  };
}

describe("town generator districts", () => {
  it("village produces 3 districts", () => {
    const rng = createSeededRng(42);
    const result = generateTown(baseInput({ size: "village" }), rng);
    assert.equal(result.districtCount, 3);
    assert.equal(result.districts.length, 3);
  });

  it("metropolis produces 14 districts", () => {
    const rng = createSeededRng(99);
    const result = generateTown(baseInput({ size: "metropolis" }), rng);
    assert.equal(result.districtCount, 14);
    assert.equal(result.districts.length, 14);
  });
});

describe("town generator map features", () => {
  it("river on includes a river polyline with at least 2 points", () => {
    const rng = createSeededRng(7);
    const result = generateTown(baseInput({ river: true }), rng);
    assert.ok(result.riverGeometry);
    assert.ok(result.riverGeometry.points.length >= 2);
  });

  it("coastal layout includes a water region", () => {
    const rng = createSeededRng(3);
    const result = generateTown(
      baseInput({ topography: "coastal" }),
      rng,
    );
    assert.equal(result.effectiveTopography, "coastal");
    assert.equal(result.hasWater, true);
    assert.ok(result.svg.includes("town-gen-water"));
  });

  it("subterranean forces inland geometry even if topography is island", () => {
    assert.equal(
      normalizeTownTopography("subterranean", "island"),
      "inland",
    );
    const rng = createSeededRng(5);
    const result = generateTown(
      baseInput({ environment: "subterranean", topography: "island" }),
      rng,
    );
    assert.equal(result.effectiveTopography, "inland");
    assert.equal(result.hasWater, false);
  });

  it("labels off omits district text nodes", () => {
    const rng = createSeededRng(11);
    const result = generateTown(baseInput({ labels: false }), rng);
    assert.equal(result.labels, false);
    assert.equal(result.svgDraft.labels, false);
    assert.ok(!result.svg.includes("town-gen-district-label"));
    assert.ok(!result.svg.includes("town-gen-map-title"));
    assert.ok(result.svg.includes("<title"));
  });

  it("draws a cellular town inside a ring wall", () => {
    const rng = createSeededRng(4);
    const result = generateTown(
      baseInput({ size: "small-town", walled: true, river: true, labels: true }),
      rng,
    );
    const blocks = result.svg.match(/town-gen-block/g) ?? [];
    assert.ok(blocks.length >= 8);
    assert.ok(result.svg.includes("town-gen-terrain"));
    assert.ok(result.svg.includes("town-gen-wall"));
    assert.ok(!result.svg.includes("<circle class=\"town-gen-wall"));
    assert.ok(result.svg.includes("town-gen-tower"));
    assert.ok(result.svg.includes("town-gen-map-title"));
    assert.ok(result.profile.population.startsWith("Approximately"));
  });
});
