import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  createReportRateLimiter,
  flushReports,
  registerReporter,
  reportError,
  setReportRateLimiter,
  type Reporter,
} from "./report";

const REPORTER_KEY = Symbol.for("fg.monitoring.reporter");

function clearReporter(): void {
  delete (globalThis as Record<symbol, unknown>)[REPORTER_KEY];
}

describe("reportError", () => {
  afterEach(() => {
    clearReporter();
    setReportRateLimiter(createReportRateLimiter());
  });

  it("falls back to console.error when no reporter is registered", () => {
    const errSpy = mock.method(console, "error", () => {});
    reportError(new Error("boom"), { source: "redis" });
    assert.equal(errSpy.mock.callCount(), 1);
    assert.match(String(errSpy.mock.calls[0]?.arguments[0]), /redis/);
    assert.match(String(errSpy.mock.calls[0]?.arguments[1]), /boom/);
    errSpy.mock.restore();
  });

  it("rate limits per dedupeKey to one report per 60 seconds", () => {
    let t = 0;
    setReportRateLimiter(createReportRateLimiter(() => t));
    let captures = 0;
    registerReporter({
      capture() {
        captures += 1;
      },
      flush: async () => true,
    });

    reportError(new Error("same"), { source: "redis", dedupeKey: "k1" });
    reportError(new Error("same"), { source: "redis", dedupeKey: "k1" });
    assert.equal(captures, 1);

    t = 61_000;
    reportError(new Error("same"), { source: "redis", dedupeKey: "k1" });
    assert.equal(captures, 2);
  });

  it("rate limits globally to 30 reports per minute", () => {
    let t = 0;
    setReportRateLimiter(createReportRateLimiter(() => t));
    let captures = 0;
    registerReporter({
      capture() {
        captures += 1;
      },
      flush: async () => true,
    });

    for (let i = 0; i < 30; i++) {
      reportError(new Error(`e${i}`), {
        source: "ws",
        dedupeKey: `key-${i}`,
      });
    }
    assert.equal(captures, 30);

    reportError(new Error("one more"), {
      source: "ws",
      dedupeKey: "key-extra",
    });
    assert.equal(captures, 30);

    t = 61_000;
    reportError(new Error("after window"), {
      source: "ws",
      dedupeKey: "key-after",
    });
    assert.equal(captures, 31);
  });

  it("does not propagate when the reporter throws", () => {
    registerReporter({
      capture() {
        throw new Error("reporter failed");
      },
      flush: async () => true,
    });
    assert.doesNotThrow(() => {
      reportError(new Error("client"), { source: "client" });
    });
  });
});

describe("flushReports", () => {
  afterEach(() => {
    clearReporter();
  });

  it("resolves true when no reporter is registered", async () => {
    assert.equal(await flushReports(), true);
  });

  it("delegates to the registered reporter", async () => {
    let flushed = false;
    const reporter: Reporter = {
      capture() {},
      async flush(timeoutMs) {
        assert.equal(timeoutMs, 500);
        flushed = true;
        return true;
      },
    };
    registerReporter(reporter);
    assert.equal(await flushReports(500), true);
    assert.equal(flushed, true);
  });
});
