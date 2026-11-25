import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deityDomainNames, domainNameAllowed, normalizeDeityKey } from "./deityDomains";

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
