import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classSlugsKey, mergeClassSkillsIntoRows } from "./syncSkills";

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
});

describe("classSlugsKey", () => {
  it("sorts and deduplicates slugs", () => {
    assert.equal(classSlugsKey(["fighter", "wizard", "fighter"]), "fighter\0wizard");
  });
});
