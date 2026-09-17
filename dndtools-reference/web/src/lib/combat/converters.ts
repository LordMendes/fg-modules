import type { NpcFgExportState } from "@/lib/npc-creator/types";
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
import type { CombatAttackLine, CombatSnapshot } from "./types";

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
};

function indexString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
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

  const snapshot: CombatSnapshot = {
    speed: state.offense.speed,
    fort: saves.fort,
    ref: saves.ref,
    will: saves.will,
    initMod: state.defense.init,
    abilities: { ...state.abilities },
    special: [
      state.immunities,
      state.resistances,
      state.vulnerabilities,
      state.spellResistance,
    ]
      .filter(Boolean)
      .join("; "),
    atkRaw: state.offense.atk,
    fullAtkRaw: state.offense.fullatk,
    acRaw: state.defense.ac,
    hd: state.defense.hd,
    sr: state.spellResistance,
  };

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

  const snapshot: CombatSnapshot = {
    speed: indexString(index, "speed") ?? undefined,
    ...fortRefWill,
    initMod,
    abilities: {
      str: parseAbilityMod(indexString(index, "str")) ?? undefined,
      dex: parseAbilityMod(indexString(index, "dex")) ?? undefined,
      con: parseAbilityMod(indexString(index, "con")) ?? undefined,
      int: parseAbilityMod(indexString(index, "int")) ?? undefined,
      wis: parseAbilityMod(indexString(index, "wis")) ?? undefined,
      cha: parseAbilityMod(indexString(index, "cha")) ?? undefined,
    },
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
  };
}
