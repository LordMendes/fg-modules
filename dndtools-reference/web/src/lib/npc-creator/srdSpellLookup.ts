import spellLibrary from "./data/srd-spell-library.json";
import type { SpellFollowUpAction } from "@/lib/fg-spell-actions/types";
import type { NpcFgSpellRow } from "./types";

type SpellTemplate = Omit<NpcFgSpellRow, "level" | "prepared">;

const LIBRARY = spellLibrary as Record<string, SpellTemplate>;

export function tryLookupSrdSpell(name: string): SpellTemplate | null {
  return LIBRARY[normalizeSpellKey(name)] ?? null;
}

export function normalizeSpellKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['']/g, "'");
}

function titleCaseSpellName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace(/ Against /g, " against ")
    .replace(/ From /g, " from ")
    .replace(/ Of /g, " of ")
    .replace(/ With /g, " with ");
}

function blankSpellRow(
  name: string,
  slotLevel: number,
  prepared: number,
): NpcFgSpellRow {
  return {
    level: slotLevel,
    prepared,
    name: titleCaseSpellName(name),
    schoolShort: "",
    schoolFull: "",
    levelStr: "",
    castingTime: "",
    components: "",
    range: "",
    area: "",
    duration: "",
    save: "",
    sr: "",
    short: "",
    description: "",
    othertags: "",
    srNotAllowed: false,
    savetype: "",
  };
}

/** Resolve SRD spell metadata by name; slot level and prepared count are applied by caller. */
export function lookupSrdSpell(
  name: string,
  slotLevel: number,
  prepared = 1,
): NpcFgSpellRow {
  const key = normalizeSpellKey(name);
  const hit = LIBRARY[key];

  if (hit) {
    const row: NpcFgSpellRow = {
      level: slotLevel,
      prepared,
      name: hit.name,
      schoolShort: hit.schoolShort,
      schoolFull: hit.schoolFull,
      levelStr: hit.levelStr,
      castingTime: hit.castingTime,
      components: hit.components,
      range: hit.range,
      area: hit.area,
      duration: hit.duration,
      save: hit.save,
      sr: hit.sr,
      short: hit.short,
      description: hit.description,
      othertags: hit.othertags,
      srNotAllowed: hit.srNotAllowed,
      savetype: hit.savetype,
    };
    if (hit.atktype) row.atktype = hit.atktype;
    if (hit.onmissdamage) row.onmissdamage = hit.onmissdamage;
    if (hit.action2) row.action2 = hit.action2 as SpellFollowUpAction;
    if (hit.actions) row.actions = hit.actions as SpellFollowUpAction[];
    return row;
  }

  return blankSpellRow(name, slotLevel, prepared);
}
