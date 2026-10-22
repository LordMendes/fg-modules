import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elForSameCrGroup } from "@/lib/encounter/encounterNumbers";
import { xpForPartyLevel } from "@/lib/encounter/xpTable";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { filterCandidatesForEncounter } from "./environment";
import { generateEncounter, pickCountForGroup } from "./generate";
import type { EncounterInput, MonsterCandidate } from "./types";

function sampleCandidates(): MonsterCandidate[] {
  return [
    {
      slug: "goblin",
      name: "Goblin",
      cr: "1/3",
      crNum: 1 / 3,
      environment: "Temperate plains",
      subtypes: null,
      creatureType: "Humanoid",
      treasure: "Standard",
      size: "Small",
    },
    {
      slug: "wolf",
      name: "Wolf",
      cr: "1",
      crNum: 1,
      environment: "Temperate forest",
      subtypes: null,
      creatureType: "Animal",
      treasure: null,
      size: "Medium",
    },
    {
      slug: "dire-rat",
      name: "Dire Rat",
      cr: "1/3",
      crNum: 1 / 3,
      environment: "Underground",
      subtypes: null,
      creatureType: "Animal",
      treasure: null,
      size: "Small",
    },
    {
      slug: "vrock",
      name: "Vrock",
      cr: "9",
      crNum: 9,
      environment: "Abyss",
      subtypes: "Chaotic, Evil, Extraplanar, Tanar'ri",
      creatureType: "Outsider",
      treasure: "Standard",
      size: "Large",
    },
    {
      slug: "bearded-devil",
      name: "Bearded Devil",
      cr: "5",
      crNum: 5,
      environment: "Nine Hells",
      subtypes: "Baatezu, Evil, Extraplanar, Lawful",
      creatureType: "Outsider",
      treasure: "Standard",
      size: "Medium",
    },
  ];
}

const baseInput: EncounterInput = {
  level: 1,
  plane: "prime",
  climate: "temperate",
  terrain: "plain",
  partySize: 4,
  partyLevel: 1,
};

describe("encounter generator locale", () => {
  it("underground on prime ignores climate", () => {
    const candidates = sampleCandidates();
    const cold: EncounterInput = {
      ...baseInput,
      terrain: "underground",
      climate: "cold",
    };
    const warm: EncounterInput = {
      ...baseInput,
      terrain: "underground",
      climate: "warm",
    };
    const rng = createSeededRng(42);
    const coldResult = generateEncounter(candidates, cold, rng);
    const warmResult = generateEncounter(candidates, warm, createSeededRng(42));
    assert.deepEqual(
      coldResult.groups.map((g) => g.slug),
      warmResult.groups.map((g) => g.slug),
    );
  });

  it("abyssal plane ignores terrain", () => {
    const candidates = sampleCandidates();
    const forestPool = filterCandidatesForEncounter(candidates, {
      level: 9,
      plane: "abyssal",
      climate: "temperate",
      terrain: "forest",
    });
    const desertPool = filterCandidatesForEncounter(candidates, {
      level: 9,
      plane: "abyssal",
      climate: "warm",
      terrain: "desert",
    });
    assert.deepEqual(
      forestPool.map((m) => m.slug).sort(),
      desertPool.map((m) => m.slug).sort(),
    );
  });
});

describe("encounter generator mechanics", () => {
  it("pickCountForGroup uses elForSameCrGroup for count 4 at CR 1", () => {
    assert.equal(elForSameCrGroup(1, 4), 5);
    assert.equal(pickCountForGroup(1, 5), 4);
  });

  it("xpForPartyLevel uses DMG table values", () => {
    assert.equal(xpForPartyLevel(1, 1), 300);
    assert.equal(xpForPartyLevel(8, 1), 200);
    assert.equal(xpForPartyLevel(5, 0.5), Math.floor(300 / 2));
  });

  it("same seed and candidates return the same slugs", () => {
    const candidates = sampleCandidates();
    const input: EncounterInput = { ...baseInput, level: 5, terrain: "forest" };
    const a = generateEncounter(candidates, input, createSeededRng(99));
    const b = generateEncounter(candidates, input, createSeededRng(99));
    assert.deepEqual(
      a.groups.map((g) => g.slug),
      b.groups.map((g) => g.slug),
    );
  });
});
