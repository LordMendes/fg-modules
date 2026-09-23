import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classSkillKeySet,
  classSlugsKey,
  collapseCatalogByName,
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
          sourceAbbrev: "PH",
        },
        {
          name: "Disable Device",
          slug: "disable-device",
          ability: "Int",
          trainedOnly: true,
          armorCheckPenalty: false,
          sourceAbbrev: "PH",
        },
      ],
      [{ name: "Hide", slug: "hide", ranks: 4, misc: 1 }],
    );
    assert.equal(rows.length, 2);
    const hide = rows.find((row) => row.slug === "hide");
    const disableDevice = rows.find((row) => row.slug === "disable-device");
    assert.equal(hide?.ranks, 4);
    assert.equal(hide?.armorCheckPenalty, true);
    assert.equal(disableDevice?.trainedOnly, true);
    assert.equal(disableDevice?.ranks, 0);
  });

  it("coerces half ranks to whole ranks", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Hide",
          slug: "hide",
          ability: "Dex",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
      ],
      [{ name: "Hide", slug: "hide", ranks: 2.5, misc: 0 }],
    );
    assert.equal(rows[0].ranks, 2);
  });

  it("hides generic Craft/Knowledge/Profession/Perform rows", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Climb",
          slug: "climb",
          ability: "Str",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
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
          sourceAbbrev: "PH",
        },
        {
          name: "Knowledge (local)",
          slug: "knowledge-local",
          ability: "Int",
          trainedOnly: true,
          armorCheckPenalty: false,
          sourceAbbrev: "PH",
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
      [
        {
          name: "Climb",
          slug: "climb",
          ability: "Str",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
      ],
      [{ name: "Craft (weaponsmithing)", slug: "craft-weaponsmithing", ranks: 3, misc: 0 }],
    );
    assert.equal(rows.length, 2);
    assert.equal(rows.find((row) => row.slug === "craft-weaponsmithing")?.ranks, 3);
  });

  it("drops saved generic family rows even if they had ranks", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Climb",
          slug: "climb",
          ability: "Str",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
        { name: "Craft", slug: "craft", ability: "Int", trainedOnly: false, armorCheckPenalty: false },
      ],
      [{ name: "Craft", slug: "craft", ranks: 4, misc: 0 }],
    );
    assert.equal(rows.some((row) => row.slug === "craft"), false);
  });

  it("collapses duplicate display names onto the PH core slug", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Intimidate",
          slug: "intimidate",
          ability: "Cha",
          trainedOnly: false,
          armorCheckPenalty: false,
          sourceAbbrev: "PH",
        },
        {
          name: "Intimidate",
          slug: "intimidate-tob-variant",
          ability: "Cha",
          trainedOnly: false,
          armorCheckPenalty: false,
          sourceAbbrev: "ToB",
        },
      ],
      [],
      new Set(),
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, "intimidate");
  });

  it("folds variant slug ranks onto the canonical skill row", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Tumble",
          slug: "tumble",
          ability: "Dex",
          trainedOnly: true,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
        {
          name: "Tumble",
          slug: "tumble-oa-variant",
          ability: "Dex",
          trainedOnly: true,
          armorCheckPenalty: true,
          sourceAbbrev: "OA",
        },
      ],
      [{ name: "Tumble", slug: "tumble-oa-variant", ranks: 5, misc: 2 }],
      new Set(),
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, "tumble");
    assert.equal(rows[0].ranks, 5);
    assert.equal(rows[0].misc, 2);
  });

  it("hides splatbook skills in core mode unless ranked or class-listed", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Autohypnosis",
          slug: "autohypnosis",
          ability: "Wis",
          trainedOnly: true,
          armorCheckPenalty: false,
          sourceAbbrev: "XPH",
        },
        {
          name: "Climb",
          slug: "climb",
          ability: "Str",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
      ],
      [],
      classSkillKeySet([{ name: "Climb", slug: "climb", ability: "Str" }]),
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].slug, "climb");
  });

  it("shows splatbook skills once in all-sources mode", () => {
    const rows = mergeSkillsIntoRows(
      [
        {
          name: "Autohypnosis",
          slug: "autohypnosis",
          ability: "Wis",
          trainedOnly: true,
          armorCheckPenalty: false,
          sourceAbbrev: "XPH",
        },
        {
          name: "Climb",
          slug: "climb",
          ability: "Str",
          trainedOnly: false,
          armorCheckPenalty: true,
          sourceAbbrev: "PH",
        },
      ],
      [],
      new Set(),
      { allSources: true },
    );
    assert.equal(rows.length, 2);
    assert.equal(rows.some((row) => row.slug === "autohypnosis"), true);
  });
});

describe("collapseCatalogByName", () => {
  it("prefers PH core over variant pages with the same name", () => {
    const collapsed = collapseCatalogByName([
      {
        name: "Sense Motive",
        slug: "sense-motive-oa-variant",
        ability: "Wis",
        trainedOnly: false,
        armorCheckPenalty: false,
        sourceAbbrev: "OA",
      },
      {
        name: "Sense Motive",
        slug: "sense-motive",
        ability: "Wis",
        trainedOnly: false,
        armorCheckPenalty: false,
        sourceAbbrev: "PH",
      },
    ]);
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0].slug, "sense-motive");
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
