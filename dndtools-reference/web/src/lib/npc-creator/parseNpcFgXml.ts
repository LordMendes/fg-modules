import { DEFAULT_NPC_FG_STATE, DEFAULT_SPELL_ROW } from "./defaultState";
import type {
  DcAbility,
  NpcFgExportState,
  NpcFgSpellRow,
  SpellMode,
} from "./types";

function txt(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

function num(el: Element | null | undefined, fallback = 0): number {
  const t = txt(el);
  if (!t) return fallback;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : fallback;
}

function tagChildren(parent: Element | null, tag: string): Element[] {
  if (!parent) return [];
  const ln = tag.toLowerCase();
  return [...parent.children].filter(
    (c) => (c.tagName || "").toLowerCase() === ln,
  );
}

function xmlSerialize(el: Element): string {
  return new XMLSerializer().serializeToString(el);
}

function firstSpellsetInner(spellset: Element): Element | null {
  for (const c of [...spellset.children]) {
    const name = c.localName ?? c.tagName;
    if (/^id[_-]?\d+$/i.test(name)) return c;
  }
  return spellset.firstElementChild;
}

function parseSpellsFromSpellset(spellset: Element): NpcFgSpellRow[] {
  const inner = firstSpellsetInner(spellset);
  const levelsRoot = inner?.querySelector("levels");
  if (!levelsRoot) return [];

  const rows: NpcFgSpellRow[] = [];
  const stub = DEFAULT_SPELL_ROW();

  for (const lvEl of [...levelsRoot.children]) {
    const m = lvEl.tagName.match(/^level(\d+)$/i);
    if (!m) continue;
    const spellLevel = Number.parseInt(m[1], 10);
    const spellsWrap = lvEl.getElementsByTagName("spells")[0];
    if (!spellsWrap) continue;

    for (const spellEl of [...spellsWrap.children]) {
      const local = spellEl.localName ?? spellEl.tagName;
      if (!/^id[_-]?\d+$/i.test(local)) continue;

      const actionSchool = spellEl.querySelector("actions school");
      const savetypeEl = spellEl.querySelector("actions savetype");
      const srna = spellEl.querySelector("actions srnotallowed");

      let schoolFull = stub.schoolFull;
      for (const ch of [...spellEl.children]) {
        if ((ch.tagName || "").toLowerCase() === "school") {
          schoolFull = txt(ch);
          break;
        }
      }

      rows.push({
        level: spellLevel,
        name: txt(spellEl.querySelector("name")) || stub.name,
        prepared: num(spellEl.querySelector("prepared"), stub.prepared),
        schoolShort: txt(actionSchool) || stub.schoolShort,
        schoolFull,
        levelStr: txt(spellEl.querySelector("level")) || stub.levelStr,
        castingTime:
          txt(spellEl.querySelector("castingtime")) || stub.castingTime,
        components:
          txt(spellEl.querySelector("components")) || stub.components,
        range: txt(spellEl.querySelector("range")) || stub.range,
        area: txt(spellEl.querySelector("effect")) || stub.area,
        duration: txt(spellEl.querySelector("duration")) || stub.duration,
        save: txt(spellEl.querySelector("save")) || stub.save,
        sr: txt(spellEl.querySelector("sr")) || stub.sr,
        short: txt(spellEl.querySelector("shortdescription")) || stub.short,
        description:
          txt(spellEl.querySelector("description")) || stub.description,
        othertags:
          txt(spellEl.querySelector("actions othertags")) ||
          txt(spellEl.querySelector("othertags")) ||
          stub.othertags,
        srNotAllowed: num(srna, 0) >= 1,
        savetype: normalizeSavetype(txt(savetypeEl)),
      });
    }
  }

  return rows;
}

function normalizeSavetype(s: string): NpcFgSpellRow["savetype"] {
  const x = s.toLowerCase();
  if (x === "fort" || x === "reflex" || x === "will") return x;
  return "";
}

function parseDcAbility(s: string): DcAbility {
  const x = s.toLowerCase();
  if (x === "intelligence") return "intelligence";
  if (x === "charisma") return "charisma";
  return "wisdom";
}

function parseSpellcastingAux(spellset: Element, base: NpcFgExportState): void {
  const inner = firstSpellsetInner(spellset);
  if (!inner) return;

  base.spellcasting.label =
    txt(inner.querySelector("label")) || base.spellcasting.label;
  base.spellcasting.casterLevel = num(
    inner.querySelector("cl"),
    base.spellcasting.casterLevel,
  );

  const dcRoot = inner.querySelector("dc");
  if (dcRoot) {
    base.spellcasting.dcAbility = parseDcAbility(
      txt(dcRoot.querySelector("ability")),
    );
    base.spellcasting.dcMisc = num(
      dcRoot.querySelector("misc"),
      base.spellcasting.dcMisc,
    );
  }

  const slots = [...base.spellcasting.slots];
  for (let i = 0; i < 10; i++) {
    const el = inner.querySelector(`availablelevel${i}`);
    if (el) slots[i] = num(el, slots[i]);
  }
  base.spellcasting.slots = slots;

  if (txt(inner.querySelector("castertype")).toLowerCase() === "spontaneous") {
    base.spellcasting.mode = "spontaneous";
  }

  const parsedSpells = parseSpellsFromSpellset(spellset);
  if (parsedSpells.length) base.spellcasting.spells = parsedSpells;
}

/**
 * Convert FG export XML (`root` → `npc`) into form state.
 * Requires DOMParser (browser / jsdom).
 */
export function parseNpcFgXml(xmlString: string): NpcFgExportState {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid or malformed XML.");

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "root") {
    throw new Error("Expected root element: <root>.");
  }

  const npc = doc.getElementsByTagName("npc")[0];
  if (!npc) throw new Error("<npc> element not found.");

  const state = structuredClone(DEFAULT_NPC_FG_STATE);

  state.meta.rootVersion =
    root.getAttribute("version")?.trim() || state.meta.rootVersion;
  state.meta.rootDataversion = root.getAttribute("dataversion")?.trim() || "";
  state.meta.rootRelease =
    root.getAttribute("release")?.trim() || state.meta.rootRelease;

  state.defense.ac = txt(tagChildren(npc, "ac")[0]) || state.defense.ac;
  state.identity.advancement =
    txt(tagChildren(npc, "advancement")[0]) || state.identity.advancement;
  state.identity.alignment =
    txt(tagChildren(npc, "alignment")[0]) || state.identity.alignment;
  state.offense.atk = txt(tagChildren(npc, "atk")[0]) || state.offense.atk;
  state.offense.babgrp =
    txt(tagChildren(npc, "babgrp")[0]) || state.offense.babgrp;
  state.abilities.cha = num(
    tagChildren(npc, "charisma")[0],
    state.abilities.cha,
  );
  state.abilities.con = num(
    tagChildren(npc, "constitution")[0],
    state.abilities.con,
  );
  state.identity.cr = num(tagChildren(npc, "cr")[0], state.identity.cr);
  state.abilities.dex = num(
    tagChildren(npc, "dexterity")[0],
    state.abilities.dex,
  );
  state.identity.environment =
    txt(tagChildren(npc, "environment")[0]) || state.identity.environment;
  state.feats = txt(tagChildren(npc, "feats")[0]) || state.feats;
  state.defense.fort = num(
    tagChildren(npc, "fortitudesave")[0],
    state.defense.fort,
  );
  state.offense.fullatk =
    txt(tagChildren(npc, "fullatk")[0]) || state.offense.fullatk;
  state.defense.hd = txt(tagChildren(npc, "hd")[0]) || state.defense.hd;
  state.defense.hp = num(tagChildren(npc, "hp")[0], state.defense.hp);
  state.defense.init = num(tagChildren(npc, "init")[0], state.defense.init);
  state.abilities.int = num(
    tagChildren(npc, "intelligence")[0],
    state.abilities.int,
  );
  state.identity.levelAdjustment =
    txt(tagChildren(npc, "leveladjustment")[0]) ||
    state.identity.levelAdjustment;
  state.identity.locked = num(tagChildren(npc, "locked")[0], 0) >= 1;
  state.identity.name =
    txt(tagChildren(npc, "name")[0]) || state.identity.name;
  state.identity.organization =
    txt(tagChildren(npc, "organization")[0]) || state.identity.organization;
  state.defense.ref = num(
    tagChildren(npc, "reflexsave")[0],
    state.defense.ref,
  );
  state.skills = txt(tagChildren(npc, "skills")[0]) || state.skills;
  state.offense.spaceReach =
    txt(tagChildren(npc, "spacereach")[0]) || state.offense.spaceReach;
  const specAtkRaw = txt(tagChildren(npc, "specialattacks")[0]);
  state.offense.specialattacks = specAtkRaw || state.offense.specialattacks;
  state.specialattacksOverride = specAtkRaw;

  const sqRaw = txt(tagChildren(npc, "specialqualities")[0]);
  if (sqRaw) {
    state.useLegacySpecialqualitiesOnly = true;
    state.specialqualitiesManual = sqRaw;
    state.dr = "";
    state.spellResistance = "";
    state.immunities = "";
    state.resistances = "";
    state.vulnerabilities = "";
    state.specialqualitiesExtra = "";
  }

  state.offense.speed =
    txt(tagChildren(npc, "speed")[0]) || state.offense.speed;
  state.spellDisplayMode =
    txt(tagChildren(npc, "spelldisplaymode")[0]) || state.spellDisplayMode;
  state.abilities.str = num(
    tagChildren(npc, "strength")[0],
    state.abilities.str,
  );
  state.abilities.wis = num(tagChildren(npc, "wisdom")[0], state.abilities.wis);

  const textBlock =
    npc.querySelector('text[type="formattedtext"]') ||
    [...npc.children].find((c) => (c.tagName || "").toLowerCase() === "text");
  if (textBlock) {
    state.notesFormattedHtml =
      (textBlock as Element).innerHTML?.trim() || state.notesFormattedHtml;
  }

  state.identity.treasure =
    txt(tagChildren(npc, "treasure")[0]) || state.identity.treasure;
  state.identity.creatureTypeTag =
    txt(tagChildren(npc, "type")[0]) || state.identity.creatureTypeTag;
  state.defense.will = num(tagChildren(npc, "willsave")[0], state.defense.will);

  state.aura = txt(tagChildren(npc, "aura")[0]) || "";
  state.senses = txt(tagChildren(npc, "senses")[0]) || "";
  state.languages = txt(tagChildren(npc, "languages")[0]) || "";

  state.media.picturePath = txt(tagChildren(npc, "picture")[0]) || "";
  state.media.tokenPath = txt(tagChildren(npc, "token")[0]) || "";
  state.media.token3DPath = txt(tagChildren(npc, "token3Dflat")[0]) || "";

  const spellModeEl = [...npc.children].find(
    (c) => (c.tagName || "").toLowerCase() === "spellmode",
  );
  const spellSetEl = [...npc.children].find(
    (c) => (c.tagName || "").toLowerCase() === "spellset",
  );

  if (spellModeEl || spellSetEl) {
    state.spellcasting.enabled = true;
    const chunks: string[] = [];
    if (spellModeEl) {
      chunks.push("\t\t" + xmlSerialize(spellModeEl));
      const modeTxt = txt(spellModeEl).toLowerCase();
      state.spellcasting.mode = (
        modeTxt === "spontaneous" ? "spontaneous" : "preparation"
      ) as SpellMode;
    }
    if (spellSetEl) {
      chunks.push("\t\t" + xmlSerialize(spellSetEl));
      parseSpellcastingAux(spellSetEl, state);
    }
    state.spellcasting.spellsetXmlOverride = chunks.join("\n");
  }

  return state;
}
