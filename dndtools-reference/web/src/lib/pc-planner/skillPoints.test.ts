import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPcPlanState } from "./defaultState";
import {
  computeRacialSkillPointBudget,
  computeSkillPointBudget,
  computeSkillPointBudgetBreakdown,
  computeSkillPointSummary,
  computeSkillRanksSpent,
  computeSkillTotal,
  formatSkillModifier,
  formatSkillPointBudgetLine,
  maxSkillRanks,
  parseClassSkillPointBase,
  skillPointsForCharacterLevelGain,
  skillPointsPerClassLevel,
} from "./skillPoints";

const humanSkillPoints = { firstLevel: 4, perAdditionalLevel: 1 };

describe("parseClassSkillPointBase", () => {
  it("parses compendium skill point strings", () => {
    assert.equal(parseClassSkillPointBase("2+ Int"), 2);
    assert.equal(parseClassSkillPointBase("8 + Int"), 8);
    assert.equal(parseClassSkillPointBase("—"), null);
  });
});

describe("skillPointsPerClassLevel", () => {
  it("enforces a minimum of 1 point per level", () => {
    assert.equal(skillPointsPerClassLevel(2, 6), 1);
  });

  it("adds intelligence modifier to the class base", () => {
    assert.equal(skillPointsPerClassLevel(2, 14), 4);
  });

  it("returns 1 when 2 + Int is exactly 1", () => {
    assert.equal(skillPointsPerClassLevel(2, 8), 1);
  });
});

describe("skillPointsForCharacterLevelGain", () => {
  it("quadruples only the first character level", () => {
    assert.equal(skillPointsForCharacterLevelGain(1, true), 4);
    assert.equal(skillPointsForCharacterLevelGain(1, false), 1);
  });
});

describe("computeSkillPointBudget", () => {
  it("applies x4 at first character level only", () => {
    const total = computeSkillPointBudget(
      [{ classSlug: "fighter-93", className: "Fighter", level: 1 }],
      { "fighter-93": 2 },
      10,
    );
    assert.equal(total, 8);
  });

  it("does not quadruple the first level of a later class", () => {
    const bases = { "fighter-93": 2, "rogue-97": 8 };
    const total = computeSkillPointBudget(
      [
        { classSlug: "fighter-93", className: "Fighter", level: 5 },
        { classSlug: "rogue-97", className: "Rogue", level: 3 },
      ],
      bases,
      14,
    );
    assert.equal(total, 62);
  });

  it("matches paladin 2 + sorcerer 3 at 1 pt per level (2 + Int, min 1)", () => {
    const total = computeSkillPointBudget(
      [
        { classSlug: "paladin-95", className: "Paladin", level: 2 },
        { classSlug: "sorcerer-98", className: "Battle Sorcerer", level: 3 },
      ],
      { "paladin-95": 2, "sorcerer-98": 2 },
      8,
    );
    assert.equal(total, 8);
  });

  it("adds human racial skill points on top of class budget", () => {
    const total = computeSkillPointBudget(
      [{ classSlug: "fighter-93", className: "Fighter", level: 5 }],
      { "fighter-93": 2 },
      10,
      2,
      humanSkillPoints,
    );
    assert.equal(total, 24);
  });
});

describe("computeRacialSkillPointBudget", () => {
  it("adds flat first-level bonus plus per-level bonus", () => {
    assert.equal(computeRacialSkillPointBudget(1, humanSkillPoints), 4);
    assert.equal(computeRacialSkillPointBudget(5, humanSkillPoints), 8);
  });
});

describe("computeSkillPointBudgetBreakdown", () => {
  it("shows per-level lines with class subtotals", () => {
    const lines = computeSkillPointBudgetBreakdown(
      [{ classSlug: "paladin-95", className: "Paladin", level: 2 }],
      { "paladin-95": 2 },
      8,
    );
    assert.deepEqual(lines, [
      { label: "Paladin (1 pt/lv)", value: 5 },
      { label: "Level 1 (×4)", value: 4, indent: true },
      { label: "Level 2", value: 1, indent: true },
    ]);
  });

  it("does not mark x4 on a later class first level", () => {
    const lines = computeSkillPointBudgetBreakdown(
      [
        { classSlug: "paladin-95", className: "Paladin", level: 2 },
        { classSlug: "sorcerer-98", className: "Battle Sorcerer", level: 1 },
      ],
      { "paladin-95": 2, "sorcerer-98": 2 },
      8,
      2,
      "paladin-95",
    );
    assert.deepEqual(lines, [
      { label: "Paladin (1 pt/lv)", value: 5 },
      { label: "Level 1 (×4)", value: 4, indent: true },
      { label: "Level 2", value: 1, indent: true },
      { label: "Battle Sorcerer (1 pt/lv)", value: 1 },
      { label: "Level 1", value: 1, indent: true },
    ]);
  });
});

