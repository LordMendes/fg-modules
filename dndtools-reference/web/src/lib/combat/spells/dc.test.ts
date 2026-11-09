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

describe("spellSaveDc with featMods", () => {
  it("includes feat mods for Spell Focus", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 3, castingStatMod: 4, featMods: 1 }),
      18,
    );
  });

  it("includes Greater Spell Focus (+2)", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 5, castingStatMod: 5, featMods: 2 }),
      22,
    );
  });

  it("handles level 0 spell", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 0, castingStatMod: 3 }),
      13,
    );
  });

  it("handles high level spell with high ability", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 9, castingStatMod: 9, featMods: 2 }),
      30,
    );
  });

  it("handles negative stat modifier", () => {
    assert.equal(
      spellSaveDc({ spellLevel: 1, castingStatMod: -1 }),
      10,
    );
  });
});
