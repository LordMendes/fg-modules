import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSpellResistance } from "./spellResistance";

describe("rules/spellResistance (90-testing.md)", () => {
  it("CL 8 face 11 vs SR 18 passes; face 9 fails", () => {
    const pass = resolveSpellResistance({ casterLevel: 8, face: 11, sr: 18 });
    assert.equal(pass.total, 19);
    assert.equal(pass.success, true);

    const fail = resolveSpellResistance({ casterLevel: 8, face: 9, sr: 18 });
    assert.equal(fail.total, 17);
    assert.equal(fail.success, false);
  });
});
