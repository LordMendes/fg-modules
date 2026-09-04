import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  damageTypeColor,
  damageTypeTone,
  weaponDamageColor,
} from "./damageTypeColors";

describe("damageTypeColor", () => {
  it("maps physical abbreviations and full names", () => {
    assert.equal(damageTypeColor("S"), damageTypeColor("slashing"));
    assert.equal(damageTypeColor("P"), damageTypeColor("piercing"));
    assert.equal(damageTypeColor("B"), damageTypeColor("bludgeoning"));
    assert.ok(damageTypeColor("S")?.startsWith("#"));
  });

  it("maps energy types", () => {
    assert.equal(damageTypeColor("fire"), "#E85D04");
    assert.equal(damageTypeColor("cold"), "#4CC9F0");
    assert.equal(damageTypeColor("electricity"), "#FFD60A");
    assert.equal(damageTypeColor("acid"), "#80B918");
  });

  it("returns null for empty or unknown", () => {
    assert.equal(damageTypeColor(null), null);
    assert.equal(damageTypeColor(""), null);
    assert.equal(damageTypeColor("void"), null);
  });
});

describe("weaponDamageColor", () => {
  it("falls back to tray gold", () => {
    assert.equal(weaponDamageColor(null), "#C9A227");
  });
});

describe("damageTypeTone", () => {
  it("normalizes aliases for CSS classes", () => {
    assert.equal(damageTypeTone("S"), "slashing");
    assert.equal(damageTypeTone("lightning"), "electricity");
    assert.equal(damageTypeTone("fire"), "fire");
  });
});
