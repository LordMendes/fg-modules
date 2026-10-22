import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNoiseError, scrubEvent } from "./scrub";

describe("isNoiseError", () => {
  it("matches expected noise errors", () => {
    assert.equal(isNoiseError(new Error("Forbidden")), true);
    assert.equal(isNoiseError(new Error("Unauthorized")), true);
    assert.equal(
      isNoiseError(
        Object.assign(new Error("missing"), {
          name: "UnrecognizedActionError",
        }),
      ),
      true,
    );
    assert.equal(
      isNoiseError(new Error("Server action foo was not found on the server")),
      true,
    );
    assert.equal(
      isNoiseError(new Error("ResizeObserver loop limit exceeded")),
      true,
    );
    assert.equal(
      isNoiseError(Object.assign(new Error("aborted"), { name: "AbortError" })),
      true,
    );
    assert.equal(
      isNoiseError(new Error("The user aborted a request.")),
      true,
    );
  });

  it("does not match unexpected errors", () => {
    assert.equal(
      isNoiseError(
        new Error("Campaign database is not ready. Restart the dev server."),
      ),
      false,
    );
    assert.equal(isNoiseError(new Error("Failed to generate join code")), false);
    assert.equal(isNoiseError(new Error("Something broke")), false);
  });
});

describe("scrubEvent", () => {
  it("removes cookies, bodies, query strings, and sensitive user fields", () => {
    const event = {
      request: {
        cookies: { session: "secret" },
        data: "body",
        query_string: "token=abc",
        headers: {
          Authorization: "Bearer x",
          Cookie: "session=secret",
          "Set-Cookie": "a=1",
          "x-session-nonce": "nonce-value",
          Accept: "application/json",
        },
      },
      user: {
        id: "user-1",
        email: "a@b.com",
        username: "alice",
        ip_address: "127.0.0.1",
      },
    };

    const out = scrubEvent(event);
    assert.ok(out);
    assert.equal(out.request?.cookies, undefined);
    assert.equal(out.request?.data, undefined);
    assert.equal(out.request?.query_string, undefined);
    assert.deepEqual(out.request?.headers, { Accept: "application/json" });
    assert.deepEqual(out.user, { id: "user-1" });
  });

  it("returns null for noise exceptions", () => {
    const dropped = scrubEvent({
      exception: {
        values: [{ type: "Error", value: "Forbidden" }],
      },
    });
    assert.equal(dropped, null);

    const kept = scrubEvent({
      exception: {
        values: [{ type: "Error", value: "Database connection lost" }],
      },
    });
    assert.ok(kept);
  });
});
