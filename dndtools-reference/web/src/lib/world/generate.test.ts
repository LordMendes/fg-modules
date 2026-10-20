import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateWorld, riverStepsValid } from "./generate";
import { hexDistance, WORLD_COLS, WORLD_ROWS } from "./hex";
import type { WorldInput } from "./types";
import { DEFAULT_WORLD_INPUT } from "./types";

const totalCells = WORLD_COLS * WORLD_ROWS;

function baseInput(overrides: Partial<WorldInput> = {}): WorldInput {
  return { ...DEFAULT_WORLD_INPUT, ...overrides };
}

describe("world generator", () => {
  it("targets about 60% sea on seed 1", () => {
    const result = generateWorld(
      baseInput({ water: 60 }),
      createSeededRng(1),
      1,
    );
    const ratio = result.seaCount / totalCells;
    assert.ok(ratio >= 0.5 && ratio <= 0.7, `sea ratio ${ratio}`);
  });

  it("never marks ice as sea", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = generateWorld(
        baseInput({ ice: 15 }),
        createSeededRng(seed),
        seed,
      );
      assert.ok(result.iceCount >= 0);
      for (const cell of result.cells) {
        if (cell.terrain === "ice") {
          assert.ok(cell.terrain !== "sea");
        }
        if (cell.terrain === "sea") {
          assert.ok(cell.terrain !== "ice");
        }
      }
    }
  });

  it("keeps river steps on land until the sea", () => {
    const terrain = generateWorld(
      baseInput({ rivers: "many" }),
      createSeededRng(99),
      99,
    );
    const terrainMap = terrain.cells.map((c) => c.terrain);
    for (const river of terrain.rivers) {
      assert.ok(riverStepsValid(river, terrainMap));
    }
  });

  it("places cities at least 3 hexes apart", () => {
    const result = generateWorld(
      baseInput({ cities: "many" }),
      createSeededRng(7),
      7,
    );
    const sites = result.settlements;
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        const d = hexDistance(sites[i]!, sites[j]!);
        assert.ok(d >= 3, `distance ${d}`);
      }
    }
  });

  it("returns no settlements when cities is none", () => {
    const result = generateWorld(
      baseInput({ cities: "none" }),
      createSeededRng(3),
      3,
    );
    assert.equal(result.settlements.length, 0);
  });

  it("is stable for the same seed and inputs", () => {
    const input = baseInput({ name: "Test Realm" });
    const a = generateWorld(input, createSeededRng(42), 42);
    const b = generateWorld(input, createSeededRng(42), 42);
    assert.equal(a.svg, b.svg);
    assert.equal(a.seaCount, b.seaCount);
  });
});
