import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  ADVENTURE_SECTION_DEFS,
  ADVENTURE_SECTION_TITLES,
  generateAdventure,
  rerollAdventureSection,
} from "@/lib/adventure";

const EXPECTED_TITLES = [
  "Theme",
  "Goal",
  "Story hook",
  "Plot",
  "Climax",
  "General setting",
  "Specific setting",
  "Second setting",
  "Master villain",
  "Minor villain",
  "Second minor villain",
  "Ally or neutral",
  "Monster encounter",
  "Character encounter",
  "Deathtrap",
  "Chase",
  "Omen or prophecy",
  "Secret weakness",
  "Special condition",
  "Moral quandary",
  "Red herring",
  "Cruel trick",
];

describe("adventure section tables", () => {
  it("lists 22 sections in spec order", () => {
    assert.equal(ADVENTURE_SECTION_DEFS.length, 22);
    assert.deepEqual(ADVENTURE_SECTION_TITLES, EXPECTED_TITLES);
  });

  it("gives each table at least 16 entries", () => {
    for (const section of ADVENTURE_SECTION_DEFS) {
      assert.ok(
        section.entries.length >= 16,
        `${section.title} has ${section.entries.length} entries`,
      );
    }
  });
});

describe("adventure generation", () => {
  it("reproduces the same sentences for the same seed", () => {
    const rng = createSeededRng(42);
    const first = generateAdventure({ seed: 42 }, rng);
    const second = generateAdventure({ seed: 42 }, createSeededRng(99));
    assert.deepEqual(
      first.sections.map((section) => section.text),
      second.sections.map((section) => section.text),
    );
  });

  it("reroll index 4 changes section 5 only", () => {
    const seed = 77;
    const base = generateAdventure({ seed }, createSeededRng(seed));
    const bumps = ADVENTURE_SECTION_DEFS.map(() => 0);
    const { result: rerolled } = rerollAdventureSection(
      { seed },
      base,
      4,
      bumps,
    );

    const before = base.sections.map((section) => section.text);
    const after = rerolled.sections.map((section) => section.text);

    assert.notEqual(after[4], before[4]);
    for (let i = 0; i < before.length; i++) {
      if (i === 4) continue;
      assert.equal(after[i], before[i], `section index ${i} should be unchanged`);
    }
  });
});
