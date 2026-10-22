import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFeatSections, isolateFeatSections } from "./feat-sections";

describe("isolateFeatSections", () => {
  it("keeps a clean prerequisite paragraph", () => {
    const result = isolateFeatSections({
      prerequisiteHtml: "<p>Dragonmarked race (human, dwarf, elf).</p>",
      benefitHtml: "<p>This feat provides you with a dragonmark spell-like ability.</p>",
      normalHtml: null,
      specialHtml: null,
    });
    assert.equal(result.prerequisiteHtml, "<p>Dragonmarked race (human, dwarf, elf).</p>");
  });

  it("drops benefit paragraphs appended after the real prerequisite", () => {
    const result = isolateFeatSections({
      prerequisiteHtml:
        "<p>Aberrant Dragonmark,</p><p>You can use the spell-like ability granted by your Aberrant Dragonmark three times per day.</p>",
      benefitHtml:
        "<p>You can use the spell-like ability granted by your Aberrant Dragonmark three times per day.</p>",
      normalHtml: null,
      specialHtml: null,
    });
    assert.equal(result.prerequisiteHtml, "<p>Aberrant Dragonmark,</p>");
    assert.match(result.benefitHtml ?? "", /three times per day/);
  });

  it("hides prerequisite when only leaked benefit text remains", () => {
    const result = isolateFeatSections({
      prerequisiteHtml:
        "<p>\n</p><p>When you cast a spell that damages an aberration, you deal an extra 2d6 points of damage.</p>",
      benefitHtml:
        "<p>When you cast a spell that deals damage to an aberration, you deal an extra 2d6 points of damage.</p>",
      normalHtml: null,
      specialHtml: null,
    });
    assert.equal(result.prerequisiteHtml, null);
  });

  it("splits a glued Benefit label out of the prerequisite", () => {
    const result = isolateFeatSections({
      prerequisiteHtml:
        "<p>Agy 15, Dance Spell (see above), level spells. B enefit: After you successfully cast a spell using the Dance Spell feat, the DCs increase.</p>",
      benefitHtml: null,
      normalHtml: null,
      specialHtml: null,
    });
    assert.equal(
      result.prerequisiteHtml,
      "<p>Agy 15, Dance Spell (see above), level spells.</p>",
    );
    assert.match(result.benefitHtml ?? "", /After you successfully cast/);
  });

  it("splits a Benefits label glued onto a short prerequisite", () => {
    const result = isolateFeatSections({
      prerequisiteHtml:
        "<p>1st level character, racial bonus to one ability. Benefits: Choose one ability to which you have a racial bonus.</p>",
      benefitHtml: "",
      normalHtml: "<p>Most races have a +2 racial bonus to one ability.</p>",
      specialHtml: null,
    });
    assert.equal(
      result.prerequisiteHtml,
      "<p>1st level character, racial bonus to one ability.</p>",
    );
    assert.match(result.benefitHtml ?? "", /Choose one ability/);
    assert.match(result.normalHtml ?? "", /Most races have/);
  });
});

describe("buildFeatSections", () => {
  it("omits an empty prerequisite after stripping leaked text", () => {
    const sections = buildFeatSections({
      prerequisiteHtml:
        "<p></p><p>You can use the spell-like ability granted by your Aberrant Dragonmark three times per day.</p>",
      benefitHtml:
        "<p>You can use the spell-like ability granted by your Aberrant Dragonmark three times per day.</p>",
    });
    assert.deepEqual(
      sections.map((section) => section.title),
      ["Benefit"],
    );
  });

  it("shows only the prerequisite under Prerequisite", () => {
    const sections = buildFeatSections({
      prerequisiteHtml:
        "<p>Aberrant Dragonmark,</p><p>You can use the spell-like ability three times per day.</p>",
      benefitHtml: "<p>You can use the spell-like ability three times per day.</p>",
    });
    const prereq = sections.find((section) => section.title === "Prerequisite");
    assert.ok(prereq);
    assert.equal(prereq.html, "<p>Aberrant Dragonmark,</p>");
    assert.equal(prereq.html.includes("three times"), false);
  });
});
