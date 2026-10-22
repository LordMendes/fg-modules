import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkReadiness } from "./readiness";

describe("checkReadiness", () => {
  it("is ready when the probe succeeds", async () => {
    const result = await checkReadiness(async () => [{ "?column?": 1 }], 2_000);
    assert.deepEqual(result, { ready: true });
  });

  it("is not ready when the probe rejects", async () => {
    const result = await checkReadiness(async () => {
      throw new Error("ECONNREFUSED");
    }, 2_000);
    assert.deepEqual(result, { ready: false, reason: "error" });
  });

  it("is not ready when the probe throws synchronously", async () => {
    const result = await checkReadiness(() => {
      throw new Error("bad probe");
    }, 2_000);
    assert.deepEqual(result, { ready: false, reason: "error" });
  });

  it("is not ready when the probe hangs past the timeout", async () => {
    const started = Date.now();
    const result = await checkReadiness(() => new Promise(() => {}), 25);
    assert.deepEqual(result, { ready: false, reason: "timeout" });
    assert.ok(Date.now() - started < 1_000);
  });
});
