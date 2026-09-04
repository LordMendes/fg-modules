import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SkillCatalogEntry } from "@/lib/entities";
import {
  canRemoveSpecialtyRow,
  coerceSkillRanks,
  createSpecialtySkillRow,
  isGenericFamilySkill,
  parseSpecialtySkill,
  specialtyPreviewSlug,
} from "./skillSpecialty";

const catalog: SkillCatalogEntry[] = [
  {
    name: "Craft",
    slug: "craft",
    ability: "Int",
    trainedOnly: false,
    armorCheckPenalty: false,
  },
  {
    name: "Knowledge (arcana)",
    slug: "knowledge-arcana",
    ability: "Int",
    trainedOnly: true,
    armorCheckPenalty: false,
  },
  {
    name: "Knowledge",
    slug: "knowledge",
    ability: "Int",
    trainedOnly: true,
    armorCheckPenalty: false,
  },
];

describe("coerceSkillRanks", () => {
  it("truncates to a non-negative integer", () => {
    assert.equal(coerceSkillRanks(2.5), 2);
    assert.equal(coerceSkillRanks(-1), 0);
    assert.equal(coerceSkillRanks(Number.NaN), 0);
  });
});

describe("parseSpecialtySkill", () => {
  it("parses family and variant from the display name", () => {
    const parsed = parseSpecialtySkill("Craft (weaponsmithing)", "craft-weaponsmithing");
    assert.equal(parsed?.family, "craft");
    assert.equal(parsed?.variant, "weaponsmithing");
  });

  it("does not treat generic family rows as variants", () => {
    assert.equal(parseSpecialtySkill("Craft", "craft"), null);
    assert.equal(isGenericFamilySkill("Craft", "craft"), true);
    assert.equal(isGenericFamilySkill("Craft", "craft-ecs-variant"), true);
  });
});

describe("createSpecialtySkillRow", () => {
  it("builds Craft (weaponsmithing) from the family catalog entry", () => {
    const row = createSpecialtySkillRow("craft", "weaponsmithing", catalog, []);
    assert.ok(row);
    assert.equal(row.name, "Craft (weaponsmithing)");
    assert.equal(row.slug, "craft-weaponsmithing");
    assert.equal(row.ability, "Int");
    assert.equal(row.trainedOnly, false);
  });

  it("uses the catalog slug for known Knowledge variants", () => {
    const row = createSpecialtySkillRow("knowledge", "arcana", catalog, []);
    assert.ok(row);
    assert.equal(row.slug, "knowledge-arcana");
    assert.equal(row.trainedOnly, true);
  });

  it("rejects duplicates", () => {
    const first = createSpecialtySkillRow("craft", "weapon smith", catalog, []);
    assert.ok(first);
    const dup = createSpecialtySkillRow("craft", "weapon smith", catalog, [first]);
    assert.equal(dup, null);
  });
});

describe("specialtyPreviewSlug", () => {
  it("opens the family page for custom Craft variants", () => {
    assert.equal(
      specialtyPreviewSlug(
        { name: "Craft (weaponsmithing)", slug: "craft-weaponsmithing" },
        catalog,
      ),
      "craft",
    );
  });

  it("opens the catalog page for known Knowledge variants", () => {
    assert.equal(
      specialtyPreviewSlug({ name: "Knowledge (arcana)", slug: "knowledge-arcana" }, catalog),
      "knowledge-arcana",
    );
  });
});

describe("canRemoveSpecialtyRow", () => {
  it("allows removing player-added variants that are not class-listed", () => {
    const keys = new Set(["craft", "knowledge-arcana"]);
    assert.equal(
      canRemoveSpecialtyRow(
        { name: "Craft (weaponsmithing)", slug: "craft-weaponsmithing" },
        keys,
      ),
      true,
    );
    assert.equal(
      canRemoveSpecialtyRow({ name: "Knowledge (arcana)", slug: "knowledge-arcana" }, keys),
      false,
    );
  });
});
