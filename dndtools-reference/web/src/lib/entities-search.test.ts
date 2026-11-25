import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeArchiveSearchHits, type ArchiveSearchHit } from "./entities";

function hit(category: ArchiveSearchHit["category"], name: string, slug = name): ArchiveSearchHit {
  return {
    category,
    slug,
    name,
    snippet: null,
    sourceName: null,
    sourceAbbrev: null,
  };
}

describe("mergeArchiveSearchHits", () => {
  it("puts an exact deity name ahead of a full page of spell matches", () => {
    const spells = Array.from({ length: 20 }, (_, i) => hit("spells", `Spell ${i} mystra`, `spell-${i}`));
    const merged = mergeArchiveSearchHits(
      [...spells, hit("deities", "Mystra", "mystra")],
      "mystra",
      8,
    );
    assert.equal(merged[0]?.category, "deities");
    assert.equal(merged[0]?.slug, "mystra");
  });

  it("keeps a deity whose name starts with the query when spells would otherwise fill the list", () => {
    const spells = Array.from({ length: 12 }, (_, i) => hit("spells", `Mystic ${i}`, `spell-${i}`));
    const merged = mergeArchiveSearchHits(
      [...spells, hit("deities", "Mystra", "mystra")],
      "mys",
      4,
    );
    assert.ok(merged.some((row) => row.category === "deities" && row.slug === "mystra"));
  });
});
