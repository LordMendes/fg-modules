import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spellSaveDc } from "@/lib/combat/spells/dc";

describe("spellSaveDc", () => {
  it("uses 10 + spell level + casting stat", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 3, castingStatMod: 4 }),
      17,
    );
  });

  it("adds DC effects tagged for the school", () => {
    assert.equal(
      spellSaveDc({
        spellLevel: 3,
        castingStatMod: 4,
        effects: [
          {
            label: "Spell Focus",
            components: [{ tag: "DC", value: 1, descriptors: ["evocation"] }],
          },
        ],
        descriptors: ["evocation"],
      }),
      18,
    );
  });
});
