import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMissingObjectError,
  isNotModified,
  mediaEtag,
} from "./media-response";

describe("mediaEtag", () => {
  it("quotes the object key", () => {
    assert.equal(mediaEtag("pc/u1/p1/profile.webp"), '"pc/u1/p1/profile.webp"');
  });
});

describe("isNotModified", () => {
  const etag = mediaEtag("pc/u1/p1/token.webp");

  it("matches the exact ETag", () => {
    assert.equal(isNotModified(etag, etag), true);
  });

  it("matches inside a comma-separated list", () => {
    assert.equal(isNotModified(`"other", ${etag}`, etag), true);
  });

  it("matches a weak validator", () => {
    assert.equal(isNotModified(`W/${etag}`, etag), true);
  });

  it("ignores a wildcard", () => {
    assert.equal(isNotModified("*", etag), false);
  });

  it("does not match a different key", () => {
    assert.equal(isNotModified('"pc/u1/p1/profile.webp"', etag), false);
  });

  it("is false when the header is absent", () => {
    assert.equal(isNotModified(null, etag), false);
  });
});

describe("isMissingObjectError", () => {
  it("treats NoSuchKey and NotFound as missing", () => {
    assert.equal(isMissingObjectError({ name: "NoSuchKey" }), true);
    assert.equal(isMissingObjectError({ name: "NotFound" }), true);
  });

  it("treats a bare 404 status as missing", () => {
    assert.equal(
      isMissingObjectError({ $metadata: { httpStatusCode: 404 } }),
      true,
    );
  });

  it("does not treat a missing bucket as a missing object", () => {
    assert.equal(
      isMissingObjectError({
        name: "NoSuchBucket",
        $metadata: { httpStatusCode: 404 },
      }),
      false,
    );
  });

  it("does not treat timeouts or network errors as missing", () => {
    assert.equal(isMissingObjectError({ name: "TimeoutError" }), false);
    assert.equal(isMissingObjectError(new Error("socket hang up")), false);
    assert.equal(isMissingObjectError(null), false);
  });
});
