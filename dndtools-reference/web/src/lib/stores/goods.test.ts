import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoodsBrowseParams,
  filterGoodsSections,
  itemMatchesQuery,
  matchesSectionFilter,
  parseGoodsBrowseParams,
  tableMatchesQuery,
  type GoodsListItem,
  type GoodsSectionBlock,
  type GoodsTableRecord,
} from "./goods";

const sampleItem = (overrides: Partial<GoodsListItem> = {}): GoodsListItem => ({
  slug: "caltrops",
  name: "Caltrops",
  kind: "gear",
  category: "adventuring-gear",
  cost: "1 gp",
  weight: "2 lb.",
  sourceAbbrev: "ph",
  sourceName: "Player's Handbook",
  hasDescription: true,
  ...overrides,
});

const sampleTable = (overrides: Partial<GoodsTableRecord> = {}): GoodsTableRecord => ({
  section_slug: "light-and-vision",
  section_title: "Light and Vision",
  title: "Light Sources",
  headers: ["Item", "Cost", "Duration"],
  rows: [["Candle", "1 cp", "1 hour"]],
  footnotes: ["* Bright light in 5-ft radius."],
  source: { name: "Player's Handbook", abbrev: "ph", edition: "3.5" },
  ...overrides,
});

const sampleSection = (overrides: Partial<GoodsSectionBlock> = {}): GoodsSectionBlock => ({
  slug: "adventuring-gear",
  label: "Adventuring Gear",
  sourceAbbrev: "ph",
  sourceName: "Player's Handbook",
  items: [sampleItem()],
  tables: [],
  ...overrides,
});

describe("matchesSectionFilter", () => {
  it("includes adventuring gear and light sections for adventuring chip", () => {
    assert.equal(matchesSectionFilter("adventuring-gear", "adventuring"), true);
    assert.equal(matchesSectionFilter("light-and-vision", "adventuring"), true);
    assert.equal(matchesSectionFilter("class-tools", "adventuring"), false);
  });

  it("includes all service sections for services chip", () => {
    assert.equal(matchesSectionFilter("transportation", "services"), true);
    assert.equal(matchesSectionFilter("hired-passage", "services"), true);
    assert.equal(matchesSectionFilter("food-drink-lodging", "services"), true);
    assert.equal(matchesSectionFilter("mounts", "services"), false);
  });

  it("includes ships and vehicles but not mounts for vehicles chip", () => {
    assert.equal(matchesSectionFilter("vehicles", "vehicles"), true);
    assert.equal(matchesSectionFilter("ships", "vehicles"), true);
    assert.equal(matchesSectionFilter("mounts", "vehicles"), false);
    assert.equal(matchesSectionFilter("planar", "vehicles"), false);
  });

  it("includes buildings and siege engines for buildings chip", () => {
    assert.equal(matchesSectionFilter("buildings", "buildings"), true);
    assert.equal(matchesSectionFilter("siege-engines", "buildings"), true);
    assert.equal(matchesSectionFilter("transportation", "buildings"), false);
  });
});

describe("query matching", () => {
  it("matches items by name, kind, and cost", () => {
    assert.equal(itemMatchesQuery(sampleItem(), "caltrop"), true);
    assert.equal(itemMatchesQuery(sampleItem(), "gear"), true);
    assert.equal(itemMatchesQuery(sampleItem(), "1 gp"), true);
    assert.equal(itemMatchesQuery(sampleItem(), "torch"), false);
  });

  it("matches table rows and footnotes", () => {
    assert.equal(tableMatchesQuery(sampleTable(), "candle"), true);
    assert.equal(tableMatchesQuery(sampleTable(), "bright light"), true);
    assert.equal(tableMatchesQuery(sampleTable(), "saddle"), false);
  });

  it("filters sections by query across items and tables", () => {
    const sections = [
      sampleSection(),
      sampleSection({
        slug: "light-and-vision",
        label: "Light and Vision",
        items: [],
        tables: [sampleTable()],
      }),
      sampleSection({
        slug: "mounts",
        label: "Mounts And Related Gear",
        items: [sampleItem({ name: "Riding Horse", slug: "riding-horse", category: "mounts" })],
      }),
    ];

    const byItem = filterGoodsSections(sections, "caltrop", null);
    assert.equal(byItem.length, 1);
    assert.equal(byItem[0]?.slug, "adventuring-gear");

    const byTable = filterGoodsSections(sections, "candle", null);
    assert.equal(byTable.length, 1);
    assert.equal(byTable[0]?.slug, "light-and-vision");

    const byFilter = filterGoodsSections(sections, "", "services");
    assert.equal(byFilter.length, 0);
  });
});

describe("goods browse URL params", () => {
  it("parses and builds q/group params", () => {
    assert.deepEqual(parseGoodsBrowseParams({ q: "caltrops", group: "adventuring" }), {
      query: "caltrops",
      filter: "adventuring",
    });
    assert.deepEqual(parseGoodsBrowseParams({ group: "invalid" }), {
      query: "",
      filter: null,
    });

    const params = buildGoodsBrowseParams("caltrops", "adventuring");
    assert.equal(params.get("q"), "caltrops");
    assert.equal(params.get("group"), "adventuring");
  });
});
