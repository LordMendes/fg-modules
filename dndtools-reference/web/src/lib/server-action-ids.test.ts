import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionIdsFromManifest } from "./server-action-ids";

describe("actionIdsFromManifest", () => {
  it("reads node action ids", () => {
    const ids = actionIdsFromManifest(
      JSON.stringify({ node: { abc: { filename: "a.ts" }, def: {} }, edge: {} }),
    );
    assert.ok(ids);
    assert.equal(ids.has("abc"), true);
    assert.equal(ids.has("def"), true);
    assert.equal(ids.has("missing"), false);
  });

  it("returns null for an empty or unreadable manifest", () => {
    assert.equal(actionIdsFromManifest(JSON.stringify({ node: {} })), null);
    assert.equal(actionIdsFromManifest("not json"), null);
  });
});
