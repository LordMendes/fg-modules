import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateInn, priceToCp, rerollInnSection } from "@/lib/inn";
import { ADVENTURER_CLASS_WORDS } from "@/lib/inn/tables";

function maxMenuCp(
  dishes: { priceCp: number }[],
  drinks: { priceCp: number }[],
): number {
  return Math.max(
    0,
    ...dishes.map((d) => d.priceCp),
    ...drinks.map((d) => d.priceCp),
  );
}

describe("inn menu prices", () => {
  it("poor menu prices are at most 4 cp", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const inn = generateInn({
        seed,
        quality: "poor",
        patrons: "townsfolk",
      });
      assert.ok(
        maxMenuCp(inn.dishes, inn.drinks) <= 4,
        `seed ${seed} exceeded poor band`,
      );
    }
  });

  it("good menu includes at least one price in sp", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const inn = generateInn({
        seed,
        quality: "good",
        patrons: "adventurers",
      });
      const allPrices = [...inn.dishes, ...inn.drinks].map((row) => row.price);
      assert.ok(
        allPrices.some((price) => price.endsWith(" sp")),
        `seed ${seed} had no sp prices`,
      );
    }
  });

  it("priceToCp converts sp to cp", () => {
    assert.equal(priceToCp("3 sp"), 30);
    assert.equal(priceToCp("4 cp"), 4);
  });
});

describe("inn patrons", () => {
  it("adventurer patrons mention a class word", () => {
    const inn = generateInn({
      seed: 7,
      quality: "common",
      patrons: "adventurers",
    });
    for (const line of inn.patrons) {
      assert.ok(
        ADVENTURER_CLASS_WORDS.some((word) => line.includes(word)),
        `missing class word in: ${line}`,
      );
    }
  });

  it("townsfolk patrons do not mention wizard", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const inn = generateInn({
        seed,
        quality: "common",
        patrons: "townsfolk",
      });
      for (const line of inn.patrons) {
        assert.ok(!line.toLowerCase().includes("wizard"), line);
      }
    }
  });
});

describe("inn rumors", () => {
  it("marks exactly one rumor unreliable", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const inn = generateInn({
        seed,
        quality: "common",
        patrons: "townsfolk",
      });
      const unreliable = inn.rumors.filter((r) => r.unreliable);
      assert.equal(unreliable.length, 1, `seed ${seed}`);
    }
  });
});

describe("inn section rerolls", () => {
  it("rerolling menu does not change keeper for the same base seed", () => {
    const input = { seed: 42, quality: "common" as const, patrons: "townsfolk" as const };
    const first = generateInn(input);
    const next = rerollInnSection("menu", input, first, 1);
    assert.equal(first.keeper, next.keeper);
  });
});
