import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyFeatAsset,
  featAssetKind,
  featAssetSpec,
  readFeatAsset,
} from "./featAsset";
import type { FeatEntry } from "./types";

function feat(name: string, extra: Partial<FeatEntry> = {}): FeatEntry {
  return { slug: "feat", name, ...extra };
}

describe("featAssetKind", () => {
  it("classifies choice feats by the asset they take", () => {
    assert.equal(featAssetKind("Weapon Focus"), "weapon");
    assert.equal(featAssetKind("Greater Weapon Focus"), "weapon");
    assert.equal(featAssetKind("Improved Critical"), "weapon");
    assert.equal(featAssetKind("Exotic Weapon Proficiency"), "exotic-weapon");
    assert.equal(featAssetKind("Spell Focus"), "school");
    assert.equal(featAssetKind("Greater Spell Focus"), "school");
    assert.equal(featAssetKind("Divine Metamagic"), "metamagic");
    assert.equal(featAssetKind("Skill Focus"), "skill");
    assert.equal(featAssetKind("Dodge"), null);
    assert.equal(featAssetKind("Corrupt Spell Focus"), null);
  });

  it("still classifies a name that already includes the asset", () => {
    assert.equal(featAssetKind("Spell Focus (Evocation)"), "school");
    assert.equal(featAssetKind("Weapon Focus (longsword)"), "weapon");
  });
});

describe("featAssetSpec", () => {
  it("offers a picker for the generic feat", () => {
    assert.equal(featAssetSpec(feat("Weapon Focus"))?.kind, "weapon");
    assert.equal(featAssetSpec(feat("Exotic Weapon Proficiency"))?.emptyLabel, "Choose an exotic weapon");
    assert.equal(featAssetSpec(feat("Spell Focus"))?.kind, "school");
    assert.equal(featAssetSpec(feat("Divine Metamagic"))?.kind, "metamagic");
    assert.equal(featAssetSpec(feat("Skill Focus"))?.kind, "skill");
  });

  it("leaves catalog feats that already name the asset", () => {
    assert.equal(featAssetSpec(feat("Spell Focus (Chaos)")), null);
    assert.equal(featAssetSpec(feat("Exotic Weapon Proficiency (Thorium Weapons)")), null);
  });
});

describe("applyFeatAsset", () => {
  it("stores a school on choice", () => {
    const row = feat("Spell Focus", { skillChoice: "hide" });
    applyFeatAsset(row, "Evocation");
    assert.equal(row.choice, "Evocation");
    assert.equal(row.skillChoice, undefined);
    assert.equal(readFeatAsset(row), "Evocation");
  });

  it("stores a skill on skillChoice", () => {
    const row = feat("Skill Focus", { choice: "longsword" });
    applyFeatAsset(row, "Hide");
    assert.equal(row.skillChoice, "Hide");
    assert.equal(row.choice, undefined);
    assert.equal(readFeatAsset(row), "Hide");
  });

  it("clears a blank weapon choice", () => {
    const row = feat("Weapon Focus", { choice: "longsword" });
    applyFeatAsset(row, "  ");
    assert.equal(row.choice, undefined);
    assert.equal(readFeatAsset(row), "");
  });
});
