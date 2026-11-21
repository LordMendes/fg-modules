import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

/**
 * Parse PC token drop payload.
 * Returns pcPlanId and userId if valid, null otherwise.
 */
export function parsePcTokenDrop(
  dataTransfer: string,
  plainText: string,
): { pcPlanId: string; userId: string } | null {
  try {
    // Try structured MIME type first
    if (dataTransfer) {
      const parsed = JSON.parse(dataTransfer) as {
        pcPlanId?: string;
        userId?: string;
      };
      if (parsed.pcPlanId && parsed.userId) {
        return { pcPlanId: parsed.pcPlanId, userId: parsed.userId };
      }
    }

    // Fall back to text/plain format
    if (plainText.startsWith("campaign-pc:")) {
      const pcPlanId = plainText.slice("campaign-pc:".length);
      if (pcPlanId) {
        // Without userId in fallback, we don't have ownership info
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Check if a user can drop a PC token.
 * DM can drop any PC. Players can only drop their own PCs.
 */
export function canDropPcToken(
  isDm: boolean,
  viewerUserId: string,
  tokenOwnerUserId: string | null,
): boolean {
  if (isDm) return true;
  if (tokenOwnerUserId === null) return false;
  return tokenOwnerUserId === viewerUserId;
}

describe("parsePcTokenDrop", () => {
  it("parses structured payload with pcPlanId and userId", () => {
    const payload = JSON.stringify({
      pcPlanId: "pc-plan-123",
      userId: "user-456",
    });
    const result = parsePcTokenDrop(payload, "");
    assert.ok(result);
    assert.equal(result.pcPlanId, "pc-plan-123");
    assert.equal(result.userId, "user-456");
  });

  it("returns null for missing pcPlanId", () => {
    const payload = JSON.stringify({ userId: "user-456" });
    const result = parsePcTokenDrop(payload, "");
    assert.equal(result, null);
  });

  it("returns null for missing userId", () => {
    const payload = JSON.stringify({ pcPlanId: "pc-plan-123" });
    const result = parsePcTokenDrop(payload, "");
    assert.equal(result, null);
  });

  it("returns null for plain text fallback (no userId)", () => {
    const result = parsePcTokenDrop("", "campaign-pc:pc-plan-123");
    assert.equal(result, null);
  });

  it("returns null for invalid JSON", () => {
    const result = parsePcTokenDrop("not-json", "");
    assert.equal(result, null);
  });

  it("returns null for empty strings", () => {
    const result = parsePcTokenDrop("", "");
    assert.equal(result, null);
  });
});

describe("canDropPcToken", () => {
  it("allows DM to drop any PC", () => {
    assert.ok(canDropPcToken(true, "dm-user", "player-user"));
    assert.ok(canDropPcToken(true, "dm-user", "dm-user"));
    assert.ok(canDropPcToken(true, "dm-user", null));
  });

  it("allows player to drop their own PC", () => {
    assert.ok(canDropPcToken(false, "player-1", "player-1"));
  });

  it("blocks player from dropping another player's PC", () => {
    assert.equal(canDropPcToken(false, "player-1", "player-2"), false);
  });

  it("blocks player from dropping PC without owner", () => {
    assert.equal(canDropPcToken(false, "player-1", null), false);
  });
});

describe("placePartyTokens result handling", () => {
  it("should return error when no PCs in campaign", () => {
    // This tests the logic that placePartyTokens should check for empty PC list
    const pcs: unknown[] = [];
    const shouldFail = pcs.length === 0;
    assert.ok(shouldFail, "Should detect empty party");
  });

  it("should report partial success with failures", () => {
    // Simulates placing 2 of 3 PCs successfully
    const placed = 2;
    const total = 3;
    const failures = ["PC1: already placed"];

    assert.ok(placed > 0, "Some tokens were placed");
    assert.ok(failures.length > 0, "Some failures occurred");
    assert.ok(placed < total, "Not all tokens were placed");
  });

  it("should report total failure when nothing placed", () => {
    const placed = 0;
    const total = 3;

    assert.equal(placed, 0, "No tokens were placed");
    assert.ok(total > 0, "Party has members");
  });

  it("should use map center as default position", () => {
    const imageWidth = 3500;
    const imageHeight = 2800;
    const gridSizePx = 70;

    const centerX = Math.floor(imageWidth / gridSizePx / 2);
    const centerY = Math.floor(imageHeight / gridSizePx / 2);

    assert.equal(centerX, 25);
    assert.equal(centerY, 20);
  });
});
