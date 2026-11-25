import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deityDomainLinks,
  deityDomainNames,
  domainNameAllowed,
  normalizeDeityKey,
  pickDomainRecord,
  splitPortfolio,
} from "./deityDomains";

describe("deityDomainNames", () => {
  it("returns null when no deity is selected", () => {
    assert.equal(deityDomainNames(null, ""), null);
    assert.equal(deityDomainNames(undefined, "  "), null);
  });

  it("lists Pelor's domains from the slug or the display name", () => {
    assert.deepEqual(deityDomainNames("pelor"), ["Good", "Healing", "Strength", "Sun"]);
    assert.deepEqual(deityDomainNames(null, "Pelor"), ["Good", "Healing", "Strength", "Sun"]);
  });

  it("restores Ehlonna's Sun domain", () => {
    assert.deepEqual(deityDomainNames("ehlonna"), ["Animal", "Good", "Plant", "Sun"]);
  });

  it("normalizes punctuation in deity names", () => {
    assert.equal(normalizeDeityKey("St. Cuthbert"), "st-cuthbert");
    assert.deepEqual(deityDomainNames("st-cuthbert", "St. Cuthbert")?.[0], "Destruction");
  });

  it("returns an empty list when the deity has no recorded domains", () => {
    assert.deepEqual(deityDomainNames("bhaal", "Bhaal"), []);
  });

  it("lists Forgotten Realms deity domains from the slug or the display name", () => {
    assert.deepEqual(deityDomainNames("mystra"), [
      "Good",
      "Illusion",
      "Knowledge",
      "Magic",
      "Rune",
      "Spell",
    ]);
    assert.deepEqual(deityDomainNames("sel-ne", "Selûne"), [
      "Chaos",
      "Good",
      "Moon",
      "Protection",
      "Travel",
    ]);
    assert.ok(deityDomainNames("tymora")?.includes("Luck"));
  });
});

describe("domainNameAllowed", () => {
  it("allows any domain when no deity is selected", () => {
    assert.equal(domainNameAllowed("Magic", null), true);
  });

  it("matches the deity list without regard to case", () => {
    const allowed = deityDomainNames("boccob");
    assert.equal(domainNameAllowed("magic", allowed), true);
    assert.equal(domainNameAllowed("Sun", allowed), false);
  });

  it("matches catalog names that append a source", () => {
    const allowed = deityDomainNames("grumbar");
    assert.equal(domainNameAllowed("Cavern (FRCS)", allowed), true);
    assert.equal(domainNameAllowed("Cavernous", allowed), false);
  });
});

describe("splitPortfolio", () => {
  it("splits comma-separated portfolio text and drops a dash placeholder", () => {
    assert.deepEqual(splitPortfolio("Magic , Spells , The Weave"), ["Magic", "Spells", "The Weave"]);
    assert.deepEqual(splitPortfolio("—"), []);
    assert.deepEqual(splitPortfolio(null), []);
  });
});

describe("deityDomainLinks", () => {
  it("links an exact catalog name ahead of a source-suffixed reprint", () => {
    const links = deityDomainLinks("pelor", "Pelor", [
      { name: "Good (SpC)", slug: "good-spc" },
      { name: "Good", slug: "good-103" },
      { name: "Healing", slug: "healing-1" },
      { name: "Strength", slug: "strength-1" },
      { name: "Sun", slug: "sun-1" },
    ]);
    assert.deepEqual(links[0], { label: "Good", href: "/domains/good-103" });
    assert.equal(links.length, 4);
  });

  it("prefers the Spell Compendium reprint when no exact name exists", () => {
    const picked = pickDomainRecord("Cavern", [
      { name: "Cavern (FRCS)", slug: "cavern-frcs" },
      { name: "Cavern (SpC)", slug: "cavern-spc" },
      { name: "Cavernous", slug: "cavernous" },
    ]);
    assert.equal(picked?.slug, "cavern-spc");
  });

  it("returns no links when the deity has no recorded domains", () => {
    assert.deepEqual(deityDomainLinks("bhaal", "Bhaal", [{ name: "Death", slug: "death" }]), []);
  });
});
