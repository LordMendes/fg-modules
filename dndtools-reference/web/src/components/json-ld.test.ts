import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entityJsonLd } from "./json-ld";

const url = "https://dnd-helper.com/spells/fireball";

describe("entityJsonLd", () => {
  it("emits a DefinedTerm with key facts as additionalProperty", () => {
    const [term] = entityJsonLd({
      name: "Fireball",
      description: "Fire damage in a burst.",
      url,
      termSetName: "Spells",
      termSetUrl: "https://dnd-helper.com/spells",
      properties: [
        { name: "School", value: "Evocation [Fire]" },
        { name: "Duration", value: "Instantaneous" },
      ],
      source: { name: "Player's Handbook", abbrev: "PHB", page: 231 },
    });

    assert.equal(term?.["@type"], "DefinedTerm");
    assert.equal(term?.["@id"], `${url}#term`);
    assert.deepEqual(term?.additionalProperty, [
      { "@type": "PropertyValue", name: "School", value: "Evocation [Fire]" },
      { "@type": "PropertyValue", name: "Duration", value: "Instantaneous" },
    ]);
    assert.equal(Object.hasOwn(term ?? {}, "dateModified"), false);
    assert.equal(Object.hasOwn(term ?? {}, "citation"), false);
  });

  it("puts dateModified and citation on the WebPage node that references the term", () => {
    const [, page] = entityJsonLd({
      name: "Fireball",
      description: "Fire damage in a burst.",
      url,
      termSetName: "Spells",
      termSetUrl: "https://dnd-helper.com/spells",
      properties: [],
      source: { name: "Player's Handbook", abbrev: "PHB", page: 231 },
      dateModified: "2026-10-01T00:00:00.000Z",
    });

    assert.equal(page?.["@type"], "WebPage");
    assert.equal(page?.dateModified, "2026-10-01T00:00:00.000Z");
    assert.deepEqual(page?.mainEntity, { "@id": `${url}#term` });
    assert.deepEqual(page?.citation, {
      "@type": "CreativeWork",
      name: "Player's Handbook",
      alternateName: "PHB",
      pagination: "231",
    });
  });

  it("omits optional citation fields and dateModified when absent", () => {
    const [term, page] = entityJsonLd({
      name: "Power Attack",
      description: "Trade accuracy for damage.",
      url: "https://dnd-helper.com/feats/power-attack",
      termSetName: "Feats",
      termSetUrl: "https://dnd-helper.com/feats",
      properties: [],
      source: { name: "Player's Handbook", abbrev: null, page: null },
      dateModified: null,
    });

    assert.equal(Object.hasOwn(term ?? {}, "additionalProperty"), false);
    assert.equal(Object.hasOwn(page ?? {}, "dateModified"), false);
    assert.deepEqual(page?.citation, {
      "@type": "CreativeWork",
      name: "Player's Handbook",
    });
  });
});
