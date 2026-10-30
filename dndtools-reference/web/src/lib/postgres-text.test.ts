import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripPostgresNulls } from "./postgres-text";

describe("stripPostgresNulls", () => {
  it("removes U+0000 from strings and nested records", () => {
    const cleaned = stripPostgresNulls({
      name: "Keeper of the Grove",
      description_html: "before\u0000after",
      advancement: [{ special: "a\u0000b" }],
    });
    assert.equal(cleaned.description_html, "beforeafter");
    assert.equal(cleaned.advancement[0]?.special, "ab");
    assert.equal(cleaned.description_html.includes("\u0000"), false);
  });

  it("leaves text without null bytes unchanged", () => {
    const text = "Lesser aasimar";
    assert.equal(stripPostgresNulls(text), text);
  });
});
