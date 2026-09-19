import type { NpcFgExportState } from "@/lib/npc-creator/types";
import { abilityModifier } from "@/lib/pc-planner/combatStats";
import { parseDefensesFromParts } from "./converters/parseDefenses";
import { parseAcString } from "./parseAc";
import { parseAttackLines } from "./parseAttacks";
import { parseHpFromText } from "./parseHp";
import {
  parseAbilityMod,
  parseFortRefWill,
  parseInitiative,
} from "./parseSaves";
import {
  parseSpaceReachString,
  sizeCategoryToSquares,
} from "./parseSpaceReach";
import type {
  CombatAttackLine,
  CombatSnapshot,
  CombatantView,
  Defenses,
} from "./types";

export type CombatStatBlock = {
  name: string;
  hpMax: number;
  ac: number;
  acTouch: number | null;
  acFlat: number | null;
  initMod: number;
  spaceSquares: number;
  reachFeet: number;
  attacks: CombatAttackLine[];
  snapshot: CombatSnapshot;
  defenses: Defenses;
  stats: CombatantView["stats"];
};

function indexString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseCasterLevel(raw: string | null | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const match =
    raw.match(/\bCL\s+(\d+)/i) ??
    raw.match(/\bcaster level\s+(\d+)/i) ??
    raw.match(/(\d+)/);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function abilityStatsFromMods(
  abilities: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>,
  casterLevel?: number,
): CombatantView["stats"] {
  const stats: CombatantView["stats"] = {};
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as const) {
    const mod = abilities[key];
    if (mod != null) stats[key] = mod;
  }
  if (casterLevel != null) stats.cl = casterLevel;
  return stats;
}

function abilityStatsFromScores(
  abilities: Partial<Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>>,
  casterLevel?: number,
): CombatantView["stats"] {
  const stats: CombatantView["stats"] = {};
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as const) {
    const score = abilities[key];
    if (score != null) stats[key] = abilityModifier(score);
  }
  if (casterLevel != null) stats.cl = casterLevel;
  return stats;
}

function monsterDefenseText(index: Record<string, unknown>): string {
  const parts: string[] = [];
  const sr = indexString(index, "spell_resistance");
  if (sr) parts.push(sr.startsWith("SR") ? sr : `SR ${sr}`);

  const specialAbilities = index.specialAbilities;
  if (Array.isArray(specialAbilities)) {
    for (const entry of specialAbilities) {
      if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
        parts.push((entry as { name: string }).name);
      }
    }
  }

  for (const key of ["combatHtml", "flavorHtml", "stat_line"] as const) {
    const value = indexString(index, key);
    if (value) parts.push(value);
  }

  return parts.join("; ");
}

export function npcCreatorToCombatStats(state: NpcFgExportState): CombatStatBlock {
  const parsedAc = parseAcString(state.defense.ac);
  const { spaceSquares, reachFeet } = parseSpaceReachString(
    state.offense.spaceReach,
  );
  const saves = {
    fort: state.defense.fort,
    ref: state.defense.ref,
    will: state.defense.will,
  };

  const attacks = parseAttackLines(
    state.offense.atk,
    state.offense.fullatk,
  );

  const defenses = parseDefensesFromParts(
    state.dr ? `DR ${state.dr}` : null,
    state.resistances,
    state.immunities,
    state.vulnerabilities,
    state.spellResistance,
    state.specialqualitiesExtra,
  );

  const snapshot: CombatSnapshot = {
    speed: state.offense.speed,
    fort: saves.fort,
    ref: saves.ref,
    will: saves.will,
    initMod: state.defense.init,
    abilities: { ...state.abilities },
    special: [
      state.dr ? `DR ${state.dr}` : null,
      state.immunities,
      state.resistances,
      state.vulnerabilities,
      state.spellResistance,
      state.specialqualitiesExtra,
    ]
      .filter(Boolean)
      .join("; "),
    atkRaw: state.offense.atk,
    fullAtkRaw: state.offense.fullatk,
    acRaw: state.defense.ac,
    hd: state.defense.hd,
    sr: state.spellResistance,
  };

  const casterLevel = state.spellcasting.enabled
    ? state.spellcasting.casterLevel
    : undefined;

  return {
    name: state.identity.name.trim() || "NPC",
    hpMax: Math.max(1, state.defense.hp),
    ac: parsedAc.ac,
    acTouch: parsedAc.touch,
    acFlat: parsedAc.flat,
    initMod: state.defense.init,
    spaceSquares,
    reachFeet,
    attacks,
    snapshot,
    defenses,
    stats: abilityStatsFromScores(state.abilities, casterLevel),
  };
}

export function monsterToCombatStats(record: {
  name: string;
  size: string | null;
  hitDice: string | null;
  indexData: unknown;
}): CombatStatBlock {
  const index = (record.indexData ?? {}) as Record<string, unknown>;
  const acRaw =
    indexString(index, "armor_class") ?? indexString(index, "ac");
  const parsedAc = parseAcString(acRaw);
  const hpRaw =
    indexString(index, "hit_points") ??
    indexString(index, "hp") ??
    record.hitDice;
  const hpMax = parseHpFromText(hpRaw) ?? Math.max(1, Math.round((record.hitDice ? parseHpFromText(record.hitDice) : null) ?? 10));

  const spaceSquares = sizeCategoryToSquares(record.size);
  const reachFeet = spaceSquares * 5;

  const atk = indexString(index, "attack");
  const fullAtk = indexString(index, "full_attack");
  const attacks = parseAttackLines(atk, fullAtk);

  const fortRefWill = parseFortRefWill(
    indexString(index, "fort_ref_will"),
    indexString(index, "fortitude"),
    indexString(index, "reflex"),
    indexString(index, "will"),
  );

  const initMod = parseInitiative(indexString(index, "initiative"));

  const abilityMods = {
    str: parseAbilityMod(indexString(index, "str")) ?? undefined,
    dex: parseAbilityMod(indexString(index, "dex")) ?? undefined,
    con: parseAbilityMod(indexString(index, "con")) ?? undefined,
    int: parseAbilityMod(indexString(index, "int")) ?? undefined,
    wis: parseAbilityMod(indexString(index, "wis")) ?? undefined,
    cha: parseAbilityMod(indexString(index, "cha")) ?? undefined,
  };

  const casterLevel = parseCasterLevel(indexString(index, "caster_level"));
  const defenseText = monsterDefenseText(index);

  const snapshot: CombatSnapshot = {
    speed: indexString(index, "speed") ?? undefined,
    ...fortRefWill,
    initMod,
    abilities: abilityMods,
    special: defenseText || undefined,
    atkRaw: atk ?? undefined,
    fullAtkRaw: fullAtk ?? undefined,
    acRaw: acRaw ?? undefined,
    hd: record.hitDice ?? undefined,
    sr: indexString(index, "spell_resistance") ?? undefined,
  };

  return {
    name: record.name,
    hpMax,
    ac: parsedAc.ac,
    acTouch: parsedAc.touch,
    acFlat: parsedAc.flat,
    initMod,
    spaceSquares,
    reachFeet,
    attacks,
    snapshot,
    defenses: parseDefensesFromParts(defenseText),
    stats: abilityStatsFromMods(abilityMods, casterLevel),
  };
}
