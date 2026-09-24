import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalEntityPath } from "./classic-links";
import { rewriteInternalLinks } from "./sanitize";

describe("canonicalEntityPath", () => {
  it("rewrites classic feat hrefs", () => {
    assert.equal(
      canonicalEntityPath("/feats/players-handbook-v35--6/spell-focus--2699"),
      "/feats/spell-focus-2699",
    );
    assert.equal(
      canonicalEntityPath("/feats/players-handbook-v35--6/spell-focus--2699/"),
      "/feats/spell-focus-2699",
    );
  });

  it("rewrites classic spell hrefs with trailing slash", () => {
    assert.equal(
      canonicalEntityPath("/spells/players-handbook-v35--6/fireball--2612/"),
      "/spells/fireball-2612",
    );
  });

  it("rewrites classic class hrefs", () => {
    assert.equal(
      canonicalEntityPath("/classes/complete-mage--58/abjurant-champion/"),
      "/classes/abjurant-champion-58",
    );
  });

  it("leaves canonical 2-segment paths unchanged", () => {
    assert.equal(canonicalEntityPath("/feats/spell-focus-2699"), null);
    assert.equal(canonicalEntityPath("/feats/spell-focus-2699/"), null);
  });

  it("leaves skill hrefs unchanged", () => {
    assert.equal(canonicalEntityPath("/skills/spellcraft"), null);
    assert.equal(canonicalEntityPath("/skills/spellcraft/"), null);
  });

  it("leaves paths with four or more segments unchanged", () => {
    assert.equal(canonicalEntityPath("/feats/foo/bar/baz"), null);
    assert.equal(canonicalEntityPath("/sources/PH/feats"), null);
  });
});

describe("rewriteInternalLinks", () => {
  it("rewrites classic hrefs inside HTML and normalizes quotes", () => {
    const html =
      "<a href='/feats/players-handbook-v35--6/spell-focus--2699/'>Spell Focus</a>";
    const result = rewriteInternalLinks(html);
    assert.equal(
      result,
      '<a href="/feats/spell-focus-2699">Spell Focus</a>',
    );
  });

  it("leaves external https hrefs unchanged", () => {
    const html = '<a href="https://example.com/feats/foo">Example</a>';
    assert.equal(rewriteInternalLinks(html), html);
  });
});
