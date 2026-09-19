import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEventForViewer } from "./format";
import type { DamageEventPayload } from "./types";

const damagePayload: DamageEventPayload = {
  source: "Longsword",
  attackType: "melee",
  packets: [{ amount: 9, types: ["slashing", "magic"], source: "Longsword" }],
  crit: false,
  multiplier: 1,
  adjustments: [{ kind: "dr", amount: 5, note: "DR 5" }],
  applied: 4,
  toTemp: 0,
  toNonlethal: 0,
  hpBefore: 12,
  hpAfter: 8,
  hpMax: 12,
  statusAfter: "heavy",
};

describe("events/format (90-testing.md)", () => {
  it("damage event DM vs player shows numbers vs band word", () => {
    const input = {
      kind: "damage" as const,
      payload: damagePayload,
      actorName: "Fighter",
      targetName: "Goblin",
      targetPcPlanId: null,
    };

    const dmLines = formatEventForViewer(input, { isDm: true });
    const playerLines = formatEventForViewer(input, {
      isDm: false,
      viewerPcPlanId: "pc-other",
    });

    assert.equal(dmLines.length, 1);
    assert.equal(playerLines.length, 1);

    const dmText = dmLines[0]!.text;
    const playerText = playerLines[0]!.text;

    assert.match(dmText, /\[DAMAGE \(M\)\]/);
    assert.match(dmText, /Longsword/);
    assert.match(dmText, /\[TYPE: slashing, magic \(9\)\]/);
    assert.match(dmText, /\[DR 5 -> 4\]/);
    assert.match(dmText, /Goblin: Heavy/);
    assert.match(dmText, /8\/12/);

    assert.equal(playerText, "Goblin takes damage (damage reduced) and is Heavy");
    assert.doesNotMatch(playerText, /\b9\b/);
    assert.doesNotMatch(playerText, /\b4\b/);
    assert.doesNotMatch(playerText, /DR/);
  });
});
