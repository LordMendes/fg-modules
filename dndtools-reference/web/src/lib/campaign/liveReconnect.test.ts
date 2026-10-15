import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_FAILURES_BEFORE_FIRST_OPEN,
  RECONNECT_MAX_MS,
  reconnectDelayMs,
  shouldGiveUpBeforeFirstOpen,
} from "./liveReconnect";

describe("reconnectDelayMs", () => {
  it("doubles the ceiling each attempt and stays within [ceiling/2, ceiling]", () => {
    // random = 0 gives the lower bound, random -> 1 gives the ceiling.
    assert.equal(reconnectDelayMs(0, () => 0), 250);
    assert.equal(reconnectDelayMs(1, () => 0), 500);
    assert.equal(reconnectDelayMs(2, () => 0), 1000);
    assert.equal(reconnectDelayMs(0, () => 0.999999), 500);
  });

  it("caps the ceiling at the maximum", () => {
    assert.equal(reconnectDelayMs(50, () => 1), RECONNECT_MAX_MS);
    assert.ok(reconnectDelayMs(50, () => 0) >= RECONNECT_MAX_MS / 2);
  });

  it("spreads clients across the window instead of one fixed delay", () => {
    const low = reconnectDelayMs(3, () => 0);
    const high = reconnectDelayMs(3, () => 0.9999);
    assert.notEqual(low, high);
  });
});

describe("shouldGiveUpBeforeFirstOpen", () => {
  it("keeps retrying below the threshold", () => {
    assert.equal(shouldGiveUpBeforeFirstOpen(MAX_FAILURES_BEFORE_FIRST_OPEN - 1), false);
  });

  it("gives up at the threshold", () => {
    assert.equal(shouldGiveUpBeforeFirstOpen(MAX_FAILURES_BEFORE_FIRST_OPEN), true);
  });
});
