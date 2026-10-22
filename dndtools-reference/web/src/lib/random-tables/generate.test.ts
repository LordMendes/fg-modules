import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { rollNpc } from "./npcs";
import { rollPickpocketFallback } from "./pickpocket";
import { rollSpellbook } from "./spellbooks";
import { rollTrap } from "./traps";
import type { SpellRef } from "./types";

describe("rollTrap", () => {
  it("Search DC for CR 5 is 15 + CR plus 0 to 4", () => {
    const rng = createSeededRng(42);
    const trap = rollTrap(5, rng);
    assert.ok(trap.searchDc >= 20 && trap.searchDc <= 24);
    const bonus = trap.searchDc - (15 + 5);
    assert.ok(bonus >= 0 && bonus <= 4);
  });

  it("odd CR is magic and even CR is mechanical", () => {
    const rng = createSeededRng(1);
    assert.equal(rollTrap(4, rng).isMagic, false);
    const rng2 = createSeededRng(2);
    assert.equal(rollTrap(5, rng2).isMagic, true);
  });
});

describe("rollNpc scoundrel class group", () => {
  it("only returns bard or rogue", () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 40; i += 1) {
      const npc = rollNpc(rng, {
        gender: "any",
        race: "any",
        classOrder: "scoundrel",
      });
      const key = npc.className.toLowerCase();
      assert.ok(key === "bard" || key === "rogue", `unexpected class ${key}`);
    }
  });
});

describe("rollSpellbook mundane", () => {
  it("never includes a spell above level 1", () => {
    const fakePool: Record<number, SpellRef[]> = {
      0: [{ slug: "a", name: "A", level: 0 }],
      1: [{ slug: "b", name: "B", level: 1 }],
      2: [{ slug: "c", name: "C", level: 2 }],
      3: [{ slug: "d", name: "D", level: 3 }],
    };
    const rng = createSeededRng(123);
    const book = rollSpellbook("mundane", rng, fakePool);
    for (const spell of book.spells) {
      assert.ok(spell.level <= 1, `level ${spell.level} too high`);
    }
  });
});

describe("rollPickpocketFallback", () => {
  it("stays under 20 gp", () => {
    const rng = createSeededRng(555);
    for (let i = 0; i < 50; i += 1) {
      const coins = rollPickpocketFallback(rng);
      assert.ok(coins.totalGp < 20);
    }
  });
});
