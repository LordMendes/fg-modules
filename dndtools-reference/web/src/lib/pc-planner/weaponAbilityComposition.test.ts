import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDamageAbilityMult,
  defaultAttackAbility,
  defaultDamageAbility,
  defaultDamageAbilityMult,
  resolveAttackAbility,
  resolveDamageAbility,
} from "./weaponAbilityComposition";
import type { InventoryRow } from "./types";

const baseAbilities = {
  str: 16,
  dex: 12,
  con: 10,
  int: 10,
  wis: 18,
  cha: 8,
};

describe("applyDamageAbilityMult", () => {
  it("applies 1.5 to positive mods only", () => {
    assert.equal(applyDamageAbilityMult(4, 1.5), 6);
    assert.equal(applyDamageAbilityMult(3, 1.5), 4);
    assert.equal(applyDamageAbilityMult(3, 1), 3);
  });

  it("keeps full negative penalty", () => {
    assert.equal(applyDamageAbilityMult(-2, 1.5), -2);
  });
});

describe("defaults", () => {
  it("auto attack is Dex for ranged", () => {
    const row: InventoryRow = {
      name: "Longbow",
      quantity: 1,
      weight: 3,
      kind: "weapon",
      handed: "ranged",
    };
    assert.equal(defaultAttackAbility(row, []), "dex");
    assert.equal(defaultDamageAbility(row), "none");
    assert.equal(defaultDamageAbilityMult(row), 1);
  });

  it("auto attack is Str for melee longsword", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      handed: "one",
    };
    assert.equal(defaultAttackAbility(row, []), "str");
    assert.equal(defaultDamageAbility(row), "str");
    assert.equal(defaultDamageAbilityMult(row), 1);
  });

  it("auto multiplier is 1.5 for two-handed", () => {
    const row: InventoryRow = {
      name: "Greataxe",
      quantity: 1,
      weight: 12,
      kind: "weapon",
      handed: "two",
    };
    assert.equal(defaultDamageAbilityMult(row), 1.5);
  });
});

describe("resolveAttackAbility", () => {
  it("uses Wis override when set", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      handed: "one",
      attackAbility: "wis",
    };
    const resolved = resolveAttackAbility(row, {
      abilities: baseAbilities,
      feats: [],
    });
    assert.equal(resolved.key, "wis");
    assert.equal(resolved.mod, 4);
    assert.equal(resolved.label, "Wis");
  });

  it("none contributes zero", () => {
    const row: InventoryRow = {
      name: "Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      attackAbility: "none",
    };
    const resolved = resolveAttackAbility(row, {
      abilities: baseAbilities,
      feats: [],
    });
    assert.equal(resolved.mod, 0);
    assert.equal(resolved.key, "none");
  });
});

describe("resolveDamageAbility", () => {
  it("honors none ability with explicit 1.5 mult", () => {
    const row: InventoryRow = {
      name: "Greataxe",
      quantity: 1,
      weight: 12,
      kind: "weapon",
      handed: "two",
      damageAbility: "none",
      damageAbilityMult: 1.5,
    };
    const resolved = resolveDamageAbility(row, {
      abilities: baseAbilities,
      feats: [],
    });
    assert.equal(resolved.mod, 0);
    assert.equal(resolved.mult, 1.5);
  });

  it("applies 1.5 mult to Str on two-hander by default", () => {
    const row: InventoryRow = {
      name: "Greataxe",
      quantity: 1,
      weight: 12,
      kind: "weapon",
      handed: "two",
    };
    const resolved = resolveDamageAbility(row, {
      abilities: baseAbilities,
      feats: [],
    });
    assert.equal(resolved.mod, 4);
    assert.equal(resolved.mult, 1.5);
  });
});
