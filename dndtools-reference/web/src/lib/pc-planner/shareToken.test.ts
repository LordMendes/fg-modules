import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPcPlanSharePath,
  generateShareToken,
  isValidShareToken,
  normalizeShareToken,
} from "./shareToken";

describe("pc plan share tokens", () => {
  it("generates 16-char tokens from the safe alphabet", () => {
    const token = generateShareToken();
    assert.equal(token.length, 16);
    assert.equal(isValidShareToken(token), true);
  });

  it("normalizes and validates tokens", () => {
    const token = generateShareToken();
    assert.equal(isValidShareToken(normalizeShareToken(` ${token.toLowerCase()} `)), true);
    assert.equal(isValidShareToken("ABC"), false);
  });

  it("builds share paths", () => {
    const token = generateShareToken();
    assert.equal(
      buildPcPlanSharePath(token),
      `/tools/pc-planner?share=${encodeURIComponent(token)}`,
    );
  });
});
