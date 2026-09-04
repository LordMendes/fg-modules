import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyMonsterTemplate } from "./applyMonsterTemplate";
import { buildNpcFgXml, buildMergedSpecialQualities } from "./buildXml";
import {
  applyPatchWithChoices,
  detectPatchConflicts,
} from "./conflicts";
import { DEFAULT_NPC_FG_STATE } from "./defaultState";
import {
  coverScale,
  DEFAULT_IMAGE_TRANSFORM,
  imageDrawRect,
} from "./imageTransform";
import { mergeNpcFgState, parseNpcFgJson } from "./mergeState";
import { getMonsterTemplateById } from "./presets/monster-templates";
import { lookupSrdSpell } from "./srdSpellLookup";
import { toSlug } from "./toSlug";

describe("mergeNpcFgState", () => {
  it("expands level groups into named SRD rows", () => {
    const state = mergeNpcFgState({
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Cleric",
        casterLevel: 5,
        dcAbility: "wisdom",
        slots: [3, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        spells: [
          { level: 0, spells: ["detect magic", "guidance"] },
          { level: 1, spells: ["bless", "command"] },
        ],
      },
    });
    assert.equal(state.spellcasting.spells.length, 4);
    assert.equal(
      state.spellcasting.spells.find((s) => s.name === "Bless")?.level,
      1,
    );
  });

  it("merges media paths", () => {
    const state = mergeNpcFgState({
      media: {
        picturePath: "images/guard.webp@Tokens",
        tokenPath: "tokens/guard.webp@Tokens",
      },
    });
    assert.equal(state.media.picturePath, "images/guard.webp@Tokens");
    assert.equal(state.media.tokenPath, "tokens/guard.webp@Tokens");
  });

  it("resolves Spell Compendium spells from the expanded library", () => {
    const state = mergeNpcFgState({
      spellcasting: {
        enabled: true,
        spells: [{ level: 3, spells: ["acid breath"] }],
      },
    });
    const spell = state.spellcasting.spells[0];
    assert.equal(spell.name, "Acid Breath");
    assert.equal(spell.schoolShort, "conjuration");
    assert.match(spell.description, /acid damage per caster level/i);
    assert.ok(!/magical auras/i.test(spell.description));
  });

  it("embeds mod-sourced damage actions in exported spellset XML", () => {
    const state = mergeNpcFgState({
      spellcasting: {
        enabled: true,
        mode: "preparation",
        label: "Wizard",
        casterLevel: 7,
        dcAbility: "intelligence",
        slots: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        spells: [{ level: 4, spells: ["orb of acid"] }],
      },
    });
    const xml = buildNpcFgXml(state);
    assert.match(xml, /<type type="string">damage<\/type>/);
    assert.match(xml, /<type type="string">acid<\/type>/);
    assert.match(xml, /<atktype type="string">rtouch<\/atktype>/);
    assert.match(xml, /<savetype type="string">fort<\/savetype>/);
  });
});

describe("lookupSrdSpell", () => {
  it("returns a blank stub for unknown spell names", () => {
    const spell = lookupSrdSpell("totally unknown spell", 4, 2);
    assert.equal(spell.name, "Totally Unknown Spell");
    assert.equal(spell.level, 4);
    assert.equal(spell.prepared, 2);
    assert.equal(spell.description, "");
    assert.equal(spell.range, "");
    assert.equal(spell.schoolShort, "");
  });

  it("resolves Complete Arcane Orb of Acid with mod-sourced automation", () => {
    const spell = lookupSrdSpell("orb of acid", 4, 1);
    assert.equal(spell.name, "Orb of Acid");
    assert.equal(spell.savetype, "fort");
    assert.equal(spell.atktype, "rtouch");
    assert.ok(spell.actions?.some((a) => a.type === "damage"));
    assert.equal(spell.action2?.type, "damage");
    if (spell.action2?.type === "damage") {
      assert.equal(spell.action2.dmgType, "acid");
      assert.equal(spell.action2.dicestat, "cl");
    }
  });

  it("resolves BoVD Cloud of the Achaierai with damage follow-up", () => {
    const spell = lookupSrdSpell("cloud of the achaierai", 6, 1);
    assert.equal(spell.name, "Cloud of the Achaierai");
    assert.equal(spell.savetype, "fort");
    assert.equal(spell.action2?.type, "damage");
    if (spell.action2?.type === "damage") {
      assert.equal(spell.action2.dice, "2d6");
    }
  });

  it("resolves PH Enervation with scrape metadata but no automation", () => {
    const spell = lookupSrdSpell("enervation", 4, 1);
    assert.equal(spell.name, "Enervation");
    assert.match(spell.description, /negative levels/i);
    assert.equal(spell.schoolShort, "necromancy");
    assert.equal(spell.action2, undefined);
  });
});

