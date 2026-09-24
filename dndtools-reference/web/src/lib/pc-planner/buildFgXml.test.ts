import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPcFgXml } from "./buildFgXml";
import { createDefaultPcPlanState } from "./defaultState";

describe("buildPcFgXml", () => {
  it("emits structured 3.5E character nodes with combat fields", () => {
    const state = createDefaultPcPlanState("Test Hero");
    state.identity.classLevels = [
      { classSlug: "fighter-93", className: "Fighter", level: 6 },
    ];
    state.identity.firstClassSlug = "fighter-93";
    state.abilities.str = 16;
    state.abilityBase.str = 16;
    state.feats = [{ slug: "dodge", name: "Dodge" }];
    state.skills = [
      {
        name: "Climb",
        ability: "Str",
        ranks: 5,
        misc: 0,
        armorCheckPenalty: true,
      },
    ];
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
    assert.match(xml, /<root version="5.1" release="18\|CoreRPG:7">/);
    assert.match(xml, /<character>/);
    assert.match(xml, /<name type="string">Test Hero<\/name>/);
    assert.match(xml, /<strength>\s*<score type="number">16<\/score>/);
    assert.match(xml, /<classes>/);
    assert.match(xml, /<name type="string">Fighter<\/name>/);
    assert.match(xml, /<attackbonus>\s*<base type="number">6<\/base>/);
    assert.match(xml, /<featlist>/);
    assert.match(xml, /<name type="string">Dodge<\/name>/);
    assert.match(xml, /<skilllist>/);
    assert.match(xml, /<label type="string">Climb<\/label>/);
    assert.match(xml, /<ranks type="number">5<\/ranks>/);
    assert.match(xml, /<hp>\s*<total type="number">40<\/total>/);
    assert.doesNotMatch(xml, /<babgrp type="string">/);
    assert.doesNotMatch(xml, /<ac type="string">/);
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

  it("exports coins and equipped weapons", () => {
    const state = createDefaultPcPlanState("Merchant");
    state.identity.classLevels = [
      { classSlug: "fighter-93", className: "Fighter", level: 1 },
    ];
    state.identity.firstClassSlug = "fighter-93";
    state.abilities.str = 14;
    state.abilityBase.str = 14;
    state.inventory = [
      {
        name: "Longsword",
        quantity: 1,
        weight: 4,
        kind: "weapon",
        handed: "one",
        damageM: "1d8",
        damageType: "Slashing",
        critical: "19-20/x2",
        weaponHand: "main",
      },
    ];
    state.treasure[1].amount = 50;
    state.treasure.push({ id: "gems", name: "Gems", amount: 2 });

    const xml = buildPcFgXml(state);
    assert.match(xml, /<coins>/);
    assert.match(xml, /<amount type="number">50<\/amount>/);
    assert.match(xml, /<name type="string">GP<\/name>/);
    assert.match(xml, /<name type="string">Gems<\/name>/);
    assert.match(xml, /<weaponlist>/);
    assert.match(xml, /<name type="string">Longsword<\/name>/);
    assert.match(xml, /<dice type="dice">1d8<\/dice>/);
  });
});
