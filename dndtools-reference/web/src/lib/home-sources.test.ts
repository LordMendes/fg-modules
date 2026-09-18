import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  flattenSourcesByEdition,
  pickFeaturedSources,
  remainingSourceCount,
  sourceDisplayName,
} from "./home-sources";

describe("home sources helpers", () => {
  const ph35 = {
    id: "ph-35",
    name: "Player's Handbook v.3.5",
    abbrev: "PH",
    edition: "3.5",
    counts: 1200,
  };
  const ph30 = {
    id: "ph-30",
    name: "Player's Handbook 3.0",
    abbrev: "PH",
    edition: "3.0",
    counts: 800,
  };
  const mm = {
    id: "mm",
    name: "Monster Manual v.3.5",
    abbrev: "MM",
    edition: "3.5",
    counts: 500,
  };
  const obscure = {
    id: "d290",
    name: "Dragon #290",
    abbrev: "D290",
    edition: "3.5",
    counts: 12,
  };

  it("flattens sources grouped by edition", () => {
    assert.deepEqual(
      flattenSourcesByEdition({ "3.5": [ph35], "3.0": [ph30] }),
      [ph35, ph30],
    );
  });

  it("picks featured core books in display order", () => {
    const featured = pickFeaturedSources([obscure, mm, ph35]);
    assert.deepEqual(
      featured.map((source) => source.abbrev),
      ["PH", "MM"],
    );
  });

  it("prefers the 3.5 edition when an abbrev appears twice", () => {
    const featured = pickFeaturedSources([ph30, ph35, mm]);
    assert.equal(featured[0]?.id, "ph-35");
  });

  it("skips featured abbrevs that are not in the catalog", () => {
    const featured = pickFeaturedSources([obscure]);
    assert.deepEqual(featured, []);
  });

  it("counts remaining sources after featured picks", () => {
    assert.equal(remainingSourceCount(100, 12), 88);
    assert.equal(remainingSourceCount(10, 12), 0);
  });

  it("uses the source name as the visible label", () => {
    assert.equal(sourceDisplayName(ph35), "Player's Handbook v.3.5");
  });
});