describe("computeSkillPointSummary", () => {
  it("returns spent ranks over available budget with breakdown", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "fighter-93", className: "Fighter", level: 1 }];
    state.abilities.int = 10;
    state.skills = [
      { name: "Climb", slug: "climb", ranks: 4, misc: 0 },
      { name: "Jump", slug: "jump", ranks: 2, misc: 0 },
    ];

    const summary = computeSkillPointSummary(state, { "fighter-93": 2 });

    assert.equal(summary.spent, 6);
    assert.equal(summary.available, 8);
    assert.equal(summary.breakdown[0].value, 8);
  });

  it("includes racial skill points in available budget and breakdown", () => {
    const state = createDefaultPcPlanState();
    state.identity.classLevels = [{ classSlug: "fighter-93", className: "Fighter", level: 5 }];
    state.identity.race = "Human";
    state.abilities.int = 10;

    const summary = computeSkillPointSummary(state, { "fighter-93": 2 }, humanSkillPoints, "Human");

    assert.equal(summary.available, 24);
    const racialLine = summary.breakdown.find((line) => line.label.startsWith("Human"));
    assert.equal(racialLine?.value, 8);
  });
});

describe("computeSkillRanksSpent", () => {
  it("sums rank inputs as class skills when no class set given", () => {
    assert.equal(
      computeSkillRanksSpent([
        { name: "Hide", ranks: 3, misc: 0 },
        { name: "Move Silently", ranks: 5, misc: 0 },
      ]),
      8,
    );
  });

  it("charges 2 points per cross-class rank", () => {
    const classKeys = new Set(["climb"]);
    assert.equal(
      computeSkillRanksSpent(
        [
          { name: "Climb", slug: "climb", ranks: 2, misc: 0 },
          { name: "Hide", slug: "hide", ranks: 2, misc: 0 },
        ],
        classKeys,
      ),
      6,
    );
  });

  it("supports half ranks on cross-class skills", () => {
    const classKeys = new Set(["climb"]);
    assert.equal(
      computeSkillRanksSpent([{ name: "Hide", slug: "hide", ranks: 0.5, misc: 0 }], classKeys),
      1,
    );
  });
});

describe("computeSkillTotal", () => {
  it("sums ranks, ability modifier, racial, and misc", () => {
    const total = computeSkillTotal(
      { name: "Hide", ability: "Dex", ranks: 5, misc: 2, racialMisc: 2 },
      { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
    );
    assert.equal(total, 11);
  });

  it("returns null for trained-only skills with zero ranks", () => {
    const total = computeSkillTotal(
      { name: "Disable Device", ability: "Int", ranks: 0, misc: 0, trainedOnly: true },
      { str: 10, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
    );
    assert.equal(total, null);
  });

  it("applies armor check penalty when flagged", () => {
    const total = computeSkillTotal(
      {
        name: "Hide",
        ability: "Dex",
        ranks: 2,
        misc: 0,
        armorCheckPenalty: true,
      },
      { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
      -4,
    );
    assert.equal(total, -1);
  });
});

describe("maxSkillRanks", () => {
  it("uses HD+3 for class and half for cross-class", () => {
    assert.equal(maxSkillRanks(5, true), 8);
    assert.equal(maxSkillRanks(5, false), 4);
  });
});

describe("formatSkillPointBudgetLine", () => {
  it("formats class budget lines", () => {
    assert.equal(formatSkillPointBudgetLine({ label: "Paladin (1 pt/lv)", value: 5 }), "Paladin (1 pt/lv): 5");
    assert.equal(
      formatSkillPointBudgetLine({ label: "Level 1 (×4)", value: 4, indent: true }),
      "  Level 1 (×4): 4",
    );
  });
});

describe("formatSkillModifier", () => {
  it("formats signed modifiers", () => {
    assert.equal(formatSkillModifier(3), "+3");
    assert.equal(formatSkillModifier(-1), "-1");
  });
});
