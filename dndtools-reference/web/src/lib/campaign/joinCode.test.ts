import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from "./joinCode";
import {
  canRevealCampaignRoll,
  stripHiddenRollForViewer,
  toCampaignRollView,
} from "./rollVisibility";
import { computeRollTotals } from "./rollFaces";
import { markSeenRollId } from "./seenRollIds";
import type { CampaignRollView } from "./types";

describe("campaign join codes", () => {
  it("generates valid codes", () => {
    const code = generateJoinCode();
    assert.equal(code.length, 8);
    assert.equal(isValidJoinCode(code), true);
  });

  it("normalizes and rejects bad codes", () => {
    assert.equal(normalizeJoinCode(" ab-cd "), "ABCD");
    assert.equal(isValidJoinCode("SHORT"), false);
    assert.equal(isValidJoinCode("OOOOOOOO"), false);
  });
});

describe("campaign roll visibility", () => {
  const stored = {
    id: "r1",
    userId: "player1",
    username: "alice",
    characterName: "Aldric",
    kind: "attack",
    label: "Longsword attack",
    hidden: true,
    dice: [{ qty: 1, sides: 20 }],
    modifier: 5,
    iterativeModifiers: null,
    faces: [17],
    faceSum: 17,
    total: 22,
    natural20: false,
    natural1: false,
    attackTotals: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };

  it("reveals hidden rolls to roller and DM only", () => {
    assert.equal(
      canRevealCampaignRoll(stored, { userId: "player1", isDm: false }),
      true,
    );
    assert.equal(
      canRevealCampaignRoll(stored, { userId: "dm", isDm: true }),
      true,
    );
    assert.equal(
      canRevealCampaignRoll(stored, { userId: "player2", isDm: false }),
      false,
    );
  });

  it("strips faces for non-revealed viewers but keeps dice for silhouette", () => {
    const full = toCampaignRollView(stored, { userId: "dm", isDm: true });
    assert.deepEqual(full.faces, [17]);
    assert.equal(full.revealResult, true);

    const stripped = stripHiddenRollForViewer(full, {
      userId: "player2",
      isDm: false,
    });
    assert.ok(stripped);
    assert.equal(stripped!.revealResult, false);
    assert.equal(stripped!.faces, null);
    assert.equal(stripped!.total, null);
    assert.equal(stripped!.dice.length, 1);
  });

  it("keeps public rolls fully visible", () => {
    const publicRoll: CampaignRollView = {
      ...toCampaignRollView({ ...stored, hidden: false }, {
        userId: "player2",
        isDm: false,
      }),
    };
    assert.equal(publicRoll.revealResult, true);
    assert.deepEqual(publicRoll.faces, [17]);
  });
});

describe("campaign roll totals", () => {
  it("computes iterative attack totals", () => {
    const result = computeRollTotals({
      faces: [18, 7],
      modifier: 0,
      iterativeModifiers: [9, 4],
      dice: [{ qty: 2, sides: 20 }],
    });
    assert.deepEqual(result.attackTotals, [27, 11]);
    assert.equal(result.total, 27);
  });
});

describe("campaign seen roll ids", () => {
  it("dedupes the same roll id", () => {
    const seen = new Set<string>();
    assert.equal(markSeenRollId(seen, "roll-a"), true);
    assert.equal(markSeenRollId(seen, "roll-a"), false);
    assert.equal(markSeenRollId(seen, "roll-b"), true);
  });

  it("evicts oldest ids when over max size", () => {
    const seen = new Set<string>();
    assert.equal(markSeenRollId(seen, "a", 2), true);
    assert.equal(markSeenRollId(seen, "b", 2), true);
    assert.equal(markSeenRollId(seen, "c", 2), true);
    assert.equal(seen.has("a"), false);
    assert.equal(seen.has("b"), true);
    assert.equal(seen.has("c"), true);
    assert.equal(markSeenRollId(seen, "a", 2), true);
  });
});
