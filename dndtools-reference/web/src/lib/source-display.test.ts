import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLACEHOLDER_SOURCE_NAME,
  buildSourceDisplayNameMap,
  pickSourceDisplayName,
} from "./source-display";

describe("source display names", () => {
  it("prefers a real book title over the Core placeholder", () => {
    assert.equal(
      pickSourceDisplayName(["Core", "Complete Adventurer"]),
      "Complete Adventurer",
    );
  });

  it("keeps the longest non-Core title when abbrevs collide", () => {
    assert.equal(
      pickSourceDisplayName(["Athasian Emporium", "Arms and Equipment Guide"]),
      "Arms and Equipment Guide",
    );
  });

  it("builds an abbrev lookup from all source rows", () => {
    const map = buildSourceDisplayNameMap([
      { abbrev: "CAd", name: PLACEHOLDER_SOURCE_NAME },
      { abbrev: "CAd", name: "Complete Adventurer" },
      { abbrev: "PHB", name: PLACEHOLDER_SOURCE_NAME },
      { abbrev: "PHB", name: "Player's Handbook" },
    ]);
    assert.equal(map.get("CAd"), "Complete Adventurer");
    assert.equal(map.get("PHB"), "Player's Handbook");
  });

  it("falls back to abbrev when only Core is known", () => {
    const map = buildSourceDisplayNameMap([
      { abbrev: "DMG", name: PLACEHOLDER_SOURCE_NAME },
    ]);
    assert.equal(map.get("DMG"), "DMG");
  });
});
