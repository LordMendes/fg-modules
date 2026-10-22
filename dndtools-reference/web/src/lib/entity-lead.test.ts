import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEntityFaqs, buildEntityKeyFacts, buildEntityLead } from "./entity-lead";
import type { EntityDetail } from "./entities";

describe("buildEntityLead", () => {
  it("builds a spell lead from fields and related classes", () => {
    const entity: EntityDetail = {
      slug: "fireball",
      name: "Fireball",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Player's Handbook", abbrev: "PHB", edition: "3.5", page: 231 },
      fields: {
        School: "Evocation [Fire]",
        Range: "Long (400 ft. + 40 ft./level)",
        "Saving Throw": "Reflex half",
        Duration: "Instantaneous",
        "Casting Time": "1 standard action",
      },
      related: [
        { label: "Wizard", href: "/classes/wizard", meta: "Level 3" },
        { label: "Sorcerer", href: "/classes/sorcerer", meta: "Level 3" },
      ],
    };

    const lead = buildEntityLead("spells", entity);
    assert.ok(lead);
    assert.match(lead!, /Fireball is a D&D 3\.5 spell/);
    assert.match(lead!, /PHB/);
    assert.match(lead!, /Wizard \(Level 3\)/);
    assert.match(lead!, /Reflex half/);
  });

  it("builds a monster lead from CR and type", () => {
    const entity: EntityDetail = {
      slug: "goblin",
      name: "Goblin",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Monster Manual", abbrev: "MM", edition: "3.5", page: null },
      fields: {
        "Challenge Rating": "1/3",
        Type: "Humanoid (Goblinoid)",
        Size: "Small",
        "Hit Dice": "1d8",
      },
      related: [],
    };

    const lead = buildEntityLead("monsters", entity);
    assert.ok(lead);
    assert.match(lead!, /Goblin is a D&D 3\.5 monster/);
    assert.match(lead!, /CR 1\/3/);
    assert.match(lead!, /Small Humanoid/);
  });
});

describe("buildEntityFaqs", () => {
  const fireball: EntityDetail = {
    slug: "fireball",
    name: "Fireball",
    sourceUrl: null,
    descriptionHtml: null,
    descriptionText: "Long book prose that must never be copied into an answer.",
    source: { name: "Player's Handbook", abbrev: "PHB", edition: "3.5", page: 231 },
    fields: {
      School: "Evocation [Fire]",
      Range: "Long (400 ft. + 40 ft./level)",
      "Saving Throw": "Reflex half",
      Duration: "Instantaneous",
    },
    related: [
      { label: "Wizard", href: "/classes/wizard", meta: "Level 3" },
      { label: "Sorcerer", href: "/classes/sorcerer", meta: "Level 3" },
    ],
  };

  it("answers class list, range, and saving throw questions from fields", () => {
    const faqs = buildEntityFaqs("spells", fireball);
    const byQuestion = new Map(faqs.map((faq) => [faq.question, faq.answer]));
    assert.equal(
      byQuestion.get("Which classes can cast Fireball?"),
      "Fireball appears on the spell lists for Wizard (Level 3), Sorcerer (Level 3).",
    );
    assert.equal(
      byQuestion.get("What is the range of Fireball?"),
      "The range or area of Fireball is Long (400 ft. + 40 ft./level).",
    );
    assert.equal(
      byQuestion.get("What saving throw does Fireball allow?"),
      "The saving throw for Fireball is Reflex half.",
    );
  });

  it("never copies description prose into answers", () => {
    for (const faq of buildEntityFaqs("spells", fireball)) {
      assert.doesNotMatch(faq.answer, /Long book prose/);
    }
  });

  it("caps the list at three pairs in field order", () => {
    const faqs = buildEntityFaqs("monsters", {
      slug: "goblin",
      name: "Goblin",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Monster Manual", abbrev: "MM", edition: "3.5", page: 133 },
      fields: { "Challenge Rating": "1/3", Type: "Humanoid", Size: "Small", "Hit Dice": "1d8" },
      related: [],
    });
    assert.equal(faqs.length, 3);
    assert.equal(faqs[0]?.question, "What is the challenge rating of Goblin?");
    assert.equal(faqs[0]?.answer, "Goblin has a challenge rating of 1/3.");
  });

  it("falls back to the source question when no stat fields are present", () => {
    const faqs = buildEntityFaqs("rules", {
      slug: "grapple",
      name: "Grapple",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Player's Handbook", abbrev: "PHB", edition: "3.5", page: null },
      fields: {},
      related: [],
    });
    assert.deepEqual(faqs, [
      {
        question: "Which source covers Grapple?",
        answer: "Grapple is covered in Player's Handbook (PHB).",
      },
    ]);
  });

  it("answers trained-only skills in plain language", () => {
    const faqs = buildEntityFaqs("skills", {
      slug: "climb",
      name: "Climb",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Player's Handbook", abbrev: "PHB", edition: "3.5", page: 76 },
      fields: { "Key Ability": "Strength", "Trained Only": "No" },
      related: [],
    });
    const untrained = faqs.find((faq) => faq.question === "Can Climb be used untrained?");
    assert.equal(untrained?.answer, "Yes. Climb can be used untrained.");
  });
});

describe("buildEntityKeyFacts", () => {
  it("returns only non-empty key stat fields for the category", () => {
    const facts = buildEntityKeyFacts("monsters", {
      slug: "goblin",
      name: "Goblin",
      sourceUrl: null,
      descriptionHtml: null,
      descriptionText: null,
      source: { name: "Monster Manual", abbrev: "MM", edition: "3.5", page: null },
      fields: { "Challenge Rating": "1/3", Type: "Humanoid", Size: "", "Hit Dice": null },
      related: [],
    });
    assert.deepEqual(facts, [
      { name: "Challenge Rating", value: "1/3" },
      { name: "Type", value: "Humanoid" },
    ]);
  });
});
