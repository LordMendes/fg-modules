import { parseEquipmentStats } from "@/lib/equipment-display";
import type { InventoryRow } from "./types";

export type EquippedGear = {
  armor: number | null;
  shield: number | null;
  maxDex: number | null;
  acp: number;
  /** Delta applied to speedArmor (e.g. −10 when 30 → 20). */
  speedArmorDelta: number | null;
  armorName: string | null;
  shieldName: string | null;
};

function parseSignedNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const match = String(raw)
    .trim()
    .replace(/[−–—]/g, "-")
    .match(/([+-]?\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

export function parseWeightPounds(raw: string | null | undefined): number {
  if (raw == null) return 0;
  const match = String(raw).replace(/[−–—]/g, "-").match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : 0;
}

export function isArmorKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "armor";
}

export function isShieldKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "shield";
}

export function isWeaponKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "weapon";
}

function readIndexString(
  index: Record<string, unknown>,
  key: string,
): string | null {
  const value = index[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function emptyEquippedGear(): EquippedGear {
  return {
    armor: null,
    shield: null,
    maxDex: null,
    acp: 0,
    speedArmorDelta: null,
    armorName: null,
    shieldName: null,
  };
}

function armoredSpeedForBase(
  speedBase: number,
  speed30: number | null | undefined,
  speed20: number | null | undefined,
): number | null {
  if (speedBase <= 20) {
    return speed20 != null && Number.isFinite(speed20) ? speed20 : null;
  }
  return speed30 != null && Number.isFinite(speed30) ? speed30 : null;
}

/** Derive AC / ACP / max Dex / speed from equipped inventory rows. */
export function computeEquippedGear(
  inventory: InventoryRow[],
  speedBase = 30,
): EquippedGear {
  const result = emptyEquippedGear();
  let armorAcp = 0;
  let shieldAcp = 0;

  for (const row of inventory) {
    if (!row.equipped) continue;
    if (isArmorKind(row.kind)) {
      result.armor = row.armorBonus ?? 0;
      result.armorName = row.name || null;
      if (row.maxDex != null && Number.isFinite(row.maxDex)) {
        result.maxDex = row.maxDex;
      }
      armorAcp = row.acp ?? 0;
      const armored = armoredSpeedForBase(speedBase, row.speed30, row.speed20);
      if (armored != null) {
        result.speedArmorDelta = armored - speedBase;
      }
    } else if (isShieldKind(row.kind)) {
      result.shield = row.armorBonus ?? 0;
      result.shieldName = row.name || null;
      shieldAcp = row.acp ?? 0;
    }
  }

  result.acp = armorAcp + shieldAcp;
  return result;
}

/** Unequip other rows of the same armor/shield family when equipping one. */
export function equipInventoryRow(inventory: InventoryRow[], index: number): void {
  const row = inventory[index];
  if (!row) return;
  const equippingArmor = isArmorKind(row.kind);
  const equippingShield = isShieldKind(row.kind);
  row.equipped = true;
  if (!equippingArmor && !equippingShield) return;
  for (let i = 0; i < inventory.length; i++) {
    if (i === index) continue;
    const other = inventory[i];
    if (equippingArmor && isArmorKind(other.kind)) other.equipped = false;
    if (equippingShield && isShieldKind(other.kind)) other.equipped = false;
  }
}

export function gearStatsFromEquipmentIndex(input: {
  kind?: string | null;
  weight?: string | null;
  indexData?: unknown;
}): Pick<
  InventoryRow,
  | "kind"
  | "weight"
  | "armorBonus"
  | "maxDex"
  | "acp"
  | "speed30"
  | "speed20"
  | "damageM"
  | "damageS"
  | "critical"
  | "damageType"
  | "handed"
  | "rangeIncrement"
> {
  const index = (input.indexData ?? {}) as Record<string, unknown>;
  const kind =
    input.kind ??
    (typeof index.kind === "string" ? index.kind : null);
  const stats = parseEquipmentStats(
    typeof index.stats === "string" ? index.stats : null,
  );
  const acBonus =
    parseSignedNumber(typeof index.ac_bonus === "string" ? index.ac_bonus : null) ??
    parseSignedNumber(stats.ac);
  const maxDex =
    parseSignedNumber(typeof index.max_dex === "string" ? index.max_dex : null) ??
    parseSignedNumber(stats.maxDex);
  const acp =
    parseSignedNumber(
      typeof index.armor_check_penalty === "string" ? index.armor_check_penalty : null,
    ) ?? parseSignedNumber(stats.acp);
  const speed30 = parseSignedNumber(
    typeof index.speed_30 === "string" ? index.speed_30 : null,
  );
  const speed20 = parseSignedNumber(
    typeof index.speed_20 === "string" ? index.speed_20 : null,
  );

  const damageM = readIndexString(index, "damage_m") ?? stats.damage ?? null;
  const damageS = readIndexString(index, "damage_s");
  const critical =
    readIndexString(index, "critical") ?? stats.critical ?? null;
  const damageType = readIndexString(index, "damage_type");
  const handed = readIndexString(index, "handed");
  const rangeIncrement = readIndexString(index, "range_increment");

  return {
    kind,
    weight: parseWeightPounds(input.weight),
    armorBonus: acBonus,
    maxDex,
    acp,
    speed30,
    speed20,
    damageM,
    damageS,
    critical,
    damageType,
    handed,
    rangeIncrement,
  };
}
