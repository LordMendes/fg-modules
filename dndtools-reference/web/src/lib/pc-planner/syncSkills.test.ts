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
