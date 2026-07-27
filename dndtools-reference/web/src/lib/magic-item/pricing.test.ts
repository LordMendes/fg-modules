import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeWeaponPrice,
  computeWeaponCrafting,
  computeArmorPrice,
  computeArmorCrafting,
} from "./index";
import type { ArmorBuildState, WeaponBuildState } from "./types";

function weaponBuild(
  partial: Partial<WeaponBuildState> & Pick<WeaponBuildState, "weaponId">,
): WeaponBuildState {
  return {
    enhancementBonus: 0,
    abilities: [],
    ...partial,
  };
}

function armorBuild(
  partial: Partial<ArmorBuildState> & Pick<ArmorBuildState, "gearId">,
): ArmorBuildState {
  return {
    enhancementBonus: 0,
    abilities: [],
    ...partial,
  };
}

describe("computeWeaponPrice", () => {
  it("prices +1 longsword at 2,315 gp (DMG Table 7-9)", () => {
    const result = computeWeaponPrice(
      weaponBuild({ weaponId: "longsword", enhancementBonus: 1 }),
    );
    assert.equal(result.totalGp, 2315);
    assert.equal(result.itemName, "+1 longsword");
    assert.equal(result.lines[0]?.label, "Longsword");
    assert.equal(result.lines[0]?.gp, 15);
  });

  it("prices +2 longsword at 8,315 gp", () => {
    const result = computeWeaponPrice(
      weaponBuild({ weaponId: "longsword", enhancementBonus: 2 }),
    );
    assert.equal(result.totalGp, 8315);
  });

  it("prices +1 undead bane bastard sword at 8,335 gp", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "bastard-sword",
        enhancementBonus: 1,
        abilities: [{ abilityId: "bane", subtype: "undead" }],
      }),
    );
    assert.equal(result.totalGp, 8335);
    assert.equal(result.itemName, "+1 undead bane bastard sword");
  });

  it("matches DMG Holy longsword +2 table price (18,315 gp)", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "longsword",
        enhancementBonus: 1,
        abilities: [{ abilityId: "holy" }],
      }),
    );
    assert.equal(result.totalGp, 18315);
  });

  it("prices +3 holy bane longsword at 72,315 gp (+6 equivalent)", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "longsword",
        enhancementBonus: 3,
        abilities: [{ abilityId: "holy" }, { abilityId: "bane", subtype: "undead" }],
      }),
    );
    assert.equal(result.totalGp, 72315);
    assert.equal(result.equivalentTotal, 6);
  });

  it("prices +1 furious longsword at 8,315 gp (Complete Warrior, +2 equiv)", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "longsword",
        enhancementBonus: 1,
        abilities: [{ abilityId: "cw-furious" }],
      }),
    );
    assert.equal(result.totalGp, 8315);
    assert.equal(result.equivalentTotal, 2);
  });

  it("prices +1 skillful longsword at 18,315 gp (Complete Arcane, +3 equiv)", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "longsword",
        enhancementBonus: 1,
        abilities: [{ abilityId: "car-skillful" }],
      }),
    );
    assert.equal(result.totalGp, 18315);
    assert.equal(result.equivalentTotal, 3);
  });

  it("warns when special abilities are chosen without +1 enhancement", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "bastard-sword",
        enhancementBonus: 0,
        abilities: [{ abilityId: "bane", subtype: "undead" }],
      }),
    );
    assert.ok(result.warnings.some((w) => w.includes("at least +1")));
    assert.equal(result.totalGp, 2335);
  });

  it("warns when bane has no subtype", () => {
    const result = computeWeaponPrice(
      weaponBuild({
        weaponId: "longsword",
        enhancementBonus: 1,
        abilities: [{ abilityId: "bane" }],
      }),
    );
    assert.ok(result.warnings.some((w) => w.includes("subtype")));
  });
});

describe("computeWeaponCrafting", () => {
  it("computes materials, XP, and days for 8,335 gp weapon", () => {
    const craft = computeWeaponCrafting(8335, 1, [
      { abilityId: "bane", subtype: "undead" },
    ]);
    assert.equal(craft.materialsGp, 4168);
    assert.equal(craft.xp, 333);
    assert.equal(craft.days, 9);
    assert.equal(craft.minCasterLevel, 8);
  });
});

describe("computeArmorPrice", () => {
  it("prices +1 full plate at 2,650 gp", () => {
    const result = computeArmorPrice(
      armorBuild({ gearId: "full-plate", enhancementBonus: 1 }),
    );
    assert.equal(result.totalGp, 2650);
    assert.equal(result.itemName, "+1 full plate");
    assert.equal(result.lines[0]?.label, "Full plate");
    assert.equal(result.lines[0]?.gp, 1650);
  });

  it("prices +2 breastplate at 4,350 gp", () => {
    const result = computeArmorPrice(
      armorBuild({ gearId: "breastplate", enhancementBonus: 2 }),
    );
    assert.equal(result.totalGp, 4350);
  });

  it("prices +1 slick chain shirt at 5,000 gp", () => {
    const result = computeArmorPrice(
      armorBuild({
        gearId: "chain-shirt",
        enhancementBonus: 1,
        abilities: [{ abilityId: "slick" }],
      }),
    );
    assert.equal(result.totalGp, 5000);
  });

  it("prices +1 ghost touch full plate at 17,650 gp (+4 equivalent)", () => {
    const result = computeArmorPrice(
      armorBuild({
        gearId: "full-plate",
        enhancementBonus: 1,
        abilities: [{ abilityId: "ghost-touch" }],
      }),
    );
    assert.equal(result.totalGp, 17650);
    assert.equal(result.equivalentTotal, 4);
  });

  it("warns when special abilities are chosen without +1 enhancement", () => {
    const result = computeArmorPrice(
      armorBuild({
        gearId: "buckler",
        enhancementBonus: 0,
        abilities: [{ abilityId: "glamered" }],
      }),
    );
    assert.ok(result.warnings.some((w) => w.includes("at least +1")));
  });
});

describe("computeArmorCrafting", () => {
  it("computes materials, XP, and days for 2,650 gp armor", () => {
    const craft = computeArmorCrafting(2650, 1, []);
    assert.equal(craft.materialsGp, 1325);
    assert.equal(craft.xp, 106);
    assert.equal(craft.days, 3);
  });
});
