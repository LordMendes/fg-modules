import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHtmlSanitizer,
  fallbackSanitize,
  formatProseHtmlWith,
  rewriteInternalLinks,
} from "./sanitize-core";
import { formatProseHtml, sanitizeHtml } from "./sanitize";

describe("fallbackSanitize", () => {
  it("strips script tags and inline handlers", () => {
    const html =
      '<p onclick="alert(1)">Hi</p><script>alert(2)</script><style>body{}</style>';
    const result = fallbackSanitize(html);
    assert.equal(result.includes("<script"), false);
    assert.equal(result.includes("<style"), false);
    assert.equal(result.includes("onclick"), false);
    assert.match(result, /Hi/);
  });
});

describe("applyHtmlSanitizer", () => {
  it("uses fallback when the sanitizer is missing", () => {
    const html = '<p>Safe</p><script>alert(1)</script>';
    const result = applyHtmlSanitizer(html, null);
    assert.match(result, /Safe/);
    assert.equal(result.includes("<script"), false);
  });

  it("does not throw when the sanitizer throws", () => {
    const result = applyHtmlSanitizer("<p>Safe</p>", {
      sanitize() {
        throw new Error("jsdom css missing");
      },
    });
    assert.match(result, /Safe/);
  });
});

describe("formatProseHtmlWith", () => {
  it("wraps tables after sanitizing", () => {
    const html = "<table><tr><td>Cell</td></tr></table>";
    const result = formatProseHtmlWith(html, null);
    assert.match(result, /class="table-wrap"/);
    assert.match(result, /entity-table/);
  });
});

describe("sanitizeHtml", () => {
  it("returns sanitized HTML without throwing", () => {
    const result = sanitizeHtml(
      '<p>Abate Dracorage</p><a href="/spells/players-handbook-v35--6/fireball--2612/">Fireball</a>',
    );
    assert.match(result, /Abate Dracorage/);
    assert.match(result, /href="\/spells\/fireball-2612"/);
  });
});

describe("formatProseHtml", () => {
  it("rewrites classic links inside prose", () => {
    const result = formatProseHtml(
      '<p><a href="/feats/players-handbook-v35--6/spell-focus--2699/">Spell Focus</a></p>',
    );
    assert.equal(
      rewriteInternalLinks(
        '<a href="/feats/players-handbook-v35--6/spell-focus--2699/">Spell Focus</a>',
      ),
      '<a href="/feats/spell-focus-2699">Spell Focus</a>',
    );
    assert.match(result, /spell-focus-2699/);
  });
});
