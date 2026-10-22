import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COOKIE_NAME,
  isCrossSiteRequest,
  parseSessionToken,
  resolveBootstrapSession,
} from "./session";

describe("resolveBootstrapSession", () => {
  it("mints a signed session when there is no cookie", () => {
    const result = resolveBootstrapSession(undefined);
    assert.equal(result.isNew, true);
    const parsed = parseSessionToken(result.token);
    assert.ok(parsed, "minted token must verify");
    assert.equal(parsed.nonce, result.session.nonce);
  });

  it("reuses a valid cookie without changing the nonce", () => {
    const first = resolveBootstrapSession(undefined);
    const second = resolveBootstrapSession(first.token);
    assert.equal(second.isNew, false);
    assert.equal(second.token, first.token);
    assert.equal(second.session.nonce, first.session.nonce);
  });

  it("replaces a tampered cookie", () => {
    const first = resolveBootstrapSession(undefined);
    const [payload] = first.token.split(".");
    const tampered = `${payload}.${"0".repeat(64)}`;
    const result = resolveBootstrapSession(tampered);
    assert.equal(result.isNew, true);
    assert.notEqual(result.session.nonce, first.session.nonce);
  });

  it("replaces a malformed cookie", () => {
    for (const garbage of ["", "not-a-token", "a.b.c", "....."]) {
      const result = resolveBootstrapSession(garbage);
      assert.equal(result.isNew, true, `garbage ${JSON.stringify(garbage)}`);
    }
  });

  it("uses the cookie name the proxy and actions expect", () => {
    assert.equal(COOKIE_NAME, "dnd_session");
  });
});

describe("isCrossSiteRequest", () => {
  it("flags requests that Sec-Fetch-Site marks cross-site", () => {
    assert.equal(
      isCrossSiteRequest(new Headers({ "sec-fetch-site": "cross-site" })),
      true,
    );
  });

  it("allows same-origin, same-site, direct navigation, and missing headers", () => {
    for (const value of ["same-origin", "same-site", "none"]) {
      assert.equal(isCrossSiteRequest(new Headers({ "sec-fetch-site": value })), false);
    }
    assert.equal(isCrossSiteRequest(new Headers()), false);
  });
});
