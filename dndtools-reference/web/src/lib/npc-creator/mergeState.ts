import { mergeSpellActionFields } from "@/lib/fg-spell-actions/mergeActions";
import { DEFAULT_MEDIA, DEFAULT_NPC_FG_STATE, DEFAULT_SPELL_ROW } from "./defaultState";
import { lookupSrdSpell } from "./srdSpellLookup";
import type { NpcFgExportState, NpcFgSpellRow } from "./types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function mergeSpellRow(row: Record<string, unknown>): NpcFgSpellRow | undefined {
  const base = DEFAULT_SPELL_ROW();
  const level = clampSpellLevel(Number(row.level));
  const prepared = num(row.prepared, base.prepared);
  const name = typeof row.name === "string" ? row.name.trim() : "";

  if (name && !row.schoolShort && !row.schoolFull && !row.description) {
    const looked = lookupSrdSpell(name, level, prepared);
    const extra = mergeSpellActionFields(row);
    return {
      ...looked,
      ...extra,
      action2: extra.action2 ?? looked.action2,
      actions: extra.actions ?? looked.actions,
    };
  }

  if (!name) return undefined;

  const actionFields = mergeSpellActionFields(row);
  return {
    level,
    name,
    prepared,
    schoolShort: String(row.schoolShort ?? base.schoolShort),
    schoolFull: String(row.schoolFull ?? base.schoolFull),
    levelStr: String(row.levelStr ?? base.levelStr),
    castingTime: String(row.castingTime ?? base.castingTime),
    components: String(row.components ?? base.components),
    range: String(row.range ?? base.range),
    area: String(row.area ?? base.area),
    duration: String(row.duration ?? base.duration),
    save: String(row.save ?? base.save),
    sr: String(row.sr ?? base.sr),
    short: String(row.short ?? base.short),
    description: String(row.description ?? base.description),
    othertags: String(row.othertags ?? base.othertags),
    srNotAllowed: Boolean(row.srNotAllowed ?? base.srNotAllowed),
    savetype: normalizeSavetype(row.savetype),
    ...actionFields,
  };
}

function mergeSpells(patch: unknown): NpcFgSpellRow[] | undefined {
  if (!Array.isArray(patch)) return undefined;
  const out: NpcFgSpellRow[] = [];
  for (const row of patch) {
    if (typeof row === "string") {
      out.push(lookupSrdSpell(row, 0, 1));
      continue;
    }
    if (!isPlainObject(row)) continue;

    if (Array.isArray(row.spells)) {
      const level = clampSpellLevel(Number(row.level));
      for (const spellName of row.spells) {
        if (typeof spellName !== "string") continue;
        out.push(lookupSrdSpell(spellName, level, 1));
      }
      continue;
    }

    const merged = mergeSpellRow(row);
    if (merged) out.push(merged);
  }
  return out.length ? out : undefined;
}

function normalizeSavetype(v: unknown): NpcFgSpellRow["savetype"] {
  const s = String(v ?? "").toLowerCase();
  if (s === "fort" || s === "reflex" || s === "will") return s;
  return "";
}

function num(v: unknown, d: number): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : d;
}

function clampSpellLevel(l: number): number {
  if (!Number.isFinite(l)) return 0;
  return Math.min(9, Math.max(0, Math.floor(l)));
}

function mergeSlotArray(patch: unknown): number[] | undefined {
  if (!Array.isArray(patch)) return undefined;
  const slots = [...DEFAULT_NPC_FG_STATE.spellcasting.slots];
  for (let i = 0; i < Math.min(10, patch.length); i++) {
    slots[i] = Math.max(0, num(patch[i], slots[i]));
  }
  return slots;
}

