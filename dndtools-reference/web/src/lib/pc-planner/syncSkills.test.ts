import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classSkillKeySet,
  classSlugsKey,
  mergeClassSkillsIntoRows,
  mergeSkillsIntoRows,
} from "./syncSkills";

describe("mergeClassSkillsIntoRows", () => {
  it("builds rows from class skills with zero ranks", () => {
    const rows = mergeClassSkillsIntoRows(
      [{ name: "Climb", slug: "climb", ability: "Str" }],
      [],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Climb");
    assert.equal(rows[0].slug, "climb");
    assert.equal(rows[0].ability, "Str");
    assert.equal(rows[0].ranks, 0);
    assert.equal(rows[0].misc, 0);
  });

  it("preserves ranks and misc for matching skills", () => {
    const rows = mergeClassSkillsIntoRows(
      [{ name: "Climb", slug: "climb", ability: "Str" }],
      [{ name: "Climb", slug: "climb", ranks: 3, misc: 1 }],
    );
    assert.equal(rows[0].ranks, 3);
    assert.equal(rows[0].misc, 1);
  });

  it("merges multiclass skill lists without duplicates", () => {
    const rows = mergeClassSkillsIntoRows(
      [
        { name: "Climb", slug: "climb", ability: "Str" },
        { name: "Jump", slug: "jump", ability: "Str" },
      ],
      [{ name: "Climb", slug: "climb", ranks: 2, misc: 0 }],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].ranks, 2);
    assert.equal(rows[1].ranks, 0);
  });

  it("preserves orphaned skill ranks when class is removed", () => {
    const rows = mergeClassSkillsIntoRows(
      [{ name: "Climb", slug: "climb", ability: "Str" }],
      [{ name: "Hide", slug: "hide", ranks: 5, misc: 0 }],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows.find((r) => r.slug === "hide")?.ranks, 5);
  });
});

describe("mergeSkillsIntoRows", () => {
  it("loads the full catalog and preserves trained-only / ACP flags", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Hide",
          slug: "hide",
          ability: "Dex",
          trainedOnly: false,
          armorCheckPenalty: true,
        },
        {
          name: "Disable Device",
          slug: "disable-device",
          ability: "Int",
          trainedOnly: true,
          armorCheckPenalty: false,
        },
      ],
      [{ name: "Hide", slug: "hide", ranks: 4, misc: 1 }],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].ranks, 4);
    assert.equal(rows[0].armorCheckPenalty, true);
    assert.equal(rows[1].trainedOnly, true);
    assert.equal(rows[1].ranks, 0);
  });

  it("coerces half ranks to whole ranks", () => {
    const rows = mergeSkillsIntoRows(
      [{ name: "Hide", slug: "hide", ability: "Dex", trainedOnly: false, armorCheckPenalty: true }],
      [{ name: "Hide", slug: "hide", ranks: 2.5, misc: 0 }],
    );
    assert.equal(rows[0].ranks, 2);
  });

  it("hides generic Craft/Knowledge/Profession/Perform rows", () => {
    const rows = mergeSkillsIntoRows(
      [
        { name: "Climb", slug: "climb", ability: "Str", trainedOnly: false, armorCheckPenalty: true },
        { name: "Craft", slug: "craft", ability: "Int", trainedOnly: false, armorCheckPenalty: false },
        { name: "Knowledge", slug: "knowledge", ability: "Int", trainedOnly: true, armorCheckPenalty: false },
        { name: "Profession", slug: "profession", ability: "Wis", trainedOnly: true, armorCheckPenalty: false },
        { name: "Perform", slug: "perform", ability: "Cha", trainedOnly: false, armorCheckPenalty: false },
      ],
      [],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, "climb");
  });

  it("keeps class-listed Knowledge variants and drops the rest", () => {
    const classKeys = classSkillKeySet([
      { name: "Knowledge (arcana)", slug: "knowledge-arcana", ability: "Int" },
    ]);
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Knowledge (arcana)",
          slug: "knowledge-arcana",
          ability: "Int",
          trainedOnly: true,
          armorCheckPenalty: false,
        },
        {
          name: "Knowledge (local)",
          slug: "knowledge-local",
          ability: "Int",
          trainedOnly: true,
          armorCheckPenalty: false,
        },
      ],
      [],
      classKeys,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, "knowledge-arcana");
  });

  it("keeps player-added specialty variants that are not class skills", () => {
    const rows = mergeSkillsIntoRows(
      [{ name: "Climb", slug: "climb", ability: "Str", trainedOnly: false, armorCheckPenalty: true }],
      [{ name: "Craft (weaponsmithing)", slug: "craft-weaponsmithing", ranks: 3, misc: 0 }],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows.find((row) => row.slug === "craft-weaponsmithing")?.ranks, 3);
  });

  it("drops saved generic family rows even if they had ranks", () => {
    const rows = mergeSkillsIntoRows(
      [
        { name: "Climb", slug: "climb", ability: "Str", trainedOnly: false, armorCheckPenalty: true },
        { name: "Craft", slug: "craft", ability: "Int", trainedOnly: false, armorCheckPenalty: false },
      ],
      [{ name: "Craft", slug: "craft", ranks: 4, misc: 0 }],
    );
    assert.equal(rows.some((row) => row.slug === "craft"), false);
  });
});

describe("classSkillKeySet", () => {
  it("keys by slug when present", () => {
    const keys = classSkillKeySet([{ name: "Hide", slug: "hide", ability: "Dex" }]);
    assert.equal(keys.has("hide"), true);
  });
});

describe("classSlugsKey", () => {
  it("sorts and deduplicates slugs", () => {
    assert.equal(classSlugsKey(["fighter", "wizard", "fighter"]), "fighter\0wizard");
  });
});
