import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateTreasure } from "./generate";
import { DEFAULT_HOARD_ROW, DEFAULT_TREASURE_INPUT, type TreasureInput } from "./types";

function cloneInput(overrides: Partial<TreasureInput> = {}): TreasureInput {
  return {
    ...DEFAULT_TREASURE_INPUT,
    rows: [{ ...DEFAULT_HOARD_ROW }],
    ...overrides,
    magicTypes: {
      ...DEFAULT_TREASURE_INPUT.magicTypes,
      ...overrides.magicTypes,
    },
    ranks: {
      ...DEFAULT_TREASURE_INPUT.ranks,
      ...overrides.ranks,
    },
  };
}

function hoardSignature(input: TreasureInput): string {
  const rng1 = createSeededRng(1);
  const rng2 = createSeededRng(1);
  return JSON.stringify(generateTreasure(input, rng1)) ===
    JSON.stringify(generateTreasure(input, rng2))
    ? JSON.stringify(generateTreasure(input, rng1))
    : "unstable";
}

describe("generateTreasure", () => {
  it("seed 1 level-1 standard hoard is stable", () => {
    const input = cloneInput();
    const first = hoardSignature(input);
    const second = hoardSignature(input);
    assert.equal(first, second);
    assert.notEqual(first, "unstable");
  });

  it("coins none yields zero coin gp", () => {
    const input = cloneInput({
      rows: [{ ...DEFAULT_HOARD_ROW, coins: "none" }],
    });
    const result = generateTreasure(input, createSeededRng(3));
    assert.equal(result.hoards[0]?.coins.gpTotal, 0);
    assert.equal(result.hoards[0]?.coins.display, "No coins");
  });

  it("tenth coin mode averages near one tenth of standard", () => {
    let tenthTotal = 0;
    let standardTotal = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const tenth = generateTreasure(
        cloneInput({ rows: [{ ...DEFAULT_HOARD_ROW, coins: "tenth" }] }),
        createSeededRng(seed),
      );
      const standard = generateTreasure(
        cloneInput({ rows: [{ ...DEFAULT_HOARD_ROW, coins: "standard" }] }),
        createSeededRng(seed),
      );
      tenthTotal += tenth.hoards[0]?.coins.gpTotal ?? 0;
      standardTotal += standard.hoards[0]?.coins.gpTotal ?? 0;
    }
    const ratio = tenthTotal / standardTotal;
    assert.ok(ratio > 0.075 && ratio < 0.125, `ratio ${ratio}`);
  });

  it("valuables none yields no gems or art", () => {
    const input = cloneInput({
      rows: [{ ...DEFAULT_HOARD_ROW, valuables: "none" }],
    });
    const result = generateTreasure(input, createSeededRng(10));
    assert.equal(result.hoards[0]?.gems.length, 0);
    assert.equal(result.hoards[0]?.art.length, 0);
  });

  it("disabling potions avoids potion labels", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const input = cloneInput({
        rows: [{ ...DEFAULT_HOARD_ROW, level: 5, items: "standard" }],
        magicTypes: {
          ...DEFAULT_TREASURE_INPUT.magicTypes,
          potion: false,
        },
      });
      const result = generateTreasure(input, createSeededRng(seed));
      for (const item of result.hoards[0]?.items ?? []) {
        assert.equal(item.label.toLowerCase().includes("potion"), false);
      }
    }
  });

  it("maxGp 100 caps item prices", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const input = cloneInput({
        rows: [{ ...DEFAULT_HOARD_ROW, level: 10, items: "triple" }],
        maxGp: 100,
      });
      const result = generateTreasure(input, createSeededRng(seed));
      for (const item of result.hoards[0]?.items ?? []) {
        if (item.priceGp != null) {
          assert.ok(item.priceGp <= 100);
        }
      }
    }
  });

  it("combine sums coin gp from separate rows", () => {
    const baseRows = [
      { ...DEFAULT_HOARD_ROW, level: 3 },
      { ...DEFAULT_HOARD_ROW, level: 4 },
    ];
    const seed = 99;
    const separate = generateTreasure(
      cloneInput({ rows: baseRows, combine: false }),
      createSeededRng(seed),
    );
    const combined = generateTreasure(
      cloneInput({ rows: baseRows, combine: true }),
      createSeededRng(seed),
    );
    const separateTotal = separate.hoards.reduce(
      (sum, hoard) => sum + hoard.coins.gpTotal,
      0,
    );
    assert.equal(combined.hoards.length, 1);
    assert.equal(combined.hoards[0]?.coins.gpTotal, separateTotal);
  });
});
