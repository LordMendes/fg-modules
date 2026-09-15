import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FeatEntry, InventoryRow } from "./types";
import {
  computeWeaponFeatBonuses,
  formatFeatDisplayName,
  stripMagicWeaponPrefix,
  weaponMatchesChoice,
} from "./weaponFeatBonuses";

describe("stripMagicWeaponPrefix", () => {
  it("removes enhancement and energy prefixes", () => {
    assert.equal(stripMagicWeaponPrefix("+1 flaming longsword"), "longsword");
    assert.equal(stripMagicWeaponPrefix("Longsword"), "Longsword");
  });
});

describe("weaponMatchesChoice", () => {
  it("matches slug and magic-prefixed names", () => {
    const row: InventoryRow = {
      name: "+1 Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      slug: "longsword",
    };
    assert.equal(weaponMatchesChoice(row, "longsword"), true);
    assert.equal(weaponMatchesChoice(row, "Longsword"), true);
    assert.equal(weaponMatchesChoice(row, "greataxe"), false);
  });
});

describe("computeWeaponFeatBonuses", () => {
  it("applies Weapon Focus and Specialization to a matching weapon", () => {
    const item: InventoryRow = {
      name: "+1 Longsword",
      quantity: 1,
      weight: 4,
      kind: "weapon",
      slug: "longsword",
    };
    const feats: FeatEntry[] = [
      { slug: "weapon-focus", name: "Weapon Focus", choice: "longsword" },
      {
        slug: "weapon-specialization",
        name: "Weapon Specialization",
        choice: "longsword",
      },
    ];
    const bonuses = computeWeaponFeatBonuses(feats, item);
    assert.equal(bonuses.attack, 1);
    assert.equal(bonuses.damage, 2);
    assert.ok(bonuses.attackParts.some((p) => p.label === "Weapon Focus"));
    assert.ok(
      bonuses.damageParts.some((p) => p.label === "Weapon Specialization"),
    );
  });

  it("ignores feats for a different weapon", () => {
    const item: InventoryRow = {
      name: "Greataxe",
      quantity: 1,
      weight: 12,
      kind: "weapon",
      slug: "greataxe",
    };
    const feats: FeatEntry[] = [
      { slug: "weapon-focus", name: "Weapon Focus", choice: "longsword" },
    ];
    const bonuses = computeWeaponFeatBonuses(feats, item);
    assert.equal(bonuses.attack, 0);
    assert.equal(bonuses.damage, 0);
  });
});

describe("formatFeatDisplayName", () => {
  it("includes the chosen weapon", () => {
    assert.equal(
      formatFeatDisplayName({
        slug: "weapon-focus",
        name: "Weapon Focus",
        choice: "longsword",
      }),
      "Weapon Focus (longsword)",
    );
  });
});
