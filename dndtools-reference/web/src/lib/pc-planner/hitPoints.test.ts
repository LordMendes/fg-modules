import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatIterativeAttacks } from "./combatStats";
import { createDefaultPcPlanState } from "./defaultState";
import {
  averageHitDieRoll,
  computeMaxHitPoints,
  formatHitDiceString,
  parseHitDieSides,
  syncHitDice,
} from "./hitPoints";
import { finalizePcPlanState } from "./syncState";

describe("parseHitDieSides", () => {
  it("parses dN and bare N", () => {
    assert.equal(parseHitDieSides("d10"), 10);
    assert.equal(parseHitDieSides("d4"), 4);
    assert.equal(parseHitDieSides("10"), 10);
    assert.equal(parseHitDieSides("D8"), 8);
  });
});

describe("averageHitDieRoll", () => {
  it("uses PHB average floor(sides/2)+1", () => {
    assert.equal(averageHitDieRoll(10), 6);
    assert.equal(averageHitDieRoll(8), 5);
    assert.equal(averageHitDieRoll(6), 4);
    assert.equal(averageHitDieRoll(4), 3);
    assert.equal(averageHitDieRoll(12), 7);
  });
});

describe("syncHitDice", () => {
  it("maxes first HD of first class and averages later HD", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 3 },
    ];
    state.identity.firstClassSlug = "fighter";
    state.abilities.con = 10;
    syncHitDice(state, { fighter: "d10" });

    assert.equal(state.hitPoints.rolls.length, 3);
    assert.equal(state.hitPoints.rolls[0].rolled, 10);
    assert.equal(state.hitPoints.rolls[1].rolled, 6);
    assert.equal(state.hitPoints.rolls[2].rolled, 6);
    assert.equal(computeMaxHitPoints(state, { fighter: "d10" }), 22);
  });

  it("adds Con mod per HD with minimum 1 HP per die", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "wizard", className: "Wizard", level: 2 },
    ];
    state.identity.firstClassSlug = "wizard";
    state.abilities.con = 8; // −1
    syncHitDice(state, { wizard: "d4" });
    // L1: max(1, 4-1)=3; L2: max(1, 3-1)=2 → 5
    assert.equal(computeMaxHitPoints(state, { wizard: "d4" }), 5);

    state.abilities.con = 14; // +2
    // L1: 4+2=6; L2: 3+2=5 → 11
    assert.equal(computeMaxHitPoints(state, { wizard: "d4" }), 11);
  });

  it("preserves existing rolls when level changes", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 2 },
    ];
    state.identity.firstClassSlug = "fighter";
    syncHitDice(state, { fighter: "d10" });
    state.hitPoints.rolls[1].rolled = 9;

    state.identity.classLevels[0].level = 3;
    syncHitDice(state, { fighter: "d10" });

    assert.equal(state.hitPoints.rolls.length, 3);
    assert.equal(state.hitPoints.rolls[0].rolled, 10);
    assert.equal(state.hitPoints.rolls[1].rolled, 9);
    assert.equal(state.hitPoints.rolls[2].rolled, 6);
  });

  it("truncates rolls when class level drops", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 4 },
    ];
    state.identity.firstClassSlug = "fighter";
    syncHitDice(state, { fighter: "d10" });
    state.identity.classLevels[0].level = 2;
    syncHitDice(state, { fighter: "d10" });
    assert.equal(state.hitPoints.rolls.length, 2);
  });

  it("formats multiclass hit dice string", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 3 },
      { classSlug: "wizard", className: "Wizard", level: 2 },
    ];
    state.identity.firstClassSlug = "fighter";
    syncHitDice(state, { fighter: "d10", wizard: "d4" });
    assert.equal(formatHitDiceString(state.hitPoints.rolls, { fighter: "d10", wizard: "d4" }), "3d10+2d4");
  });
});

describe("formatIterativeAttacks", () => {
  it("builds iterative strings from BAB or attack totals", () => {
    assert.equal(formatIterativeAttacks(0), "+0");
    assert.equal(formatIterativeAttacks(5), "+5");
    assert.equal(formatIterativeAttacks(6), "+6/+1");
    assert.equal(formatIterativeAttacks(11), "+11/+6/+1");
    assert.equal(formatIterativeAttacks(16), "+16/+11/+6/+1");
  });
});

describe("finalizePcPlanState hit dice", () => {
  it("syncs hit dice through finalize", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [
      { classSlug: "fighter", className: "Fighter", level: 6 },
    ];
    state.identity.firstClassSlug = "fighter";
    state.abilityBase.con = 12;
    state.abilities.con = 12;
    const next = finalizePcPlanState(state, null, {}, { fighter: "d10" });
    assert.equal(next.hitPoints.rolls.length, 6);
    assert.equal(next.hitPoints.rolls[0].rolled, 10);
    // 10 + 5*6 + Con(+1)*6 = 10+30+6 = 46
    assert.equal(computeMaxHitPoints(next, { fighter: "d10" }), 46);
  });
});
