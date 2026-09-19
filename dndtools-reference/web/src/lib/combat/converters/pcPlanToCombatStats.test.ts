import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pcPlanToCombatStats } from "../combatMutations";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";

describe("converters/pcPlanToCombatStats", () => {
  it("builds fighter +1 longsword with BAB 6 iteratives", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.abilities.str = 16;
    state.abilities.dex = 12;
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        damageS: "1d6",
        critical: "19-20/x2",
        damageType: "S",
        enhancementBonus: 1,
        handed: "one",
        weaponHand: "main",
        equipped: true,
      },
    ];

    const block = pcPlanToCombatStats("Fighter", state);
    assert.equal(block.attacks.length, 1);

    const attack = block.attacks[0]!;
    assert.deepEqual(attack.iterativeBonuses, [10, 5]);
    assert.equal(attack.bonus, 10);
    assert.deepEqual(attack.damageTypes, ["slashing", "magic"]);
    assert.equal(attack.threatMin, 19);
    assert.equal(attack.critMultiplier, 2);
    assert.equal(attack.mode, "melee");
    assert.match(attack.damage, /1d8\+4/);
    assert.equal(block.stats.str, 3);
  });
});
