import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHitDice } from "./parseCr";

describe("parseHitDice", () => {
  it("parses simple HD strings", () => {
    assert.equal(parseHitDice("7d10 (52 hp)"), 7);
    assert.equal(parseHitDice("1d8+1 (5 hp)"), 1);
    assert.equal(parseHitDice("12d8+36"), 12);
  });

  it("sums dice across plus segments", () => {
    assert.equal(parseHitDice("8d8+56 plus 10d4+70 (177 hp)"), 18);
  });

  it("parses fractional HD counts", () => {
    assert.equal(parseHitDice("½d10 (2 hp)"), 0.5);
    assert.equal(parseHitDice("¼d8 (1 hp)"), 0.25);
    assert.equal(parseHitDice("½d8+2 (4 hp)"), 0.5);
  });

  it("returns null for invalid HD", () => {
    assert.equal(parseHitDice("—"), null);
    assert.equal(parseHitDice(""), null);
    assert.equal(parseHitDice(null), null);
    assert.equal(parseHitDice("not hd"), null);
  });
});
