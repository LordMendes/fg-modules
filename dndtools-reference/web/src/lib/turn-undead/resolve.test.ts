import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  effectiveTurnLevel,
  formatStackOutcome,
  maxHdFromCheck,
  resolveTurnUndead,
  stackOutcomeTone,
} from "./resolve";
import type { TurnUndeadInput } from "./types";

const baseInput: TurnUndeadInput = {
  class: "cleric",
  level: 6,
  chaMod: 3,
  religionBonus: false,
  greaterTurnUndead: false,
  d20: 20,
  d6First: 1,
  d6Second: 1,
  targets: [
    { label: "Spawn minion", hd: 4, count: 32 },
    { label: "Spawn master", hd: 9, count: 2 },
  ],
};

describe("effectiveTurnLevel", () => {
  it("uses cleric level directly", () => {
    assert.equal(effectiveTurnLevel("cleric", 6), 6);
  });

  it("uses max(1, paladin level - 3)", () => {
    assert.equal(effectiveTurnLevel("paladin", 6), 3);
    assert.equal(effectiveTurnLevel("paladin", 4), 1);
    assert.equal(effectiveTurnLevel("paladin", 2), 1);
  });
});

describe("maxHdFromCheck", () => {
  it("maps Table 8-9 brackets", () => {
    assert.equal(maxHdFromCheck(0, 6), 2);
    assert.equal(maxHdFromCheck(3, 6), 3);
    assert.equal(maxHdFromCheck(6, 6), 2);
    assert.equal(maxHdFromCheck(9, 6), 5);
    assert.equal(maxHdFromCheck(12, 6), 6);
    assert.equal(maxHdFromCheck(15, 6), 7);
    assert.equal(maxHdFromCheck(18, 6), 8);
    assert.equal(maxHdFromCheck(21, 6), 9);
    assert.equal(maxHdFromCheck(22, 6), 10);
  });

  it("clamps negative results to zero", () => {
    assert.equal(maxHdFromCheck(0, 2), 0);
  });
});

describe("resolveTurnUndead", () => {
  it("resolves the worked example from the spec", () => {
    const result = resolveTurnUndead(baseInput);
    assert.ok(result);
    assert.equal(result.effectiveLevel, 6);
    assert.equal(result.checkTotal, 29);
    assert.equal(result.maxHdPerCreature, 10);
    assert.equal(result.damagePool, 11);
    assert.equal(result.damageSpent, 8);
    assert.equal(result.damageRemaining, 3);
    assert.equal(result.eligibleHdTotal, 146);
    assert.equal(result.allEligibleAffected, false);

    assert.equal(result.stacks[0]?.affected, 2);
    assert.equal(result.stacks[0]?.outcome, "turned");
    assert.equal(result.stacks[1]?.affected, 0);
    assert.equal(result.stacks[1]?.outcome, null);
  });

  it("applies religion bonus to the turning check only", () => {
    const withReligion = resolveTurnUndead({
      ...baseInput,
      religionBonus: true,
      d20: 10,
    });
    const withoutReligion = resolveTurnUndead({
      ...baseInput,
      religionBonus: false,
      d20: 10,
    });

    assert.ok(withReligion);
    assert.ok(withoutReligion);
    assert.equal(withReligion.checkTotal, withoutReligion.checkTotal + 2);
    assert.equal(withReligion.damagePool, withoutReligion.damagePool);
  });

  it("allocates weakest HD first", () => {
    const result = resolveTurnUndead({
      class: "cleric",
      level: 5,
      chaMod: 0,
      religionBonus: false,
      d20: 15,
      d6First: 1,
      d6Second: 1,
      targets: [
        { label: "Weak", hd: 1, count: 2 },
        { label: "Strong", hd: 4, count: 1 },
      ],
    });

    assert.ok(result);
    assert.equal(result.damagePool, 7);
    assert.equal(result.stacks[0]?.affected, 2);
    assert.equal(result.stacks[1]?.affected, 1);
  });

  it("excludes creatures above the max HD cap", () => {
    const result = resolveTurnUndead({
      class: "cleric",
      level: 3,
      chaMod: 0,
      religionBonus: false,
      d20: 1,
      d6First: 6,
      d6Second: 6,
      targets: [
        { label: "Low", hd: 2, count: 1 },
        { label: "High", hd: 10, count: 1 },
      ],
    });

    assert.ok(result);
    assert.equal(result.maxHdPerCreature, 0);
    assert.equal(result.eligibleHdTotal, 0);
    assert.equal(result.damageSpent, 0);
    assert.equal(result.stacks[0]?.affected, 0);
    assert.equal(result.stacks[1]?.affected, 0);
  });

  it("marks low-HD undead as destroyed when effective level is high enough", () => {
    const result = resolveTurnUndead({
      class: "cleric",
      level: 10,
      chaMod: 0,
      religionBonus: false,
      d20: 15,
      d6First: 3,
      d6Second: 3,
      targets: [{ label: "Skeleton", hd: 1, count: 1 }],
    });

    assert.ok(result);
    assert.equal(result.stacks[0]?.outcome, "destroyed");
  });

  it("marks affected undead as destroyed with greater turn undead", () => {
    const result = resolveTurnUndead({
      ...baseInput,
      greaterTurnUndead: true,
    });

    assert.ok(result);
    assert.equal(result.stacks[0]?.affected, 2);
    assert.equal(result.stacks[0]?.outcome, "destroyed");
  });

  it("returns null when dice are missing or invalid", () => {
    assert.equal(resolveTurnUndead({ ...baseInput, d20: null }), null);
    assert.equal(resolveTurnUndead({ ...baseInput, d6First: null }), null);
    assert.equal(resolveTurnUndead({ ...baseInput, d6Second: null }), null);
    assert.equal(resolveTurnUndead({ ...baseInput, d20: 0 }), null);
    assert.equal(resolveTurnUndead({ ...baseInput, d6First: 7 }), null);
  });

  it("handles empty targets without crashing", () => {
    const result = resolveTurnUndead({
      ...baseInput,
      targets: [],
    });

    assert.ok(result);
    assert.equal(result.eligibleHdTotal, 0);
    assert.equal(result.damageSpent, 0);
    assert.equal(result.allEligibleAffected, false);
    assert.deepEqual(result.stacks, []);
  });
});

describe("stackOutcomeTone", () => {
  it("maps stack results to color tones", () => {
    assert.equal(
      stackOutcomeTone({
        label: "Minion",
        hd: 4,
        count: 32,
        affected: 0,
        outcome: null,
      }),
      "unaffected",
    );
    assert.equal(
      stackOutcomeTone({
        label: "Minion",
        hd: 4,
        count: 32,
        affected: 2,
        outcome: "turned",
      }),
      "turned",
    );
    assert.equal(
      stackOutcomeTone({
        label: "Skeleton",
        hd: 1,
        count: 1,
        affected: 1,
        outcome: "destroyed",
      }),
      "destroyed",
    );
  });
});

describe("formatStackOutcome", () => {
  it("formats unaffected, partial, and full stacks", () => {
    assert.equal(
      formatStackOutcome({
        label: "Minion",
        hd: 4,
        count: 32,
        affected: 0,
        outcome: null,
      }),
      "Unaffected",
    );
    assert.equal(
      formatStackOutcome({
        label: "Minion",
        hd: 4,
        count: 32,
        affected: 2,
        outcome: "turned",
      }),
      "Turned 2/32",
    );
    assert.equal(
      formatStackOutcome({
        label: "Skeleton",
        hd: 1,
        count: 3,
        affected: 3,
        outcome: "destroyed",
      }),
      "Destroyed",
    );
  });
});
