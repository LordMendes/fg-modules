import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  catalogIdForAncestry,
  genderFromHint,
  rollRandomCharacterName,
} from "./ancestry";
import { generateBuiltinNames, generateNames } from "./generate";
import { markovOutputUsesTrainingPairs, trainMarkovModel } from "./markov";

const MARKOV_FIXTURE = [
  "korath",
  "melira",
  "torvin",
  "selara",
  "branth",
  "ulvok",
  "jarek",
  "nysara",
];

describe("generateBuiltinNames", () => {
  it("same seed and catalog returns the same 10 names", () => {
    const input = { catalogId: "human-male", count: 10, seed: 42 };
    const a = generateBuiltinNames(input, createSeededRng(input.seed));
    const b = generateBuiltinNames(input, createSeededRng(input.seed));
    assert.deepEqual(a, b);
    assert.equal(a.length, 10);
  });

  it("batch of 10 has no duplicates for human male", () => {
    const names = generateBuiltinNames(
      { catalogId: "human-male", count: 10, seed: 7 },
      createSeededRng(7),
    );
    assert.equal(names.length, 10);
    assert.equal(new Set(names).size, 10);
  });

  it("with last name returns two-word human male names and is stable", () => {
    const input = {
      catalogId: "human-male",
      count: 10,
      seed: 42,
      withLastName: true,
    };
    const a = generateBuiltinNames(input, createSeededRng(input.seed));
    const b = generateBuiltinNames(input, createSeededRng(input.seed));
    assert.deepEqual(a, b);
    assert.equal(a.length, 10);
    for (const name of a) {
      const parts = name.split(" ");
      assert.equal(parts.length, 2);
      assert.notEqual(parts[0]!.toLowerCase(), parts[1]!.toLowerCase());
    }
  });
});

describe("catalogIdForAncestry", () => {
  it("maps common ancestries and gender", () => {
    assert.equal(catalogIdForAncestry("Dwarf", "female"), "dwarven-female");
    assert.equal(catalogIdForAncestry("Half-Elf", "male"), "elven-male");
    assert.equal(catalogIdForAncestry("Medium Humanoid (human)", "female"), "human-female");
    assert.equal(catalogIdForAncestry("drow", "male"), "drow-male");
    assert.equal(genderFromHint("Female", { next: () => 0 }), "female");
  });

  it("rolls a two-word name when last name is on", () => {
    const name = rollRandomCharacterName({
      raceHint: "human",
      genderHint: "male",
      withLastName: true,
      rng: createSeededRng(42),
    });
    assert.equal(name.split(" ").length, 2);
  });
});

describe("generateMarkovNames", () => {
  it("order 2 output uses only training bigrams when lowercased", () => {
    const model = trainMarkovModel(MARKOV_FIXTURE, 2);
    const rng = createSeededRng(99);
    for (let i = 0; i < 12; i++) {
      const result = generateNames(
        {
          mode: "markov",
          sourceText: MARKOV_FIXTURE.join("\n"),
          order: 2,
          count: 1,
          seed: 99 + i,
        },
        createSeededRng(99 + i),
      );
      assert.equal(result.error, undefined);
      assert.ok(result.names[0]);
      assert.ok(
        markovOutputUsesTrainingPairs(model, result.names[0]!),
        result.names[0],
      );
    }
  });

  it("with last name joins two training-pair words", () => {
    const model = trainMarkovModel(MARKOV_FIXTURE, 2);
    const result = generateNames(
      {
        mode: "markov",
        sourceText: MARKOV_FIXTURE.join("\n"),
        order: 2,
        count: 5,
        seed: 99,
        withLastName: true,
      },
      createSeededRng(99),
    );
    assert.equal(result.error, undefined);
    assert.equal(result.names.length, 5);
    for (const name of result.names) {
      const parts = name.split(" ");
      assert.equal(parts.length, 2);
      for (const word of parts) {
        assert.ok(markovOutputUsesTrainingPairs(model, word), word);
      }
    }
  });

  it("fewer than 5 lines returns error and empty list", () => {
    const result = generateNames(
      {
        mode: "markov",
        sourceText: "one\ntwo\nthree",
        order: 2,
        count: 10,
        seed: 1,
      },
      createSeededRng(1),
    );
    assert.equal(result.error, "Paste at least 5 names.");
    assert.deepEqual(result.names, []);
  });
});