describe("buildNpcFgXml", () => {
  it("emits name and media paths", () => {
    const state = mergeNpcFgState({
      identity: { name: "Captain Example" },
      media: {
        picturePath: "images/c.webp@Mod",
        tokenPath: "tokens/c.webp@Mod",
      },
    });
    const xml = buildNpcFgXml(state);
    assert.match(xml, /<name type="string">Captain Example<\/name>/);
    assert.match(
      xml,
      /<picture type="token">images\/c\.webp@Mod<\/picture>/,
    );
    assert.match(xml, /<token type="token">tokens\/c\.webp@Mod<\/token>/);
  });

  it("merges DR into specialqualities", () => {
    const state = mergeNpcFgState({ dr: "5/magic", immunities: "cold" });
    assert.equal(
      buildMergedSpecialQualities(state),
      "DR 5/magic; Immune cold",
    );
  });
});

describe("applyMonsterTemplate", () => {
  it("applies half-dragon ability and CR mods", () => {
    const delta = getMonsterTemplateById("half-dragon");
    assert.ok(delta);
    const base = structuredClone(DEFAULT_NPC_FG_STATE);
    base.abilities.str = 10;
    base.identity.cr = 3;
    const next = applyMonsterTemplate(base, delta!);
    assert.equal(next.abilities.str, 18);
    assert.equal(next.identity.cr, 5);
    assert.match(next.specialqualitiesExtra, /Darkvision/);
    assert.match(next.notesFormattedHtml, /Half-Dragon/);
  });
});

describe("toSlug", () => {
  it("slugifies names", () => {
    assert.equal(toSlug("Captain Example"), "captainexample");
    assert.equal(toSlug(""), "record");
  });
});

describe("parseNpcFgJson", () => {
  it("builds downloadable XML from JSON fragment", () => {
    const xml = buildNpcFgXml(
      parseNpcFgJson(
        JSON.stringify({ identity: { name: "Test Guard", cr: 2 } }),
      ),
    );
    assert.match(xml, /<cr type="number">2<\/cr>/);
    assert.match(xml, /Test Guard/);
  });
});

describe("detectPatchConflicts / applyPatchWithChoices", () => {
  it("flags overlapping non-default fields", () => {
    const state = structuredClone(DEFAULT_NPC_FG_STATE);
    state.identity.name = "Guard";
    state.abilities.str = 13;
    const conflicts = detectPatchConflicts(state, {
      identity: { name: "Fighter" },
      abilities: { str: 16 },
    });
    assert.equal(conflicts.length, 2);
    assert.ok(conflicts.some((c) => c.path === "identity.name"));
    assert.ok(conflicts.some((c) => c.path === "abilities.str"));
  });

  it("respects keep vs take choices", () => {
    const state = structuredClone(DEFAULT_NPC_FG_STATE);
    state.identity.name = "Guard";
    state.abilities.str = 13;
    const patch = {
      identity: { name: "Fighter" },
      abilities: { str: 16, dex: 14 },
    };
    const kept = applyPatchWithChoices(state, patch, {
      "identity.name": "keep",
      "abilities.str": "take",
    });
    assert.equal(kept.identity.name, "Guard");
    assert.equal(kept.abilities.str, 16);
    assert.equal(kept.abilities.dex, 14);
  });
});

describe("imageDrawRect", () => {
  it("covers a square viewport with a landscape image", () => {
    const scale = coverScale(200, 100, 100, 100);
    assert.equal(scale, 1);
    const rect = imageDrawRect(200, 100, 100, 100, DEFAULT_IMAGE_TRANSFORM);
    assert.equal(rect.w, 200);
    assert.equal(rect.h, 100);
    assert.equal(rect.x, -50);
    assert.equal(rect.y, 0);
  });

  it("zooms from center", () => {
    const rect = imageDrawRect(100, 100, 100, 100, {
      zoom: 2,
      panX: 0,
      panY: 0,
    });
    assert.equal(rect.w, 200);
    assert.equal(rect.h, 200);
    assert.equal(rect.x, -50);
    assert.equal(rect.y, -50);
  });
});
