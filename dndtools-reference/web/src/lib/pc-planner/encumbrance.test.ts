import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import { computeEquippedGear } from "./equippedGear";
import {
  carryingCapacity,
  computeEncumbrance,
  describeLoadEffects,
  encumberedSpeed,
  inferArmorCategory,
  loadCategory,
  mediumHeavyLoad,
} from "./encumbrance";
import type { ClassDerivedFeatures } from "./parseClassAbilityEffects";
import type { FeatDerivedFeatures } from "./parseFeatEffects";
import type { RaceDerivedFeatures } from "./parseRaceFeatures";

const emptyRace = (extra: Partial<RaceDerivedFeatures> = {}): RaceDerivedFeatures => ({
  traits: [],
  abilityMods: {},
  skillBonuses: {},
  skillPointBonus: null,
  saveBonus: { fort: 0, ref: 0, will: 0 },
  naturalArmor: 0,
  sizeMod: 0,
  speed: 30,
  speedUnhinderedByEncumbrance: false,
  ...extra,
});

describe("carryingCapacity", () => {
  it("matches PHB Str 10 Medium limits", () => {
    assert.deepEqual(carryingCapacity(10, 0), { light: 33, medium: 66, heavy: 100 });
  });

  it("scales Small by ×3/4", () => {
    assert.deepEqual(carryingCapacity(10, 1), { light: 25, medium: 50, heavy: 75 });
  });

  it("matches Str 20 and Str 30 = 4× Str 20", () => {
    assert.equal(mediumHeavyLoad(20), 400);
    assert.equal(mediumHeavyLoad(30), 1600);
    assert.equal(carryingCapacity(20, 0).heavy, 400);
    assert.equal(carryingCapacity(30, 0).heavy, 1600);
  });

  it("classifies weight into light / medium / heavy / overloaded", () => {
    const limits = carryingCapacity(10, 0);
    assert.equal(loadCategory(33, limits), "light");
    assert.equal(loadCategory(34, limits), "medium");
    assert.equal(loadCategory(66, limits), "medium");
    assert.equal(loadCategory(67, limits), "heavy");
    assert.equal(loadCategory(100, limits), "heavy");
    assert.equal(loadCategory(101, limits), "overloaded");
  });
});

describe("encumberedSpeed", () => {
  it("reduces base speed to two-thirds rounded up to 5 ft", () => {
    assert.equal(encumberedSpeed(20), 15);
    assert.equal(encumberedSpeed(30), 20);
    assert.equal(encumberedSpeed(40), 30);
  });
});

describe("inferArmorCategory", () => {
  it("prefers the stored category field", () => {
    assert.equal(inferArmorCategory({ category: "heavy", maxDex: 1, speed30: 20 }), "heavy");
  });

  it("infers light when speed is not reduced", () => {
    assert.equal(inferArmorCategory({ maxDex: 6 }), "light");
  });
});

