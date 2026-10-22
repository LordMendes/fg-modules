import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partitionPresence, PRESENCE_TTL_SECONDS } from "./liveRoom";

describe("partitionPresence", () => {
  it("keeps users with at least one connection and drops empty sets", () => {
    const result = partitionPresence(["u1", "u2", "u3"], [2, 0, 1]);
    assert.deepEqual(result, { live: ["u1", "u3"], stale: ["u2"] });
  });

  it("treats a missing count as stale", () => {
    const result = partitionPresence(["u1", "u2"], [1]);
    assert.deepEqual(result, { live: ["u1"], stale: ["u2"] });
  });

  it("returns empty lists for no candidates", () => {
    assert.deepEqual(partitionPresence([], []), { live: [], stale: [] });
  });
});

describe("presence TTL", () => {
  it("expires well after the 30 s heartbeat so one missed beat does not drop a live user", () => {
    assert.ok(PRESENCE_TTL_SECONDS >= 3 * 30);
  });
});
