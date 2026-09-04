import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPcFgXml } from "./buildFgXml";
import { createDefaultPcPlanState } from "./defaultState";

describe("buildPcFgXml", () => {
  it("emits a CoreRPG character root with combat and ability fields", () => {
    const state = createDefaultPcPlanState("Test Hero");
    state.identity.classLevels = [
      { classSlug: "fighter-93", className: "Fighter", level: 6 },
    ];
    state.identity.firstClassSlug = "fighter-93";
    state.abilities.str = 16;
    state.abilityBase.str = 16;
    state.feats = [{ slug: "dodge", name: "Dodge" }];
    state.hitPoints = {
      rolls: [
        { classSlug: "fighter-93", classLevel: 1, rolled: 10 },
        { classSlug: "fighter-93", classLevel: 2, rolled: 6 },
        { classSlug: "fighter-93", classLevel: 3, rolled: 6 },
        { classSlug: "fighter-93", classLevel: 4, rolled: 6 },
        { classSlug: "fighter-93", classLevel: 5, rolled: 6 },
        { classSlug: "fighter-93", classLevel: 6, rolled: 6 },
      ],
    };

    const xml = buildPcFgXml(state, { classHitDice: { "fighter-93": "d10" } });
    assert.match(xml, /<root version="5.1" release="9\|CoreRPG:7">/);
    assert.match(xml, /<character>/);
    assert.match(xml, /<name type="string">Test Hero<\/name>/);
    assert.match(xml, /<babgrp type="string">\+6\/\+1/);
    assert.match(xml, /<feats type="string">Dodge<\/feats>/);
    assert.match(xml, /<hd type="string">6d10<\/hd>/);
    assert.doesNotMatch(xml, /<npc>/);
  });

  it("includes spellset for casters", () => {
    const state = createDefaultPcPlanState("Wizard");
    state.spellClasses[0].spells = [
      { slug: "magic-missile", name: "Magic Missile", level: 1, prepared: 1 },
    ];
    const xml = buildPcFgXml(state);
    assert.match(xml, /<spellset>/);
    assert.match(xml, /Magic Missile/);
    assert.match(xml, /<availablelevel1 type="number">/);
  });
});
