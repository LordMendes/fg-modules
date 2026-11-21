import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parsePcTokenDrop,
  canDropPcToken,
  defaultPartyStartPosition,
  summarizePartyPlacement,
} from "./mapDragDrop";

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

describe("defaultPartyStartPosition", () => {
  it("calculates map center in grid coordinates", () => {
    const result = defaultPartyStartPosition(3500, 2800, 70);
    assert.equal(result.x, 25);
    assert.equal(result.y, 20);
  });

  it("handles small maps correctly", () => {
    const result = defaultPartyStartPosition(700, 700, 70);
    assert.equal(result.x, 5);
    assert.equal(result.y, 5);
  });

  it("rounds down for non-integer results", () => {
    const result = defaultPartyStartPosition(3555, 2855, 71);
    assert.equal(result.x, 25); // 3555 / 71 / 2 = 25.035...
    assert.equal(result.y, 20); // 2855 / 71 / 2 = 20.105...
  });
});

describe("summarizePartyPlacement", () => {
  it("returns error when no PCs in campaign", () => {
    const result = summarizePartyPlacement(0, 0, []);
    assert.equal(result.success, false);
    assert.equal(result.error, "No characters in this campaign");
  });

  it("returns error when nothing placed", () => {
    const result = summarizePartyPlacement(0, 3, [
      { name: "PC1", error: "already placed" },
      { name: "PC2", error: "not found" },
      { name: "PC3", error: "permission denied" },
    ]);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Failed to place any tokens"));
    assert.ok(result.error?.includes("PC1: already placed"));
    assert.ok(result.error?.includes("PC2: not found"));
  });

  it("reports partial success with failures", () => {
    const result = summarizePartyPlacement(2, 3, [
      { name: "PC1", error: "already placed" },
    ]);
    assert.equal(result.success, true);
    assert.ok(result.error?.includes("Placed 2 of 3"));
    assert.ok(result.error?.includes("PC1: already placed"));
  });

  it("returns success when all placed", () => {
    const result = summarizePartyPlacement(3, 3, []);
    assert.equal(result.success, true);
    assert.equal(result.error, undefined);
  });
});
