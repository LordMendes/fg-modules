import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRandomSpellbookSearchParams,
  parseRandomSpellbookSearchParams,
  serializeRandomSpellbookUrlState,
} from "./url-state";
import { DEFAULT_RANDOM_SPELLBOOK_URL_STATE } from "./defaults";

const VALID_SOURCES = ["PH", "CM", "DMG"];

describe("parseRandomSpellbookSearchParams", () => {
  it("returns defaults for an empty query", () => {
    assert.deepEqual(parseRandomSpellbookSearchParams({}, VALID_SOURCES), {
      ...DEFAULT_RANDOM_SPELLBOOK_URL_STATE,
    });
  });

  it("parses a full share link", () => {
    const parsed = parseRandomSpellbookSearchParams(
      {
        lvl: "7",
        int: "3",
        src: "PH,CM",
        spec: "Evocation",
        ban: "Necromancy,Abjuration",
        interest: "4",
        seed: "12345",
      },
      VALID_SOURCES,
    );

    assert.equal(parsed.wizardLevel, 7);
    assert.equal(parsed.intModifier, 3);
    assert.deepEqual(parsed.selectedSources, ["PH", "CM"]);
    assert.equal(parsed.specialization, "Evocation");
    assert.deepEqual(parsed.prohibitedSchools, ["Necromancy", "Abjuration"]);
    assert.equal(parsed.interestPerLevel, 4);
    assert.equal(parsed.seed, "12345");
  });

  it("clamps numeric values and strips invalid schools and sources", () => {
    const parsed = parseRandomSpellbookSearchParams(
      {
        lvl: "99",
        int: "-99",
        src: "PH,INVALID,CM",
        spec: "NotASchool",
        ban: "Necromancy,Fake",
      },
      VALID_SOURCES,
    );

    assert.equal(parsed.wizardLevel, 20);
    assert.equal(parsed.intModifier, -4);
    assert.deepEqual(parsed.selectedSources, ["PH", "CM"]);
    assert.equal(parsed.specialization, "");
    assert.deepEqual(parsed.prohibitedSchools, ["Necromancy"]);
  });

  it("excludes specialization from prohibited schools", () => {
    const parsed = parseRandomSpellbookSearchParams(
      {
        spec: "Evocation",
        ban: "Evocation,Necromancy",
      },
      VALID_SOURCES,
    );

    assert.equal(parsed.specialization, "Evocation");
    assert.deepEqual(parsed.prohibitedSchools, ["Necromancy"]);
  });
});

describe("buildRandomSpellbookSearchParams", () => {
  it("omits default-equivalent values", () => {
    const params = buildRandomSpellbookSearchParams(DEFAULT_RANDOM_SPELLBOOK_URL_STATE);
    assert.equal(params.toString(), "");
  });

  it("round-trips non-default state", () => {
    const state = {
      wizardLevel: 10,
      intModifier: 1,
      selectedSources: ["PH", "CM"],
      specialization: "Divination" as const,
      prohibitedSchools: ["Necromancy" as const],
      interestPerLevel: 5,
      seed: "999",
    };

    const params = buildRandomSpellbookSearchParams(state);
    const parsed = parseRandomSpellbookSearchParams(
      Object.fromEntries(params.entries()),
      VALID_SOURCES,
    );

    assert.deepEqual(parsed, state);
  });

  it("serializes to a query string", () => {
    const query = serializeRandomSpellbookUrlState({
      ...DEFAULT_RANDOM_SPELLBOOK_URL_STATE,
      seed: "42",
    });
    assert.equal(query, "seed=42");
  });
});
