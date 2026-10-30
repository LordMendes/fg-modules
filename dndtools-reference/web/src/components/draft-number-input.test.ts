import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commitNumberOnBlur,
  isAllowedNumberDraft,
  parseCompleteNumber,
} from "./draft-number-input";

const integer = { signed: false, decimals: false, min: 1, max: 20 };
const signed = { signed: true, decimals: false };
const decimal = { signed: false, decimals: true, min: 0 };

describe("draft number input", () => {
  it("allows an empty box and an unfinished minus or decimal", () => {
    assert.equal(isAllowedNumberDraft("", integer), true);
    assert.equal(isAllowedNumberDraft("-", signed), true);
    assert.equal(isAllowedNumberDraft("-", integer), false);
    assert.equal(isAllowedNumberDraft("1.", decimal), true);
    assert.equal(isAllowedNumberDraft("1.", integer), false);
    assert.equal(parseCompleteNumber("", integer), null);
    assert.equal(parseCompleteNumber("-", signed), null);
    assert.equal(parseCompleteNumber("1.", decimal), null);
  });

  it("parses a finished number and rejects values outside the range check", () => {
    assert.equal(parseCompleteNumber("8", integer), 8);
    assert.equal(parseCompleteNumber("01", integer), 1);
    assert.equal(parseCompleteNumber("-4", signed), -4);
    assert.equal(parseCompleteNumber("1.5", decimal), 1.5);
    assert.equal(parseCompleteNumber("1.5", integer), null);
  });

  it("restores the previous value when a cleared field blurs", () => {
    assert.equal(commitNumberOnBlur("", 18, integer), 18);
    assert.equal(commitNumberOnBlur("-", -2, signed), -2);
  });

  it("uses emptyValue when blank has a stored meaning", () => {
    assert.equal(commitNumberOnBlur("", 4, { ...signed, emptyValue: 0 }), 0);
  });

  it("treats a trailing decimal point as that whole number on blur", () => {
    assert.equal(commitNumberOnBlur("1.", 4, decimal), 1);
    assert.equal(commitNumberOnBlur(".", 4, decimal), 4);
  });

  it("clamps a finished out-of-range value on blur", () => {
    assert.equal(commitNumberOnBlur("25", 4, integer), 20);
    assert.equal(commitNumberOnBlur("0", 8, integer), 1);
  });
});
