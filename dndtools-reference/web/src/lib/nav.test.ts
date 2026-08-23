import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FLAWS_LINK,
  isBrowseActive,
  isBrowseItemActive,
  isPrimaryNavActive,
} from "./nav";

describe("nav helpers", () => {
  it("marks primary nav active by prefix except goods exact path", () => {
    assert.equal(isPrimaryNavActive("/tools", "/tools/pc-planner"), true);
    assert.equal(isPrimaryNavActive("/stores/goods", "/stores/goods"), true);
    assert.equal(
      isPrimaryNavActive("/stores/goods", "/stores/goods/extra"),
      true,
    );
    assert.equal(isPrimaryNavActive("/tools", "/sources"), false);
  });

  it("marks browse active for categories and flaws filter", () => {
    assert.equal(isBrowseActive("/spells", new URLSearchParams()), true);
    assert.equal(
      isBrowseActive("/feats", new URLSearchParams("type=Flaw")),
      true,
    );
    assert.equal(isBrowseActive("/tools", new URLSearchParams()), false);
  });

  it("marks flaws item active only on flaw filter", () => {
    assert.equal(
      isBrowseItemActive(
        FLAWS_LINK.href,
        "/feats",
        new URLSearchParams("type=Flaw"),
      ),
      true,
    );
    assert.equal(
      isBrowseItemActive(
        FLAWS_LINK.href,
        "/feats",
        new URLSearchParams(),
      ),
      false,
    );
    assert.equal(
      isBrowseItemActive("/feats", "/feats", new URLSearchParams("type=Flaw")),
      false,
    );
  });
});
