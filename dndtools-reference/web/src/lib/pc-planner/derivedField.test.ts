import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyDerivedList,
  normalizeDerivedList,
  resolveDerived,
  resolveDerivedList,
  resolveDerivedNumber,
  resolveDerivedString,
} from "./derivedField";

describe("resolveDerived", () => {
  it("uses auto when override is null or undefined", () => {
    assert.equal(resolveDerived(12, null), 12);
    assert.equal(resolveDerived(12, undefined), 12);
    assert.equal(resolveDerived("auto", null), "auto");
  });

  it("uses override when set including zero", () => {
    assert.equal(resolveDerived(12, 0), 0);
    assert.equal(resolveDerivedNumber(15, 0), 0);
    assert.equal(resolveDerivedNumber(15, 8), 8);
  });
});

describe("resolveDerivedList", () => {
  it("prefers free-text override", () => {
    const field = { customized: false, lines: ["Common"] };
    assert.deepEqual(resolveDerivedList(["Elven"], field, "Draconic, Common"), [
      "Draconic",
      "Common",
    ]);
  });

  it("uses customized lines when set", () => {
    const field = { customized: true, lines: ["Undercommon"] };
    assert.deepEqual(resolveDerivedList(["Elven", "Common"], field), ["Undercommon"]);
  });

  it("falls back to auto when not customized", () => {
    const field = emptyDerivedList();
    assert.deepEqual(resolveDerivedList(["Elven"], field), ["Elven"]);
  });
});

describe("resolveDerivedString", () => {
  it("prefers free override then customized value", () => {
    const field = { customized: true, value: "Custom" };
    assert.equal(resolveDerivedString("Auto line", field, "Override"), "Override");
    assert.equal(resolveDerivedString("Auto line", field), "Custom");
  });
});

describe("normalizeDerivedList", () => {
  it("coerces invalid input", () => {
    assert.deepEqual(normalizeDerivedList(null), emptyDerivedList());
    assert.deepEqual(normalizeDerivedList({ customized: true, lines: ["A", 2, "B"] }), {
      customized: true,
      lines: ["A", "B"],
    });
  });
});
