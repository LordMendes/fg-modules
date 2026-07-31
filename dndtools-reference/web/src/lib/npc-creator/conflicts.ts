import { DEFAULT_NPC_FG_STATE } from "./defaultState";
import type { NpcFgExportState } from "./types";

export type ConflictChoice = "keep" | "take";

export interface FieldConflict {
  path: string;
  label: string;
  current: string | number | boolean;
  incoming: string | number | boolean;
}

type Leaf = string | number | boolean;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isEmptyish(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" || t === "-" || t === "—" || t === " - ";
  }
  return false;
}

function leafEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  return String(a ?? "") === String(b ?? "");
}

const PATH_LABELS: Record<string, string> = {
  "identity.name": "Name",
  "identity.alignment": "Alignment",
  "identity.creatureTypeTag": "Type / size",
  "identity.cr": "CR",
  "identity.levelAdjustment": "Level adjustment",
  "identity.advancement": "Advancement",
  "identity.organization": "Organization",
  "identity.environment": "Environment",
  "identity.treasure": "Treasure",
  "defense.ac": "AC",
  "defense.hp": "HP",
  "defense.hd": "HD",
  "defense.fort": "Fort",
  "defense.ref": "Ref",
  "defense.will": "Will",
  "defense.init": "Init",
  "abilities.str": "Str",
  "abilities.dex": "Dex",
  "abilities.con": "Con",
  "abilities.int": "Int",
  "abilities.wis": "Wis",
  "abilities.cha": "Cha",
  "offense.atk": "Attack",
  "offense.fullatk": "Full attack",
  "offense.babgrp": "BAB",
  "offense.speed": "Speed",
  "offense.spaceReach": "Space/Reach",
  "offense.specialattacks": "Special attacks",
  senses: "Senses",
  aura: "Aura",
  languages: "Languages",
  feats: "Feats",
  skills: "Skills",
  dr: "DR",
  spellResistance: "SR",
  immunities: "Immunities",
  resistances: "Resistances",
  vulnerabilities: "Vulnerabilities",
  specialqualitiesExtra: "Special qualities",
  notesFormattedHtml: "Notes",
  "spellcasting.enabled": "Spellcasting enabled",
  "spellcasting.mode": "Spell mode",
  "spellcasting.label": "Caster label",
  "spellcasting.casterLevel": "Caster level",
  "spellcasting.dcAbility": "DC ability",
};

/** Flatten a patch into leaf path → value (skips arrays / media data URLs). */
export function flattenPatchLeaves(
  patch: unknown,
  prefix = "",
): Record<string, Leaf> {
  if (!isPlainObject(patch)) return {};
  const out: Record<string, Leaf> = {};
  for (const [key, value] of Object.entries(patch)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (path.startsWith("media.portraitDataUrl") || path.startsWith("media.tokenDataUrl")) {
      continue;
    }
    if (path === "spellcasting.spells" || path === "spellcasting.slots") {
      // Handle as opaque JSON strings for conflict UI
      if (value !== undefined) {
        out[path] = JSON.stringify(value) as unknown as Leaf;
      }
      continue;
    }
    if (path === "spellcasting.spellsetXmlOverride" && typeof value === "string") {
      out[path] = value;
      continue;
    }
    if (isPlainObject(value)) {
      Object.assign(out, flattenPatchLeaves(value, path));
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[path] = value;
    }
  }
  return out;
}

function getAtPath(state: NpcFgExportState, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = state;
  for (const p of parts) {
    if (!isPlainObject(cur) && !Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setAtPath(state: NpcFgExportState, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = state as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const next = cur[p];
    if (!isPlainObject(next)) {
      cur[p] = {};
    }
    cur = cur[p] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (path === "spellcasting.spells" || path === "spellcasting.slots") {
    try {
      cur[last] = typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      cur[last] = value;
    }
    return;
  }
  cur[last] = value;
}

/**
 * Find fields where the incoming patch would overwrite a non-empty current value
 * that differs from the incoming value.
 */
export function detectPatchConflicts(
  state: NpcFgExportState,
  patch: unknown,
): FieldConflict[] {
  const leaves = flattenPatchLeaves(patch);
  const conflicts: FieldConflict[] = [];
  for (const [path, incoming] of Object.entries(leaves)) {
    let current = getAtPath(state, path);
    if (path === "spellcasting.spells" || path === "spellcasting.slots") {
      current = JSON.stringify(current ?? null);
    }
    if (leafEqual(current, incoming)) continue;
    if (isEmptyish(current)) continue;
    // Also skip if current equals the blank default for that path
    const def = getAtPath(DEFAULT_NPC_FG_STATE, path);
    const defCmp =
      path === "spellcasting.spells" || path === "spellcasting.slots"
        ? JSON.stringify(def ?? null)
        : def;
    if (leafEqual(current, defCmp) && !isEmptyish(incoming)) {
      // current is still default — auto-take, not a conflict
      continue;
    }
    conflicts.push({
      path,
      label: PATH_LABELS[path] ?? path,
      current: current as Leaf,
      incoming,
    });
  }
  return conflicts;
}

/** Apply patch leaves onto state, using choices for conflict paths (default: take). */
export function applyPatchWithChoices(
  state: NpcFgExportState,
  patch: unknown,
  choices: Record<string, ConflictChoice> = {},
): NpcFgExportState {
  const next = structuredClone(state);
  const leaves = flattenPatchLeaves(patch);
  const conflicts = new Set(detectPatchConflicts(state, patch).map((c) => c.path));

  for (const [path, incoming] of Object.entries(leaves)) {
    if (conflicts.has(path)) {
      const choice = choices[path] ?? "take";
      if (choice === "keep") continue;
    }
    setAtPath(next, path, incoming);
  }
  return next;
}

/** Paths that would be auto-applied (no conflict). */
export function autoApplyablePaths(state: NpcFgExportState, patch: unknown): string[] {
  const leaves = flattenPatchLeaves(patch);
  const conflictPaths = new Set(detectPatchConflicts(state, patch).map((c) => c.path));
  return Object.keys(leaves).filter((p) => !conflictPaths.has(p));
}
