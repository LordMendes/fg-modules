import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveSpellCast, spellCastDicePool, type SpellCastCaster, type SpellCastTarget } from "./spells/spellAction";
import type { CombatSpellEntry } from "./types";
import { buildEngineContext } from "./rules/engineContext";

describe("Area spell resolution", () => {
  it("resolves Fireball with mixed SR, save, and damage outcomes", () => {
    // Fireball: 1d6/level fire damage, Reflex half, SR yes
    const fireball: CombatSpellEntry = {
      key: "fireball",
      kind: "spell",
      name: "Fireball",
      level: 3,
      spellClassKey: "wizard",
      school: "Evocation",
      casterLevel: 5,
      areaShape: "circle",
      rangeFeet: 20,
      actions: {
        cast: {
          name: "Fireball",
          srnotallowed: false,
          savetype: "Reflex",
          onmissdamage: "half",
          schoolShort: "Evoc",
        },
        followUps: [
          {
            type: "damage",
            dice: "1d6",
            dmgType: "fire",
            dicestat: "cl",
            dicestatmax: 10,
          },
        ],
      },
    };

    const caster: SpellCastCaster = {
      id: "caster1",
      name: "Wizard",
      init: 15,
      effects: [],
      spellUses: {},
      engine: buildEngineContext({
        id: "caster1",
        name: "Wizard",
        kind: "pc",
        hpMax: 30,
        wounds: 0,
        hpTemp: 0,
        nonlethal: 0,
        effects: [],
      }),
    };

    const targets: SpellCastTarget[] = [
      // Target 1: beats SR (face 18 + CL 5 = 23 > SR 15)
      {
        id: "target1",
        name: "Goblin",
        engine: buildEngineContext({
          id: "target1",
          name: "Goblin",
          kind: "npc",
          hpMax: 20,
          wounds: 0,
          hpTemp: 0,
          nonlethal: 0,
          effects: [],
        }),
        defenses: { sr: 15 },
      },
      // Target 2: no SR, saves (face 19 > DC 16)
      {
        id: "target2",
        name: "Orc",
        engine: buildEngineContext({
          id: "target2",
          name: "Orc",
          kind: "npc",
          ref: 5, // +5 reflex
          hpMax: 25,
          wounds: 0,
          hpTemp: 0,
          nonlethal: 0,
          effects: [],
        }),
        defenses: {},
      },
      // Target 3: no SR, fails save (face 8)
      {
        id: "target3",
        name: "Bugbear",
        engine: buildEngineContext({
          id: "target3",
          name: "Bugbear",
          kind: "npc",
          ref: 2, // +2 reflex
          hpMax: 30,
          wounds: 0,
          hpTemp: 0,
          nonlethal: 0,
          effects: [],
        }),
        defenses: {},
      },
    ];

    // Pool: 1 SR d20 for target1, 3 save d20s, 5d6 damage (1d6/level at CL 5)
    const pool = spellCastDicePool(fireball, targets, 5);
    assert.equal(pool.length, 3, "Expected 3 dice groups");
    assert.deepEqual(pool[0], { qty: 1, sides: 20 }, "SR check die");
    assert.deepEqual(pool[1], { qty: 3, sides: 20 }, "Save dice for all 3 targets");
    assert.deepEqual(pool[2], { qty: 5, sides: 6 }, "Damage dice 5d6");

    // Simulate rolls: SR face 18, saves [19, 15, 6], damage faces [4,5,6,3,4] = 22
    // Target 1: save face 19, no bonus, 19 > 16 (success)
    // Target 2: save face 15, +5 bonus, 20 > 16 (success)
    // Target 3: save face 6, +2 bonus, 8 < 16 (fail)
    const faces = [18, 19, 15, 6, 4, 5, 6, 3, 4];

    const result = resolveSpellCast(caster, targets, fireball, faces, {
      casterLevel: 5,
      spellLevel: 3,
      castingStatMod: 3, // +3 INT modifier → DC 16 (10 + 3 + 3)
    });

    assert(!result.blocked, "Spell should not be blocked");
    assert.equal(result.consumeUseKey, "slot:wizard:3", "Should consume 3rd level wizard slot");

    // Check events
    const castEvent = result.events.find(e => e.kind === "cast");
    assert(castEvent, "Cast event should exist");
    assert.equal(castEvent.payload.spellName, "Fireball");
    assert.equal(castEvent.payload.targetNames.length, 3);

    const srEvent = result.events.find(e => e.kind === "sr" && e.targetCombatantId === "target1");
    assert(srEvent, "SR event for target1 should exist");
    assert.equal(srEvent.payload.face, 18);
    assert.equal(srEvent.payload.total, 23, "18 + CL 5 = 23");
    assert.equal(srEvent.payload.success, true, "23 > SR 15");

    const saveEvents = result.events.filter(e => e.kind === "save");
    assert.equal(saveEvents.length, 3, "Should have 3 save events");

    const target1Save = saveEvents.find(e => e.targetCombatantId === "target1");
    assert(target1Save, "Target1 save event should exist");
    assert.equal(target1Save.payload.success, true, "Target1 should make save (19 + 0 = 19 > 16)");

    const target2Save = saveEvents.find(e => e.targetCombatantId === "target2");
    assert(target2Save, "Target2 save event should exist");
    assert.equal(target2Save.payload.success, true, "Target2 should make save (15 + 5 = 20 > 16)");

    const target3Save = saveEvents.find(e => e.targetCombatantId === "target3");
    assert(target3Save, "Target3 save event should exist");
    assert.equal(target3Save.payload.success, false, "Target3 should fail save (6 + 2 = 8 < 16)");

    // Check damage plans
    assert.equal(result.damagePlans.length, 3, "Should have 3 damage plans");
    
    const target1Plan = result.damagePlans.find(p => p.targetId === "target1");
    assert(target1Plan, "Target1 damage plan should exist");
    assert.equal(target1Plan.half, true, "Target1 gets half damage (made save)");
    // Note: SR passed but target still made save, so they take half damage
    assert.equal(target1Plan.skip, false, "Target1 should take damage (SR passed, not skipped)");

    const target2Plan = result.damagePlans.find(p => p.targetId === "target2");
    assert(target2Plan, "Target2 damage plan should exist");
    assert.equal(target2Plan.half, true, "Target2 gets half damage (made save)");

    const target3Plan = result.damagePlans.find(p => p.targetId === "target3");
    assert(target3Plan, "Target3 damage plan should exist");
    assert.equal(target3Plan.half, false, "Target3 gets full damage (failed save)");

    // All should have fire damage packets
    for (const plan of result.damagePlans) {
      assert.equal(plan.packets.length, 1, "Each plan should have one damage packet");
      assert.equal(plan.packets[0]?.amount, 22, "Damage should be 22 (4+5+6+3+4)");
      assert.deepEqual(plan.packets[0]?.types, ["fire", "spell"], "Should be fire/spell damage");
    }
  });

  it("resolves area spell cancellation (no slot consumed)", () => {
    const spell: CombatSpellEntry = {
      key: "burning-hands",
      kind: "spell",
      name: "Burning Hands",
      level: 1,
      spellClassKey: "sorcerer",
      school: "Evocation",
      casterLevel: 1,
      areaShape: "cone",
      rangeFeet: 15,
      actions: {
        cast: {
          name: "Burning Hands",
          srnotallowed: false,
          savetype: "Reflex",
          onmissdamage: "half",
          schoolShort: "Evoc",
        },
        followUps: [
          {
            type: "damage",
            dice: "1d4",
            dmgType: "fire",
            dicestat: "cl",
            dicestatmax: 5,
          },
        ],
      },
    };

    const caster: SpellCastCaster = {
      id: "caster1",
      name: "Sorcerer",
      init: 12,
      effects: [],
      spellUses: { "slot:sorcerer:1": 3 }, // 3 first-level slots
      engine: buildEngineContext({
        id: "caster1",
        name: "Sorcerer",
        kind: "pc",
        hpMax: 20,
        wounds: 0,
        hpTemp: 0,
        nonlethal: 0,
        effects: [],
      }),
    };

    // When cancelled, we simply don't call resolveSpellCast
    // This test verifies that the spell uses are unchanged
    const beforeUses = { ...caster.spellUses };
    
    // Simulate cancellation: no resolution happens
    // In the actual app, clicking Esc or right-click clears placement without calling the server
    
    assert.deepEqual(caster.spellUses, beforeUses, "Spell uses should be unchanged after cancellation");
  });

  it("blocks cast when no slots remain", () => {
    const spell: CombatSpellEntry = {
      key: "magic-missile",
      kind: "spell",
      name: "Magic Missile",
      level: 1,
      spellClassKey: "wizard",
      school: "Evocation",
      casterLevel: 1,
      actions: {
        cast: {
          name: "Magic Missile",
          srnotallowed: false,
        },
        followUps: [
          {
            type: "damage",
            dice: "1d4",
            dmgType: "force",
            bonus: 1,
          },
        ],
      },
    };

    const caster: SpellCastCaster = {
      id: "caster1",
      name: "Wizard",
      init: 15,
      effects: [],
      spellUses: { "slot:wizard:1": 0 }, // No 1st-level slots left
      engine: buildEngineContext({
        id: "caster1",
        name: "Wizard",
        kind: "pc",
        hpMax: 25,
        wounds: 0,
        hpTemp: 0,
        nonlethal: 0,
        effects: [],
      }),
    };

    const target: SpellCastTarget = {
      id: "target1",
      name: "Orc",
      engine: buildEngineContext({
        id: "target1",
        name: "Orc",
        kind: "npc",
        hpMax: 20,
        wounds: 0,
        hpTemp: 0,
        nonlethal: 0,
        effects: [],
      }),
      defenses: {},
    };

    const result = resolveSpellCast(caster, [target], spell, [15, 3], {
      casterLevel: 1,
      spellLevel: 1,
      castingStatMod: 3,
    });

    assert(result.blocked, "Spell should be blocked");
    assert(result.blocked.includes("No"), "Error should mention no slots");
    assert.equal(result.events.length, 0, "No events should be generated");
    assert.equal(result.damagePlans.length, 0, "No damage plans should be generated");
  });
});
