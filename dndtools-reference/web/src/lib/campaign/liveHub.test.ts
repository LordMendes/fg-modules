import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getHubOriginIdForTests,
  unwrapLiveWirePayload,
} from "@/lib/campaign/liveHub";
import {
  acceptCommandRate,
  createRateLimitState,
  COMMAND_MAX_PER_SEC,
} from "@/lib/campaign/liveRateLimit";

describe("liveHub wire envelope", () => {
  it("unwraps origin-tagged payloads", () => {
    const event = {
      type: "mapPing" as const,
      x: 1,
      y: 2,
      color: "#fff",
      userId: "u1",
    };
    const wire = JSON.stringify({ originId: "other-process", event });
    const out = unwrapLiveWirePayload(wire);
    assert.deepEqual(out, event);
  });

  it("drops echo from the same process origin", () => {
    const origin = getHubOriginIdForTests();
    const event = {
      type: "mapPing" as const,
      x: 1,
      y: 2,
      color: "#fff",
      userId: "u1",
    };
    const wire = JSON.stringify({ originId: origin, event });
    assert.equal(unwrapLiveWirePayload(wire, origin), null);
  });

  it("accepts legacy bare events", () => {
    const event = {
      type: "mapPing" as const,
      x: 3,
      y: 4,
      color: "#000",
      userId: "u2",
    };
    assert.deepEqual(unwrapLiveWirePayload(JSON.stringify(event)), event);
  });
});

describe("command rate limit", () => {
  it("allows about 20 commands per second", () => {
    const state = createRateLimitState();
    const now = 1_000_000;
    let accepted = 0;
    for (let i = 0; i < COMMAND_MAX_PER_SEC + 5; i++) {
      if (acceptCommandRate(state, now + i)) accepted += 1;
    }
    assert.equal(accepted, COMMAND_MAX_PER_SEC);
  });
});