describe("computeEncumbrance", () => {
  it("applies heavy load penalties for a human at 80 lb", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 30;
    state.inventory = [{ name: "Pack", quantity: 1, weight: 80 }];

    const enc = computeEncumbrance(state, {
      raceFeatures: emptyRace({ speed: 30 }),
      equippedGear: computeEquippedGear(state.inventory, 30),
    });

    assert.equal(enc.weightCategory, "heavy");
    assert.equal(enc.highlightCategory, "heavy");
    assert.equal(enc.speedDelta, -10);
    assert.equal(enc.loadMaxDex, 1);
    assert.equal(enc.loadAcp, -6);
    assert.equal(enc.totalAcp, -6);
    assert.equal(enc.overloaded, false);
  });

  it("uses medium load max Dex and ACP at 50 lb Str 10", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 30;
    state.inventory = [{ name: "Pack", quantity: 1, weight: 50 }];

    const enc = computeEncumbrance(state, {
      equippedGear: computeEquippedGear(state.inventory, 30),
    });

    assert.equal(enc.weightCategory, "medium");
    assert.equal(enc.speedDelta, -10);
    assert.equal(enc.loadMaxDex, 3);
    assert.equal(enc.loadAcp, -3);
  });

  it("highlights heavy armor when weight is light", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 30;
    state.inventory = [
      {
        name: "Full Plate",
        quantity: 1,
        weight: 10,
        kind: "armor",
        category: "heavy",
        equipped: true,
        armorBonus: 8,
        maxDex: 1,
        acp: -6,
        speed30: 20,
        speed20: 15,
      },
    ];
    const gear = computeEquippedGear(state.inventory, 30);
    const enc = computeEncumbrance(state, { equippedGear: gear });

    assert.equal(enc.weightCategory, "light");
    assert.equal(enc.armorCategory, "heavy");
    assert.equal(enc.highlightCategory, "heavy");
    assert.equal(enc.speedDelta, -10);
    assert.equal(enc.maxDex, 1);
    assert.equal(enc.loadAcp, 0);
    assert.equal(enc.totalAcp, -6);
  });

  it("keeps dwarf speed at base under heavy armor", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 20;
    state.inventory = [
      {
        name: "Full Plate",
        quantity: 1,
        weight: 10,
        kind: "armor",
        category: "heavy",
        equipped: true,
        armorBonus: 8,
        maxDex: 1,
        acp: -6,
        speed30: 20,
        speed20: 15,
      },
    ];
    const gear = computeEquippedGear(state.inventory, 20);
    const enc = computeEncumbrance(state, {
      raceFeatures: emptyRace({
        speed: 20,
        speedUnhinderedByEncumbrance: true,
      }),
      equippedGear: gear,
    });

    assert.equal(enc.speedDelta, 0);
    assert.equal(enc.speedUnhindered, true);
    assert.equal(enc.maxDex, 1);
    assert.equal(enc.totalAcp, -6);
  });

  it("overloads even a dwarf to speed 5", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 20;
    state.inventory = [{ name: "Anvil", quantity: 1, weight: 200 }];

    const enc = computeEncumbrance(state, {
      raceFeatures: emptyRace({
        speed: 20,
        speedUnhinderedByEncumbrance: true,
      }),
      equippedGear: computeEquippedGear(state.inventory, 20),
    });

    assert.equal(enc.overloaded, true);
    assert.equal(enc.speedDelta, -15);
    assert.equal(enc.speedUnhindered, false);
  });

  it("adds coin treasure weight at 50 coins per pound", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.treasure = [
      { id: "treasure-gp", name: "GP", amount: 2500, builtin: "gp" },
    ];
    const enc = computeEncumbrance(state);
    assert.equal(enc.carriedWeight, 50);
    assert.equal(enc.weightCategory, "medium");
  });

  it("grants Fast Movement only while not heavily encumbered", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 30;
    state.inventory = [{ name: "Pack", quantity: 1, weight: 10 }];
    const classFeatures: ClassDerivedFeatures = {
      saveBonus: { fort: 0, ref: 0, will: 0 },
      saveAbilityBonus: { fort: [], ref: [], will: [] },
      fastMovementBonus: 10,
    };
    const light = computeEncumbrance(state, { classFeatures });
    assert.equal(light.fastMovementBonus, 10);

    state.inventory = [{ name: "Pack", quantity: 1, weight: 80 }];
    const heavy = computeEncumbrance(state, { classFeatures });
    assert.equal(heavy.fastMovementBonus, 0);
  });

  it("grants Fleet of Foot only in light armor without a heavy load", () => {
    const state = createDefaultPcPlanState();
    state.abilities.str = 10;
    state.combat.speedBase = 30;
    state.inventory = [
      {
        name: "Leather",
        quantity: 1,
        weight: 15,
        kind: "armor",
        category: "light",
        equipped: true,
        maxDex: 6,
        acp: 0,
      },
    ];
    const feats: FeatDerivedFeatures = {
      dodgeBonus: 0,
      initBonus: 0,
      speedUnhinderedByEncumbrance: false,
      fleetSpeedBonus: 10,
    };
    const ok = computeEncumbrance(state, {
      featFeatures: feats,
      equippedGear: computeEquippedGear(state.inventory, 30),
    });
    assert.equal(ok.fleetSpeedBonus, 10);

    state.inventory[0].category = "heavy";
    state.inventory[0].maxDex = 1;
    state.inventory[0].speed30 = 20;
    const blocked = computeEncumbrance(state, {
      featFeatures: feats,
      equippedGear: computeEquippedGear(state.inventory, 30),
    });
    assert.equal(blocked.fleetSpeedBonus, 0);
  });
});

describe("describeLoadEffects", () => {
  const limits = carryingCapacity(10, 0);

  it("lists light load as uncapped with full speed", () => {
    const tip = describeLoadEffects("light", limits, { speedBase: 30 });
    assert.equal(tip.title, "Light load");
    assert.equal(tip.range, "0 to 33 lb");
    assert.equal(tip.speed, "30 ft");
    assert.equal(tip.maxDex, "no cap");
    assert.equal(tip.skillAcp, "none");
    assert.equal(tip.run, "×4");
    assert.deepEqual(tip.extra, []);
  });

  it("lists medium load penalties and reduced speed", () => {
    const tip = describeLoadEffects("medium", limits, { speedBase: 30 });
    assert.equal(tip.title, "Medium load");
    assert.equal(tip.range, "Over 33 lb to 66 lb");
    assert.equal(tip.speed, "20 ft");
    assert.equal(tip.maxDex, "+3");
    assert.equal(tip.skillAcp, "-3");
    assert.equal(tip.run, "×4");
  });

  it("lists heavy load penalties, ×3 run, and suppressed speed bonuses", () => {
    const tip = describeLoadEffects("heavy", limits, { speedBase: 30 });
    assert.equal(tip.maxDex, "+1");
    assert.equal(tip.skillAcp, "-6");
    assert.equal(tip.run, "×3");
    assert.equal(tip.speed, "20 ft");
    assert.ok(tip.extra.includes("Fast Movement and Fleet of Foot do not apply"));
  });

  it("keeps dwarf speed in medium and heavy descriptions", () => {
    const medium = describeLoadEffects("medium", limits, {
      speedBase: 20,
      speedUnhindered: true,
    });
    const heavy = describeLoadEffects("heavy", limits, {
      speedBase: 20,
      speedUnhindered: true,
    });
    assert.equal(medium.speed, "20 ft (unhindered)");
    assert.equal(heavy.speed, "20 ft (unhindered)");
  });

  it("describes overloaded as a 5 ft stagger", () => {
    const tip = describeLoadEffects("overloaded", limits, {
      speedBase: 20,
      speedUnhindered: true,
    });
    assert.equal(tip.title, "Overloaded");
    assert.equal(tip.range, "Over 100 lb");
    assert.equal(tip.speed, "5 ft (full-round action)");
    assert.equal(tip.run, "cannot run or charge");
  });
});
