import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEntityMetadata,
  buildCategoryHubDescription,
  buildCategoryHubIntro,
  hasQueryParams,
  truncateMetaDescription,
} from "./seo";

describe("truncateMetaDescription", () => {
  it("returns short text unchanged", () => {
    assert.equal(truncateMetaDescription("Short description."), "Short description.");
  });

  it("truncates at word boundary with ellipsis", () => {
    const long =
      "This is a very long description that exceeds the maximum length allowed for meta descriptions in search engine results pages and should be cut cleanly.";
    const result = truncateMetaDescription(long, 80);
    assert.ok(result.endsWith("…"));
    assert.ok(result.length <= 81);
    assert.ok(!result.includes(" cut cleanly"));
  });

  it("normalizes whitespace", () => {
    assert.equal(
      truncateMetaDescription("  Multiple   spaces   here.  "),
      "Multiple spaces here.",
    );
  });
});

describe("buildEntityMetadata", () => {
  const baseEntity = {
    name: "Fireball",
    descriptionText: "A fiery explosion deals damage in a 20-foot radius.",
    statLine: "Evocation [Fire]",
    source: { abbrev: "PHB" },
    fields: { Level: "3" },
  };

  it("builds spell title with D&D 3.5 category suffix", () => {
    const meta = buildEntityMetadata(baseEntity, "spells", "fireball");
    assert.equal(meta.title, "Fireball (D&D 3.5 Spell)");
  });

  it("includes source in description when descriptionText exists", () => {
    const meta = buildEntityMetadata(baseEntity, "spells", "fireball");
    assert.match(String(meta.description), /PHB/);
  });

  it("builds monster fallback from CR and type", () => {
    const meta = buildEntityMetadata(
      {
        name: "Goblin",
        descriptionText: null,
        statLine: null,
        source: { abbrev: "MM" },
        fields: { "Challenge Rating": "1/3", Type: "Humanoid" },
      },
      "monsters",
      "goblin",
    );
    assert.equal(meta.title, "Goblin (D&D 3.5 Monster)");
    assert.match(String(meta.description), /CR 1\/3/);
    assert.match(String(meta.description), /MM/);
  });

  it("builds feat fallback from feat type field", () => {
    const meta = buildEntityMetadata(
      {
        name: "Power Attack",
        descriptionText: null,
        statLine: "General feat",
        source: { abbrev: "PHB" },
        fields: { Type: "General" },
      },
      "feats",
      "power-attack",
    );
    assert.equal(meta.title, "Power Attack (D&D 3.5 Feat)");
    assert.match(String(meta.description), /General feat/);
  });
});

describe("buildCategoryHubDescription", () => {
  it("includes formatted count and label", () => {
    const desc = buildCategoryHubDescription("Spells", 2847);
    assert.match(desc, /2,847 spells/);
  });
});

describe("buildCategoryHubIntro", () => {
  it("states the category blurb, entry count, and sourcebook count", () => {
    const intro = buildCategoryHubIntro("spells", 2847, 22);
    assert.match(intro, /^Arcane and divine spells/);
    assert.match(intro, /Includes 2,847 entries from 22 sourcebooks\.$/);
  });

  it("uses singular nouns for one entry and one sourcebook", () => {
    assert.match(buildCategoryHubIntro("deities", 1, 1), /Includes 1 entry from 1 sourcebook\.$/);
  });

  it("stays within the meta description length for every category", () => {
    const categories = [
      "spells", "feats", "monsters", "classes", "skills", "races", "items",
      "equipment", "domains", "deities", "psionics", "templates", "rules",
    ] as const;
    for (const category of categories) {
      assert.ok(buildCategoryHubIntro(category, 99999, 99).length <= 160, category);
    }
  });
});

describe("buildEntityMetadata with lead", () => {
  it("uses the lead as description when there is no body text", () => {
    const lead = "Goblin is a D&D 3.5 monster from MM. CR 1/3.";
    const meta = buildEntityMetadata(
      {
        name: "Goblin",
        descriptionText: null,
        statLine: null,
        source: { abbrev: "MM" },
        fields: { "Challenge Rating": "1/3" },
      },
      "monsters",
      "goblin",
      lead,
    );
    assert.equal(meta.description, lead);
  });
});

describe("hasQueryParams", () => {
  it("returns false for empty params", () => {
    assert.equal(hasQueryParams({}), false);
    assert.equal(hasQueryParams({ q: "" }), false);
  });

  it("returns true when any param has a value", () => {
    assert.equal(hasQueryParams({ q: "fireball" }), true);
    assert.equal(hasQueryParams({ source: ["PHB", "MM"] }), true);
  });

  it("returns false for empty arrays", () => {
    assert.equal(hasQueryParams({ source: [] }), false);
  });
});
