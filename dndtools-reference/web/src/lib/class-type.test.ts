import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildClassTypeMap, classifyClassType } from "./class-type";

function makeAdvancement(maxLevel: number) {
  return Array.from({ length: maxLevel }, (_, index) => ({ level: index + 1 }));
}

describe("classifyClassType", () => {
  it("classifies PHB-style base classes without requirements as base", () => {
    assert.equal(
      classifyClassType({
        index: { prestige_level: "" },
        requirements_html: "",
        advancement: makeAdvancement(20),
      }),
      "base",
    );
  });

  it("classifies classes with requirements as prestige", () => {
    assert.equal(
      classifyClassType({
        index: { prestige_level: "" },
        requirements_html: "<p>Base attack bonus +5</p>",
        advancement: makeAdvancement(10),
      }),
      "prestige",
    );
  });

  it("classifies short advancement tables without requirements as prestige", () => {
    assert.equal(
      classifyClassType({
        index: { prestige_level: "" },
        requirements_html: "",
        advancement: makeAdvancement(10),
      }),
      "prestige",
    );
  });

  it("classifies 20-level classes without requirements as base", () => {
    assert.equal(
      classifyClassType({
        index: { prestige_level: "" },
        requirements_html: "",
        advancement: makeAdvancement(20),
      }),
      "base",
    );
  });

  it("classifies non-empty prestige_level as prestige even without requirements", () => {
    assert.equal(
      classifyClassType({
        index: { prestige_level: "10" },
        requirements_html: "",
        advancement: makeAdvancement(20),
      }),
      "prestige",
    );
  });

  it("buildClassTypeMap assigns one entry per slug", () => {
    const map = buildClassTypeMap([
      {
        slug: "fighter-93",
        index: { prestige_level: "" },
        advancement: makeAdvancement(20),
      },
      {
        slug: "abjurant-champion-264",
        requirements_html: "<p>Requirements</p>",
        advancement: makeAdvancement(10),
      },
    ]);
    assert.equal(map["fighter-93"], "base");
    assert.equal(map["abjurant-champion-264"], "prestige");
  });
});
