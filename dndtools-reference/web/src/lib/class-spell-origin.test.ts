import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCastingClassVariant,
  parseClassSpellOriginSlug,
  pickLargestSpellListSlug,
  resolveClassSpellOriginSlug,
} from "./class-spell-origin";

describe("parseClassSpellOriginSlug", () => {
  it("reads UA base class links", () => {
    const slug = parseClassSpellOriginSlug(
      '<p>retained from base class, <a href="/classes/wizard-99">Wizard</a>, unless noted</p>',
      "Domain Wizard",
      "domain-wizard-122",
    );
    assert.equal(slug, "wizard-99");
  });

  it("reads cast-as origin links for battle sorcerer", () => {
    const slug = parseClassSpellOriginSlug(
      '<p>A battle sorcerer can cast <a href="/classes/sorcerer-98">sorcerer</a> spells derived from her class levels</p>',
      "Battle Sorcerer",
      "battle-sorcerer-119",
    );
    assert.equal(slug, "sorcerer-98");
  });
});

describe("resolveClassSpellOriginSlug", () => {
  it("keeps classes that already have their own spell list links", () => {
    const slug = resolveClassSpellOriginSlug({
      classSlug: "beguiler-100",
      className: "Beguiler",
      directSpellLinkCount: 120,
    });
    assert.equal(slug, "beguiler-100");
  });

  it("inherits from parsed origin when a variant has no direct spell links", () => {
    const slug = resolveClassSpellOriginSlug({
      classSlug: "battle-sorcerer-119",
      className: "Battle Sorcerer",
      descriptionHtml:
        '<p>A battle sorcerer can cast <a href="/classes/sorcerer-98">sorcerer</a> spells derived from her class levels</p>',
      directSpellLinkCount: 0,
    });
    assert.equal(slug, "sorcerer-98");
  });

  it("uses fallback origin slug for unknown variant slugs", () => {
    const slug = resolveClassSpellOriginSlug({
      classSlug: "battle-sorcerer-119",
      className: "Battle Sorcerer",
      directSpellLinkCount: 0,
      fallbackOriginSlug: "sorcerer-98",
    });
    assert.equal(slug, "sorcerer-98");
  });
});

describe("isCastingClassVariant", () => {
  it("detects battle sorcerer as a variant", () => {
    assert.equal(isCastingClassVariant("battle-sorcerer-119", "Battle Sorcerer"), true);
    assert.equal(isCastingClassVariant("sorcerer-98", "Sorcerer"), false);
  });
});

describe("pickLargestSpellListSlug", () => {
  it("picks the slug with the highest count", () => {
    const slug = pickLargestSpellListSlug(
      [{ classSlug: "wizard-99" }, { classSlug: "wizard-99" }, { classSlug: "wizard-12" }],
      "wizard",
    );
    assert.equal(slug, "wizard-99");
  });
});
