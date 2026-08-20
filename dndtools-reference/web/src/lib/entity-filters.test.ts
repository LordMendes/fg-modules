import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildListSearchParams,
  hasActiveFilters,
  parseListSearchParams,
  parseRangeInputs,
} from "./entity-filters";

describe("monster range filters", () => {
  it("parses CR and HD range params from URL", () => {
    const filters = parseListSearchParams("monsters", {
      crMin: "5",
      crMax: "10",
      hdMin: "8",
      hdMax: "20",
    });
    assert.deepEqual(filters.ranges.cr, { min: 5, max: 10 });
    assert.deepEqual(filters.ranges.hd, { min: 8, max: 20 });
    assert.ok(hasActiveFilters(filters));
  });

  it("round-trips range params through buildListSearchParams", () => {
    const filters = parseListSearchParams("monsters", {
      cr: "5",
      crMin: "4",
      crMax: "6",
      hdMin: "10",
    });
    const params = buildListSearchParams(filters);
    assert.equal(params.get("cr"), "5");
    assert.equal(params.get("crMin"), "4");
    assert.equal(params.get("crMax"), "6");
    assert.equal(params.get("hdMin"), "10");
    assert.equal(params.get("hdMax"), null);
  });

  it("ignores invalid range bounds", () => {
    const filters = parseListSearchParams("monsters", {
      crMin: "abc",
      hdMax: "—",
    });
    assert.deepEqual(filters.ranges, {});
  });

  it("parses fractional CR range bounds", () => {
    const filters = parseListSearchParams("monsters", {
      crMin: "1/2",
      crMax: "3",
    });
    assert.deepEqual(filters.ranges.cr, { min: 0.5, max: 3 });
  });

  it("parseRangeInputs converts draft input strings", () => {
    const ranges = parseRangeInputs({
      cr: { min: "1/3", max: "2" },
      hd: { min: "4", max: "" },
    });
    assert.deepEqual(ranges.cr, { min: 1 / 3, max: 2 });
    assert.deepEqual(ranges.hd, { min: 4 });
  });

  it("does not parse range params for non-monster categories", () => {
    const filters = parseListSearchParams("spells", { crMin: "5", hdMin: "8" });
    assert.deepEqual(filters.ranges, {});
  });
});

describe("spell school filters", () => {
  it("parses school, discipline, and subschool params from URL", () => {
    const filters = parseListSearchParams("spells", {
      school: "Conjuration,Necromancy",
      discipline: "Iron Heart",
      subschool: "Creation",
    });
    assert.deepEqual(filters.fields.school, ["Conjuration", "Necromancy"]);
    assert.deepEqual(filters.fields.discipline, ["Iron Heart"]);
    assert.deepEqual(filters.fields.subschool, ["Creation"]);
    assert.ok(hasActiveFilters(filters));
  });

  it("round-trips school, discipline, and subschool through buildListSearchParams", () => {
    const filters = parseListSearchParams("spells", {
      school: "Evocation",
      discipline: "Shadow Hand",
      subschool: "Stance",
    });
    const params = buildListSearchParams(filters);
    assert.equal(params.get("school"), "Evocation");
    assert.equal(params.get("discipline"), "Shadow Hand");
    assert.equal(params.get("subschool"), "Stance");
  });
});
