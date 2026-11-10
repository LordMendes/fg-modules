import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pcPlanToCombatSpells } from "./pcCombatSpells";
import type { PcPlanState } from "@/lib/pc-planner/types";

describe("pcPlanToCombatSpells", () => {
  it("converts single wizard spell class with bonus slots", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          dcAbility: "int",
          mode: "preparation",
          spells: [
            { name: "Magic Missile", slug: "magic-missile", level: 1, prepared: 2 },
            { name: "Fireball", slug: "fireball", level: 3, prepared: 1 },
          ],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    assert.equal(result.spellClasses.length, 1);
    const wizClass = result.spellClasses[0];
    assert.equal(wizClass.label, "Wizard");
    assert.equal(wizClass.classSlug, "wizard");
    assert.equal(wizClass.casterLevel, 3);
    assert.equal(wizClass.dcAbility, "int");
    assert.equal(wizClass.dcModifier, 3);
    assert.equal(wizClass.mode, "preparation");
    assert.equal(wizClass.key, "wizard");

    // Base slots: Wiz 3 = L0:4, L1:2, L2:1 (no bonus yet)
    assert.equal(wizClass.baseSlots[0], 4);
    assert.equal(wizClass.baseSlots[1], 2);
    assert.equal(wizClass.baseSlots[2], 1);

    // Bonus from Int 16 (+3): +1 on L1 and L2
    assert.equal(wizClass.bonusSlots[1], 1);
    assert.equal(wizClass.bonusSlots[2], 1);

    // Total = base + bonus
    assert.equal(wizClass.totalSlots[0], 4);
    assert.equal(wizClass.totalSlots[1], 3);
    assert.equal(wizClass.totalSlots[2], 2);

    assert.equal(wizClass.maxSpellLevel, 2);

    // Check spell entries
    assert.equal(result.spells.length, 2);
    assert.equal(result.spells[0].name, "Magic Missile");
    assert.equal(result.spells[0].level, 1);
    assert.equal(result.spells[0].spellClassKey, "wizard");
    assert.equal(result.spells[1].name, "Fireball");
    assert.equal(result.spells[1].level, 3);

    // Check spell uses (slots remaining)
    assert.equal(result.spellUses["slot:wizard:0"], 4);
    assert.equal(result.spellUses["slot:wizard:1"], 3);
    assert.equal(result.spellUses["slot:wizard:2"], 2);
  });

  it("handles multiple spell classes with unique keys", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 16, cha: 10 },
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
          spells: [{ name: "Cure Light Wounds", slug: "cure-light-wounds", level: 1, prepared: 1 }],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    assert.equal(result.spellClasses.length, 2);
    
    const wizClass = result.spellClasses[0];
    assert.equal(wizClass.key, "wizard");
    assert.equal(wizClass.dcAbility, "int");
    assert.equal(wizClass.dcModifier, 2);

    const clericClass = result.spellClasses[1];
    assert.equal(clericClass.key, "cleric-2");
    assert.equal(clericClass.dcAbility, "wis");
    assert.equal(clericClass.dcModifier, 3);

    // Check spell class keys on spells
    assert.equal(result.spells[0].spellClassKey, "wizard");
    assert.equal(result.spells[1].spellClassKey, "cleric-2");

    // Check per-class slot tracking
    assert.ok(result.spellUses["slot:wizard:1"]);
    assert.ok(result.spellUses["slot:cleric-2:1"]);
  });

  it("handles sorcerer spontaneous casting with spells known", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 },
      spellClasses: [
        {
          label: "Sorcerer",
          classSlug: "sorcerer",
          casterLevel: 3,
          dcAbility: "cha",
          mode: "spontaneous",
          spells: [
            { name: "Ray of Frost", slug: "ray-of-frost", level: 0 },
            { name: "Magic Missile", slug: "magic-missile", level: 1 },
          ],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    const sorcClass = result.spellClasses[0];
    assert.equal(sorcClass.mode, "spontaneous");
    assert.equal(sorcClass.dcAbility, "cha");
    assert.equal(sorcClass.dcModifier, 3);

    // Sorcerer 3 with Cha 16: L0=6 (base), L1=6 (5 base + 1 bonus)
    assert.equal(sorcClass.totalSlots[0], 6);
    assert.equal(sorcClass.totalSlots[1], 6);

    // Spells known for sorc 3: L0=5, L1=3
    assert.equal(sorcClass.known[0], 5);
    assert.equal(sorcClass.known[1], 3);
  });

  it("tracks slot usage from slotsUsed field", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          dcAbility: "int",
          mode: "preparation",
          spells: [],
          slotsUsed: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    // Total Wiz 3 with Int 14: L0=4, L1=3, L2=2
    // Used: L1=1, L2=1
    // Remaining: L1=2, L2=1
    assert.equal(result.spellUses["slot:wizard:0"], 4);
    assert.equal(result.spellUses["slot:wizard:1"], 2);
    assert.equal(result.spellUses["slot:wizard:2"], 1);
  });

  it("handles casterLevelOverride", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
      spellClasses: [
        {
          label: "Wizard",
          classSlug: "wizard",
          casterLevel: 3,
          casterLevelOverride: 5,
          dcAbility: "int",
          mode: "preparation",
          spells: [{ name: "Fireball", slug: "fireball", level: 3, prepared: 1 }],
        },
      ],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    // Spell should use override CL
    assert.equal(result.spells[0].casterLevel, 5);
    // But spell class uses normal CL for DC
    assert.equal(result.spellClasses[0].casterLevel, 5);
  });

  it("empty spell classes returns empty arrays", () => {
    const state: PcPlanState = {
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      spellClasses: [],
    } as PcPlanState;

    const result = pcPlanToCombatSpells(state);

    assert.equal(result.spellClasses.length, 0);
    assert.equal(result.spells.length, 0);
    assert.deepEqual(result.spellUses, {});
  });
});
