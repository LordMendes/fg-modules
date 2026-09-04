import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  advancementRowAtLevel,
  parseBabValue,
  parseClassAdvancementTable,
} from "./parseClassAdvancement";

const dataRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../data/dndtools");

describe("parseBabValue", () => {
  it("reads primary BAB before iterative slashes", () => {
    assert.equal(parseBabValue("+6/+1"), 6);
    assert.equal(parseBabValue("+0"), 0);
  });
});

describe("parseClassAdvancementTable", () => {
  it("loads fighter BAB from compendium advancement", () => {
    const classes = JSON.parse(readFileSync(join(dataRoot, "classes.json"), "utf8")) as {
      slug: string;
      advancement?: unknown;
    }[];
    const fighter = classes.find((row) => row.slug === "fighter-93");
    const table = parseClassAdvancementTable(fighter?.advancement);
    const row = advancementRowAtLevel(table, 6);
    assert.equal(row?.bab, 6);
    assert.equal(row?.fort, 5);
  });

  it("loads monk level 1 BAB as zero from advancement", () => {
    const classes = JSON.parse(readFileSync(join(dataRoot, "classes.json"), "utf8")) as {
      slug: string;
      advancement?: unknown;
    }[];
    const monk = classes.find((row) => row.slug === "monk-94");
    const table = parseClassAdvancementTable(monk?.advancement);
    const row = advancementRowAtLevel(table, 1);
    assert.equal(row?.bab, 0);
  });
});
