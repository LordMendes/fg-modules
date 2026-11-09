import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pcPlanToCombatSpells } from "./converters/pcCombatSpells";
import type { PcPlanState } from "@/lib/pc-planner/types";

describe("multiclass spell slots", () => {
  it("two-class caster has independent slot pools", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 16, cha: 10 },
      feats: [],
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          dcAbility: "int",
          mode: "preparation",
          spells: [{ name: "Magic Missile", slug: "magic-missile", level: 1, prepared: 1 }],
          slotsUsed: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          label: "Cleric",
          classSlug: "cleric",
          casterLevel: 2,
          dcAbility: "wis",
          mode: "preparation",
          spells: [
            { name: "Cure Light Wounds", slug: "cure-light-wounds", level: 1, prepared: 1 },
          ],
          slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    assert.equal(result.spellClasses.length, 2);

    const wizClass = result.spellClasses[0];
    const clericClass = result.spellClasses[1];

    assert.equal(wizClass.key, "wizard");
    assert.equal(clericClass.key, "cleric-2");

    // Wizard 3 with Int 14: L0=4, L1=2+1=3, L2=1+1=2
    assert.equal(wizClass.totalSlots[0], 4);
    assert.equal(wizClass.totalSlots[1], 3);
    assert.equal(wizClass.totalSlots[2], 2);

    // Cleric 2 with Wis 16: L0=4, L1=2+1=3
    assert.equal(clericClass.totalSlots[0], 4);
    assert.equal(clericClass.totalSlots[1], 3);

    // Check independent slot tracking
    // Wizard used 1 first-level slot (3 total - 1 used = 2 remaining)
    assert.equal(result.spellUses["slot:wizard:1"], 2);
    // Cleric used 0 first-level slots (3 total - 0 used = 3 remaining)
    assert.equal(result.spellUses["slot:cleric-2:1"], 3);

    // Verify no legacy `slot:1` key is present
    assert.equal(result.spellUses["slot:1"], undefined);
  });

  it("casting from one class does not affect the other", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 14, cha: 10 },
      feats: [],
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          dcAbility: "int",
          mode: "preparation",
          spells: [{ name: "Magic Missile", slug: "magic-missile", level: 1, prepared: 2 }],
          slotsUsed: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          label: "Cleric",
          classSlug: "cleric",
          casterLevel: 2,
          dcAbility: "wis",
          mode: "preparation",
          spells: [
            { name: "Cure Light Wounds", slug: "cure-light-wounds", level: 1, prepared: 1 },
          ],
          slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    // Wizard used 2 of 3 first-level slots (3 total - 2 used = 1 remaining)
    assert.equal(result.spellUses["slot:wizard:1"], 1);
    // Cleric still has all 3 first-level slots (3 total - 0 used = 3 remaining)
    assert.equal(result.spellUses["slot:cleric-2:1"], 3);
  });

  it("spells are tagged with correct spellClassKey", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 14, cha: 10 },
      feats: [],
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          dcAbility: "int",
          mode: "preparation",
          spells: [{ name: "Magic Missile", slug: "magic-missile", level: 1, prepared: 1 }],
        },
        {
          label: "Cleric",
          classSlug: "cleric",
          casterLevel: 2,
          dcAbility: "wis",
          mode: "preparation",
          spells: [
            { name: "Cure Light Wounds", slug: "cure-light-wounds", level: 1, prepared: 1 },
          ],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    assert.equal(result.spells.length, 2);
    assert.equal(result.spells[0].spellClassKey, "wizard");
    assert.equal(result.spells[1].spellClassKey, "cleric-2");
  });
});
