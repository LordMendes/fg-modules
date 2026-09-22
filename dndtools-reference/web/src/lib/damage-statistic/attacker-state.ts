import { computeCombatStats, type CombatComputed } from "@/lib/pc-planner/combatStats";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { isWeaponKind } from "@/lib/pc-planner/equippedGear";
import { computeEquippedBonuses } from "@/lib/pc-planner/itemBonuses";
import type { InventoryRow, PcPlanState } from "@/lib/pc-planner/types";
import type { AttackerInput } from "./types";

function emptyCombatComputed(bab: number): CombatComputed {
  const empty = { total: 0, parts: {} };
  return {
    bab,
    melee: empty,
    ranged: empty,
    grapple: empty,
    fortitude: empty,
    reflex: empty,
    will: empty,
    ac: empty,
    flatFooted: empty,
    touch: empty,
    initiative: empty,
    speed: empty,
    spellResistance: empty,
    itemBonuses: computeEquippedBonuses([], false),
    arcaneSpellFailure: 0,
  };
}

export function extractAttackerFromPcPlan(state: PcPlanState): AttackerInput {
  const stats = computeCombatStats(state);
  return {
    bab: stats.bab,
    str: state.abilities.str,
    dex: state.abilities.dex,
    sizeMod: state.combat.sizeMod,
    powerAttack: state.combatModes?.powerAttack ?? 0,
    meleeMisc: state.combat.meleeMisc,
    rangedMisc: state.combat.rangedMisc,
    feats: state.feats ?? [],
  };
}

export function extractMainHandWeapons(inventory: InventoryRow[]): InventoryRow[] {
  return (inventory ?? []).filter(
    (row) => isWeaponKind(row.kind) && row.weaponHand === "main",
  );
}

export function inventoryRowToAnalyzedWeapon(row: InventoryRow): InventoryRow {
  return {
    ...row,
    weaponHand: "main",
    equipped: true,
    kind: row.kind ?? "weapon",
  };
}

export function buildSyntheticPcPlanState(
  attacker: AttackerInput,
  weapon: InventoryRow,
  pcSource?: PcPlanState | null,
): { state: PcPlanState; combatStats: CombatComputed } {
  const state = pcSource
    ? structuredClone(pcSource)
    : createDefaultPcPlanState("Attacker");

  state.abilities = {
    ...state.abilities,
    str: attacker.str,
    dex: attacker.dex,
  };
  state.combat = {
    ...state.combat,
    sizeMod: attacker.sizeMod,
    meleeMisc: attacker.meleeMisc,
    rangedMisc: attacker.rangedMisc,
  };
  state.feats = attacker.feats ?? [];
  state.combatModes = {
    ...(state.combatModes ?? {}),
    ...(attacker.powerAttack > 0 ? { powerAttack: attacker.powerAttack } : {}),
  };
  if (attacker.powerAttack <= 0 && state.combatModes) {
    delete state.combatModes.powerAttack;
  }

  state.inventory = [inventoryRowToAnalyzedWeapon(weapon)];

  return {
    state,
    combatStats: emptyCombatComputed(attacker.bab),
  };
}