/** Deep-merge known sections over defaults; ignore unknown top-level keys. */
export function mergeNpcFgState(patch: unknown): NpcFgExportState {
  const base = structuredClone(DEFAULT_NPC_FG_STATE);
  if (!isPlainObject(patch)) return base;

  if (isPlainObject(patch.meta)) {
    const m = patch.meta;
    base.meta.rootVersion = String(m.rootVersion ?? base.meta.rootVersion);
    base.meta.rootDataversion = String(
      m.rootDataversion ?? base.meta.rootDataversion,
    );
    base.meta.rootRelease = String(m.rootRelease ?? base.meta.rootRelease);
  }

  if (isPlainObject(patch.identity)) {
    const id = patch.identity;
    base.identity.name = String(id.name ?? base.identity.name);
    base.identity.alignment = String(id.alignment ?? base.identity.alignment);
    base.identity.creatureTypeTag = String(
      id.creatureTypeTag ?? base.identity.creatureTypeTag,
    );
    base.identity.advancement = String(
      id.advancement ?? base.identity.advancement,
    );
    base.identity.organization = String(
      id.organization ?? base.identity.organization,
    );
    base.identity.environment = String(
      id.environment ?? base.identity.environment,
    );
    base.identity.treasure = String(id.treasure ?? base.identity.treasure);
    base.identity.cr = num(id.cr, base.identity.cr);
    base.identity.levelAdjustment = String(
      id.levelAdjustment ?? base.identity.levelAdjustment,
    );
    base.identity.locked = Boolean(id.locked ?? base.identity.locked);
  }

  if (isPlainObject(patch.defense)) {
    const d = patch.defense;
    base.defense.ac = String(d.ac ?? base.defense.ac);
    base.defense.hp = num(d.hp, base.defense.hp);
    base.defense.hd = String(d.hd ?? base.defense.hd);
    base.defense.fort = num(d.fort, base.defense.fort);
    base.defense.ref = num(d.ref, base.defense.ref);
    base.defense.will = num(d.will, base.defense.will);
    base.defense.init = num(d.init, base.defense.init);
  }

  if (isPlainObject(patch.abilities)) {
    const a = patch.abilities;
    base.abilities.str = num(a.str, base.abilities.str);
    base.abilities.dex = num(a.dex, base.abilities.dex);
    base.abilities.con = num(a.con, base.abilities.con);
    base.abilities.int = num(a.int, base.abilities.int);
    base.abilities.wis = num(a.wis, base.abilities.wis);
    base.abilities.cha = num(a.cha, base.abilities.cha);
  }

  if (isPlainObject(patch.offense)) {
    const o = patch.offense;
    base.offense.atk = String(o.atk ?? base.offense.atk);
    base.offense.fullatk = String(o.fullatk ?? base.offense.fullatk);
    base.offense.babgrp = String(o.babgrp ?? base.offense.babgrp);
    base.offense.speed = String(o.speed ?? base.offense.speed);
    base.offense.spaceReach = String(o.spaceReach ?? base.offense.spaceReach);
    base.offense.specialattacks = String(
      o.specialattacks ?? base.offense.specialattacks,
    );
  }

  if (typeof patch.senses === "string") base.senses = patch.senses;
  if (typeof patch.aura === "string") base.aura = patch.aura;
  if (typeof patch.languages === "string") base.languages = patch.languages;
  if (typeof patch.feats === "string") base.feats = patch.feats;
  if (typeof patch.skills === "string") base.skills = patch.skills;

  if (typeof patch.dr === "string") base.dr = patch.dr;
  if (typeof patch.spellResistance === "string")
    base.spellResistance = patch.spellResistance;
  if (typeof patch.immunities === "string") base.immunities = patch.immunities;
  if (typeof patch.resistances === "string")
    base.resistances = patch.resistances;
  if (typeof patch.vulnerabilities === "string")
    base.vulnerabilities = patch.vulnerabilities;
  if (typeof patch.specialqualitiesExtra === "string")
    base.specialqualitiesExtra = patch.specialqualitiesExtra;
  if (typeof patch.specialqualitiesManual === "string")
    base.specialqualitiesManual = patch.specialqualitiesManual;
  if (typeof patch.useLegacySpecialqualitiesOnly === "boolean")
    base.useLegacySpecialqualitiesOnly = patch.useLegacySpecialqualitiesOnly;
  if (typeof patch.specialattacksOverride === "string")
    base.specialattacksOverride = patch.specialattacksOverride;
  if (typeof patch.notesFormattedHtml === "string")
    base.notesFormattedHtml = patch.notesFormattedHtml;
  if (typeof patch.magicalEffectsNotes === "string")
    base.magicalEffectsNotes = patch.magicalEffectsNotes;

  if (typeof patch.spellDisplayMode === "string")
    base.spellDisplayMode = patch.spellDisplayMode;

  if (isPlainObject(patch.spellcasting)) {
    const sc = patch.spellcasting;
    base.spellcasting.enabled = Boolean(sc.enabled ?? base.spellcasting.enabled);
    base.spellcasting.mode =
      sc.mode === "spontaneous" ? "spontaneous" : "preparation";
    base.spellcasting.label = String(sc.label ?? base.spellcasting.label);
    base.spellcasting.casterLevel = num(
      sc.casterLevel,
      base.spellcasting.casterLevel,
    );
    base.spellcasting.dcAbility =
      sc.dcAbility === "intelligence" || sc.dcAbility === "charisma"
        ? sc.dcAbility
        : "wisdom";
    base.spellcasting.dcMisc = num(sc.dcMisc, base.spellcasting.dcMisc);
    const slots = mergeSlotArray(sc.slots);
    if (slots) base.spellcasting.slots = slots;
    const spells = mergeSpells(sc.spells);
    if (spells) base.spellcasting.spells = spells;
    if (typeof sc.spellsetXmlOverride === "string")
      base.spellcasting.spellsetXmlOverride = sc.spellsetXmlOverride;
  }

  if (isPlainObject(patch.media)) {
    const m = patch.media;
    const def = DEFAULT_MEDIA();
    base.media.portraitDataUrl = String(m.portraitDataUrl ?? def.portraitDataUrl);
    base.media.tokenDataUrl = String(m.tokenDataUrl ?? def.tokenDataUrl);
    base.media.picturePath = String(m.picturePath ?? def.picturePath);
    base.media.tokenPath = String(m.tokenPath ?? def.tokenPath);
    base.media.token3DPath = String(m.token3DPath ?? def.token3DPath);
  }

  return base;
}

/** Parse JSON text → state merged over defaults; throws SyntaxError. */
export function parseNpcFgJson(jsonText: string): NpcFgExportState {
  const raw = JSON.parse(jsonText) as unknown;
  return mergeNpcFgState(raw);
}
