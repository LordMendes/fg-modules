import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterLanguageOptions } from "./languageCatalog";

describe("filterLanguageOptions", () => {
  it("groups PHB and setting languages", () => {
    const options = filterLanguageOptions("", new Set());
    assert.ok(options.some((option) => option.name === "Common" && option.groupLabel.includes("Handbook")));
    assert.ok(options.some((option) => option.name === "Chondathan" && option.groupLabel.includes("Forgotten")));
    assert.ok(options.some((option) => option.name === "Flan" && option.groupLabel.includes("Greyhawk")));
  });

  it("excludes already selected languages", () => {
    const options = filterLanguageOptions("", new Set(["Common"]));
    assert.equal(options.some((option) => option.name === "Common"), false);
  });
});
