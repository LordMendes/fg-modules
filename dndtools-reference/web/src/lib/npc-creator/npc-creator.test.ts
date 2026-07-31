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
