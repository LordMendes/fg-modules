import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FLAWS_LINK,
  EQUIPMENT_ARMOR_LINK,
  EQUIPMENT_WEAPONS_LINK,
  isBrowseActive,
  isBrowseItemActive,
  isPrimaryNavActive,
} from "./nav";

describe("nav helpers", () => {
  it("marks primary nav active by prefix except goods exact path", () => {
    assert.equal(isPrimaryNavActive("/tools", "/tools/pc-planner"), true);
    assert.equal(isPrimaryNavActive("/spells", "/spells/fireball"), true);
    assert.equal(isPrimaryNavActive("/feats", "/feats"), true);
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

  it("marks equipment sub-links active by kind query", () => {
    assert.equal(
      isBrowseItemActive("/equipment", "/equipment", new URLSearchParams()),
      true,
    );
    assert.equal(
      isBrowseItemActive("/equipment", "/equipment", new URLSearchParams("kind=weapon")),
      false,
    );
    assert.equal(
      isBrowseItemActive(
        EQUIPMENT_WEAPONS_LINK.href,
        "/equipment",
        new URLSearchParams("kind=weapon"),
      ),
      true,
    );
    assert.equal(
      isBrowseItemActive(
        EQUIPMENT_ARMOR_LINK.href,
        "/equipment",
        new URLSearchParams("kind=armor"),
      ),
      true,
    );
  });
});
