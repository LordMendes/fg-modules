import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateSpellbook } from "./generate";
import { spellsOfInterestCount, startingFirstLevelSpellCount, totalNonCantripSpellCount } from "./wizard-progression";
import { totalSpellbookPages } from "./pages";
import type { WizardSpellRef } from "./types";

function makePool(): WizardSpellRef[] {
  const pool: WizardSpellRef[] = [];

  for (let i = 0; i < 5; i++) {
    pool.push({
      slug: `cantrip-${i}`,
      name: `Cantrip ${i}`,
      level: 0,
      schools: ["Universal"],
      sourceAbbrev: "PH",
    });
  }

  const schools = [
    "Abjuration",
    "Conjuration",
    "Divination",
    "Enchantment",
    "Evocation",
    "Illusion",
    "Necromancy",
    "Transmutation",
  ] as const;

  for (let level = 1; level <= 3; level++) {
    for (let i = 0; i < 12; i++) {
      pool.push({
        slug: `spell-l${level}-${i}`,
        name: `Spell L${level} #${i}`,
        level,
        schools: [schools[i % schools.length]!],
        sourceAbbrev: "PH",
      });
    }
  }

  return pool;
}

describe("wizard progression helpers", () => {
  it("computes starting spell count from Int modifier", () => {
    assert.equal(startingFirstLevelSpellCount(2), 5);
    assert.equal(startingFirstLevelSpellCount(-4), 1);
  });

  it("computes total non-cantrip spells by level", () => {
    assert.equal(totalNonCantripSpellCount(1, 2), 5);
    assert.equal(totalNonCantripSpellCount(5, 2), 13);
  });

  it("scales spells of interest with wizard level", () => {
    assert.equal(spellsOfInterestCount(5), 3);
    assert.equal(spellsOfInterestCount(10), 5);
    assert.equal(spellsOfInterestCount(20), 10);
  });
});

describe("generateSpellbook", () => {
  const pool = makePool();

  it("is deterministic for the same seed", () => {
    const input = { wizardLevel: 5, intModifier: 2, specialization: null, prohibitedSchools: [], seed: 42 };
    const first = generateSpellbook(input, pool);
    const second = generateSpellbook(input, pool);
    assert.deepEqual(first.spellbook, second.spellbook);
    assert.deepEqual(first.spellsOfInterest, second.spellsOfInterest);
    assert.equal(first.seed, 42);
  });

  it("includes every cantrip from the pool", () => {
    const result = generateSpellbook(
      { wizardLevel: 3, intModifier: 0, specialization: null, prohibitedSchools: [], seed: 1 },
      pool,
    );
    assert.equal(result.cantripCount, 5);
    const cantripNames = result.spellbook.find((group) => group.level === 0)?.spells.map((s) => s.name) ?? [];
    assert.deepEqual(cantripNames.sort(), ["Cantrip 0", "Cantrip 1", "Cantrip 2", "Cantrip 3", "Cantrip 4"]);
  });

  it("respects non-cantrip spell quotas", () => {
    const result = generateSpellbook(
      { wizardLevel: 5, intModifier: 2, specialization: null, prohibitedSchools: [], seed: 99 },
      pool,
    );
    const nonCantrips = result.totalSpells - result.cantripCount;
    assert.equal(nonCantrips, totalNonCantripSpellCount(5, 2));
  });

  it("excludes prohibited schools from the book and interest list", () => {
    const result = generateSpellbook(
      {
        wizardLevel: 5,
        intModifier: 1,
        specialization: null,
        prohibitedSchools: ["Necromancy"],
        seed: 7,
      },
      pool,
    );

    const allSpells = [
      ...result.spellbook.flatMap((group) => group.spells),
      ...result.spellsOfInterest.flatMap((group) => group.spells),
    ];
    assert.ok(allSpells.every((spell) => !spell.schools.includes("Necromancy")));
  });

  it("guarantees at least one specialized spell per castable circle", () => {
    const result = generateSpellbook(
      {
        wizardLevel: 5,
        intModifier: 1,
        specialization: "Evocation",
        prohibitedSchools: [],
        seed: 123,
      },
      pool,
    );

    for (let circle = 1; circle <= result.maxSpellLevel; circle++) {
      const circleSpells = result.spellbook.find((group) => group.level === circle)?.spells ?? [];
      assert.ok(
        circleSpells.some((spell) => spell.schools.includes("Evocation")),
        `expected an Evocation spell at level ${circle}`,
      );
    }
  });

  it("samples proportional spells of interest per circle", () => {
    const result = generateSpellbook(
      { wizardLevel: 10, intModifier: 1, specialization: null, prohibitedSchools: [], seed: 555 },
      pool,
    );

    const expected = spellsOfInterestCount(10);
    for (const group of result.spellsOfInterest) {
      assert.ok(group.spells.length <= expected);
      assert.ok(group.spells.length > 0);
    }
  });

  it("computes page count from spell levels", () => {
    const spells: WizardSpellRef[] = [
      { slug: "a", name: "A", level: 0, schools: ["Universal"], sourceAbbrev: "PH" },
      { slug: "b", name: "B", level: 2, schools: ["Evocation"], sourceAbbrev: "PH" },
    ];
    assert.equal(totalSpellbookPages(spells), 5);
  });
});
