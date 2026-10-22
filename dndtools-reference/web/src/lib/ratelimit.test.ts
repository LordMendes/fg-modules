import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getClientIp, rateLimit } from "./ratelimit";

describe("getClientIp", () => {
  it("prefers cf-connecting-ip over spoofable forwarding headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.9, 10.0.0.1",
    });
    assert.equal(getClientIp(headers), "203.0.113.7");
  });

  it("falls back to the first X-Forwarded-For entry", () => {
    const headers = new Headers({ "x-forwarded-for": " 198.51.100.9 , 10.0.0.1" });
    assert.equal(getClientIp(headers), "198.51.100.9");
  });

  it("skips empty headers instead of returning an empty key", () => {
    const headers = new Headers({
      "cf-connecting-ip": "   ",
      "x-forwarded-for": "",
      "x-real-ip": "192.0.2.4",
    });
    assert.equal(getClientIp(headers), "192.0.2.4");
  });

  it("returns unknown when no IP header is present", () => {
    assert.equal(getClientIp(new Headers()), "unknown");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit, then rejects within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      assert.equal(rateLimit(key, 3, 60_000).success, true);
    }
    assert.equal(rateLimit(key, 3, 60_000).success, false);
  });
});
