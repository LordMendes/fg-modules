import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEntityLead } from "./entity-lead";
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
