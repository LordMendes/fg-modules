import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { computeCombatStats } from "@/lib/pc-planner/combatStats";
import { computeWeaponAttackRows } from "@/lib/pc-planner/weaponAttacks";
import {
  compareDamageStatistics,
  computeDamageStatistic,
  expectedDamageForAttack,
  hitChanceVsAc,
  threatChance,
} from "./expected-damage";
import type { DamageStatisticInput } from "./types";

function fighterLongswordState() {
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
      handed: "one",
      weaponHand: "main",
      equipped: true,
    },
  ];
  return state;
}

describe("damage-statistic expected damage", () => {
  it("computes hit chance with natural 1 and 20 floors", () => {
    assert.equal(hitChanceVsAc(9, 15), 0.75);
    assert.equal(hitChanceVsAc(25, 10), 0.95);
    assert.equal(hitChanceVsAc(5, 25), 0.05);
  });

  it("computes threat chance for 19-20", () => {
    assert.equal(threatChance(19), 0.1);
  });

  it("computes longsword +9 expected damage vs AC 15", () => {
    const state = fighterLongswordState();
    const stats = computeCombatStats(state);
    const weaponRow = computeWeaponAttackRows(state, stats)[0]!;
    assert.equal(weaponRow.attackBonus, 9);

    const expected = expectedDamageForAttack(
      9,
      15,
      weaponRow,
      state.inventory[0]!,
      [],
      weaponRow.damageModifier,
    );
    assert.equal(Math.round(expected * 1000) / 1000, 6.188);
  });

  it("sums full attack iteratives", () => {
    const state = fighterLongswordState();
    const stats = computeCombatStats(state);
    const weaponRow = computeWeaponAttackRows(state, stats)[0]!;
    assert.deepEqual(weaponRow.fullAttackBonuses, [9, 4]);

    const first = expectedDamageForAttack(
      9,
      15,
      weaponRow,
      state.inventory[0]!,
      [],
      weaponRow.damageModifier,
    );
    const second = expectedDamageForAttack(
      4,
      15,
      weaponRow,
      state.inventory[0]!,
      [],
      weaponRow.fullAttackDamageModifier,
    );
    assert.equal(Math.round((first + second) * 1000) / 1000, 10.313);
  });

  it("applies DR to physical only while energy still adds", () => {
    const baseInput: DamageStatisticInput = {
      attacker: {
        bab: 6,
        str: 16,
        dex: 12,
        sizeMod: 0,
        powerAttack: 0,
        meleeMisc: 0,
        rangedMisc: 0,
        feats: [],
      },
      weapon: {
        name: "Flaming Longsword +1",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        damageType: "S",
        handed: "one",
        enhancementBonus: 1,
        weaponHand: "main",
        equipped: true,
        damageLines: [
          {
            id: "primary",
            dice: "1d8",
            type: "S",
            multiplyOnCrit: true,
          },
          {
            id: "fire",
            dice: "1d6",
            type: "fire",
            multiplyOnCrit: false,
          },
        ],
      },
      target: {
        acMin: 15,
        acMax: 15,
        dr: [],
      },
    };

    const withoutDr = computeDamageStatistic(baseInput);
    const withDr = computeDamageStatistic({
      ...baseInput,
      target: {
        ...baseInput.target,
        dr: [{ id: "dr5", amount: 5, bypass: "-" }],
      },
    });
    assert.ok(withoutDr && withDr);
    assert.ok(withDr.rows[0]!.standardDamage < withoutDr.rows[0]!.standardDamage);
    assert.ok(withDr.rows[0]!.standardDamage > 0);
  });

  it("magic enhancement bypasses DR/magic", () => {
    const input: DamageStatisticInput = {
      attacker: {
        bab: 6,
        str: 16,
        dex: 12,
        sizeMod: 0,
        powerAttack: 0,
        meleeMisc: 0,
        rangedMisc: 0,
        feats: [],
      },
      weapon: {
        name: "Longsword +1",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        damageM: "1d8",
        critical: "19-20/x2",
        damageType: "S",
        handed: "one",
        enhancementBonus: 1,
        weaponHand: "main",
        equipped: true,
      },
      target: {
        acMin: 15,
        acMax: 15,
        dr: [{ id: "dr5magic", amount: 5, bypass: "magic" }],
      },
    };

    const withoutBypass = computeDamageStatistic({
      ...input,
      weapon: { ...input.weapon, enhancementBonus: 0 },
    });
    const withBypass = computeDamageStatistic(input);
    assert.ok(withoutBypass && withBypass);
    assert.ok(withBypass.rows[0]!.standardDamage > withoutBypass.rows[0]!.standardDamage);
  });

  it("compares longsword and greatsword expected damage", () => {
    const attacker = {
      bab: 6,
      str: 16,
      dex: 12,
      sizeMod: 0,
      powerAttack: 0,
      meleeMisc: 0,
      rangedMisc: 0,
      feats: [],
    };
    const target = { acMin: 15, acMax: 15, dr: [] };
    const comparison = compareDamageStatistics(
      {
        attacker,
        target,
        weapon: {
          name: "Longsword",
          quantity: 1,
          weight: 4,
          kind: "weapon",
          damageM: "1d8",
          critical: "19-20/x2",
          damageType: "S",
          handed: "one",
          weaponHand: "main",
          equipped: true,
        },
      },
      {
        attacker,
        target,
        weapon: {
          name: "Greatsword",
          quantity: 1,
          weight: 8,
          kind: "weapon",
          damageM: "2d6",
          critical: "19-20/x2",
          damageType: "S",
          handed: "two",
          weaponHand: "main",
          equipped: true,
        },
      },
    );
    assert.ok(comparison);
    const row = comparison.rows[0]!;
    assert.ok(row.b.standardDamage > row.a.standardDamage);
    assert.equal(
      Math.round(row.standardDelta * 1000) / 1000,
      Math.round((row.b.standardDamage - row.a.standardDamage) * 1000) / 1000,
    );
    assert.equal(
      Math.round(row.fullAttackDelta * 1000) / 1000,
      Math.round((row.b.fullAttackDamage - row.a.fullAttackDamage) * 1000) / 1000,
    );
  });
});
