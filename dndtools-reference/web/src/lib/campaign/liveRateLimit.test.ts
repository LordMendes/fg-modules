import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptRateLimited,
  acceptTokenMoveRate,
  createRateLimitState,
  TOKEN_MOVE_MAX_PER_SEC,
} from "./liveRateLimit";

describe("liveRateLimit", () => {
  it("accepts up to max events in the window", () => {
    const state = createRateLimitState();
    const t0 = 1_000_000;
    for (let i = 0; i < TOKEN_MOVE_MAX_PER_SEC; i++) {
      assert.equal(acceptTokenMoveRate(state, t0 + i), true);
    }
    assert.equal(acceptTokenMoveRate(state, t0 + TOKEN_MOVE_MAX_PER_SEC), false);
  });

  it("allows more events after the window slides", () => {
    const state = createRateLimitState();
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      assert.equal(acceptRateLimited(state, t0, 5, 1000), true);
    }
    assert.equal(acceptRateLimited(state, t0, 5, 1000), false);
    assert.equal(acceptRateLimited(state, t0 + 1001, 5, 1000), true);
  });
});
