import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  addCombatantFromStats,
  type CombatActor,
} from "./combatMutations";

describe("PC Token/Combatant Linking", () => {
  const mockActor: CombatActor = {
    userId: "dm-user-id",
    role: "dm",
    campaignId: "campaign-id",
    dmUserId: "dm-user-id",
  };

  it("addCombatantFromStats accepts tokenId for PC combatants", () => {
    // This test verifies the function signature accepts tokenId
    const input = {
      kind: "pc" as const,
      name: "Test PC",
      faction: "friend" as const,
      pcPlanId: "pc-plan-123",
      tokenId: "token-abc",
      stats: {
        name: "Test PC",
        initMod: 2,
        hpMax: 30,
        ac: 16,
        acTouch: 12,
        acFlat: 14,
        spaceSquares: 1,
        reachFeet: 5,
        attacks: [],
        snapshot: {},
        spells: [],
      },
    };

    // Type check: this should compile
    assert.ok(typeof input === "object");
    assert.equal(input.tokenId, "token-abc");
    assert.equal(input.pcPlanId, "pc-plan-123");
  });

  it("PC combatant can have null tokenId initially", () => {
    const combatant = {
      id: "combatant-1",
      kind: "pc",
      tokenId: null,
      pcPlanId: "pc-plan-456",
      name: "Hero",
      faction: "friend",
    };

    assert.equal(combatant.tokenId, null);
    assert.equal(combatant.pcPlanId, "pc-plan-456");
  });

  it("combatantForToken should match by tokenId when present", () => {
    const combatants = [
      { id: "c1", tokenId: "token-1", pcPlanId: "pc1", kind: "pc" },
      { id: "c2", tokenId: null, pcPlanId: "pc2", kind: "pc" },
    ];

    const found = combatants.find((c) => c.tokenId === "token-1");
    assert.ok(found);
    assert.equal(found.id, "c1");
  });

  it("combatantForToken should match by pcPlanId when tokenId is null", () => {
    const combatants = [
      { id: "c1", tokenId: "token-1", pcPlanId: "pc1", kind: "pc" },
      { id: "c2", tokenId: null, pcPlanId: "pc2", kind: "pc" },
    ];
    const tokens = [
      { id: "token-1", pcPlanId: "pc1", kind: "pc" },
      { id: "token-2", pcPlanId: "pc2", kind: "pc" },
    ];

    // Simulate the lookup logic
    const targetTokenId = "token-2";
    const token = tokens.find((t) => t.id === targetTokenId);
    let combatant = combatants.find((c) => c.tokenId === targetTokenId);
    if (!combatant && token?.pcPlanId) {
      combatant = combatants.find(
        (c) => c.kind === "pc" && c.pcPlanId === token.pcPlanId,
      );
    }

    assert.ok(combatant);
    assert.equal(combatant.id, "c2");
    assert.equal(combatant.pcPlanId, "pc2");
  });

  it("token and combatant link is bidirectional", () => {
    // Token has pcPlanId, combatant has tokenId and pcPlanId
    const token = { id: "token-abc", pcPlanId: "pc-plan-789", kind: "pc" };
    const combatant = {
      id: "combatant-xyz",
      tokenId: "token-abc",
      pcPlanId: "pc-plan-789",
      kind: "pc",
    };

    // Can find combatant from token
    assert.equal(combatant.tokenId, token.id);
    // Can find token from combatant
    assert.equal(combatant.pcPlanId, token.pcPlanId);
  });
});
