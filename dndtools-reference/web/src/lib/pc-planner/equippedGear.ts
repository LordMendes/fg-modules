import { parseEquipmentStats } from "@/lib/equipment-display";
import {
  inferArmorCategory,
  type ArmorLoadCategory,
} from "./encumbrance";
import { effectiveArmorBonus, effectiveArmorCheckPenalty } from "./inventoryItem";
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
  /** Equipped body armor category (shields ignored). */
  armorCategory: ArmorLoadCategory;
  /** Main-hand / two-handed / ranged weapon name. */
  mainWeaponName: string | null;
  /** Off-hand weapon name (not a shield). */
  offWeaponName: string | null;
};

export type WeaponHand = "main" | "off";

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

function weaponHanded(row: InventoryRow): string {
  return (row.handed ?? "").toLowerCase();
}

/** Two-handed or ranged weapons occupy both hands when equipped as Main. */
export function weaponOccupiesBothHands(row: InventoryRow): boolean {
  if (!isWeaponKind(row.kind)) return false;
  const handed = weaponHanded(row);
  return handed === "two" || handed === "ranged";
}

/** One-handed or light melee can be Main or Off. */
export function weaponAllowsOffHand(row: InventoryRow): boolean {
  if (!isWeaponKind(row.kind)) return false;
  const handed = weaponHanded(row);
  if (!handed) return true; // custom / unknown: allow either slot
  return handed === "one" || handed === "light";
}

function clearWeaponHand(row: InventoryRow): void {
  row.weaponHand = null;
  if (isWeaponKind(row.kind)) {
    row.equipped = false;
  }
}

function unequipShields(inventory: InventoryRow[]): void {
  for (const row of inventory) {
    if (isShieldKind(row.kind) && row.equipped) {
      row.equipped = false;
    }
  }
}

function clearHandSlot(inventory: InventoryRow[], hand: WeaponHand): void {
  for (const row of inventory) {
    if (!isWeaponKind(row.kind)) continue;
    if (row.weaponHand === hand) clearWeaponHand(row);
  }
}

function clearBothHandWeapons(inventory: InventoryRow[]): void {
  for (const row of inventory) {
    if (!isWeaponKind(row.kind)) continue;
    if (row.weaponHand) clearWeaponHand(row);
  }
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
    armorCategory: "none",
    mainWeaponName: null,
    offWeaponName: null,
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
    if (isWeaponKind(row.kind) && row.weaponHand === "main") {
      result.mainWeaponName = row.name || null;
    }
    if (isWeaponKind(row.kind) && row.weaponHand === "off") {
      result.offWeaponName = row.name || null;
    }
    if (!row.equipped) continue;
    if (isArmorKind(row.kind)) {
      result.armor = effectiveArmorBonus(row);
      result.armorName = row.name || null;
      result.armorCategory = inferArmorCategory(row);
      if (row.maxDex != null && Number.isFinite(row.maxDex)) {
        result.maxDex = row.maxDex;
      }
      armorAcp = effectiveArmorCheckPenalty(row);
      const armored = armoredSpeedForBase(speedBase, row.speed30, row.speed20);
      if (armored != null) {
        result.speedArmorDelta = armored - speedBase;
      }
    } else if (isShieldKind(row.kind)) {
      result.shield = effectiveArmorBonus(row);
      result.shieldName = row.name || null;
      shieldAcp = effectiveArmorCheckPenalty(row);
    }
  }

  result.acp = armorAcp + shieldAcp;
  return result;
}

/**
 * Equip a weapon into Main or Off. Enforces one weapon per slot and
 * two-handed/ranged occupying both hands (clears Off + shield).
 */
export function equipWeaponHand(
  inventory: InventoryRow[],
  index: number,
  hand: WeaponHand,
): void {
  const row = inventory[index];
  if (!row || !isWeaponKind(row.kind)) return;

  const bothHands = weaponOccupiesBothHands(row);
  if (hand === "off" && (bothHands || !weaponAllowsOffHand(row))) return;

  if (bothHands) {
    clearBothHandWeapons(inventory);
    unequipShields(inventory);
    row.weaponHand = "main";
    row.equipped = true;
    return;
  }

  if (hand === "off") {
    clearHandSlot(inventory, "off");
    unequipShields(inventory);
    // Two-handed/ranged Main cannot coexist with Off.
    for (const other of inventory) {
      if (
        isWeaponKind(other.kind) &&
        other.weaponHand === "main" &&
        weaponOccupiesBothHands(other)
      ) {
        clearWeaponHand(other);
      }
    }
    row.weaponHand = "off";
    row.equipped = true;
    return;
  }

  // Main, one-handed / light
  clearHandSlot(inventory, "main");
  row.weaponHand = "main";
  row.equipped = true;
}

/** Clear a weapon's hand slot (and equipped flag). */
export function unequipWeapon(inventory: InventoryRow[], index: number): void {
  const row = inventory[index];
  if (!row || !isWeaponKind(row.kind)) return;
  clearWeaponHand(row);
}

/** Unequip other rows of the same armor/shield family when equipping one. */
export function equipInventoryRow(inventory: InventoryRow[], index: number): void {
  const row = inventory[index];
  if (!row) return;
  const equippingArmor = isArmorKind(row.kind);
  const equippingShield = isShieldKind(row.kind);
  row.equipped = true;
  if (equippingArmor) {
    for (let i = 0; i < inventory.length; i++) {
      if (i === index) continue;
      const other = inventory[i];
      if (isArmorKind(other.kind)) other.equipped = false;
    }
    return;
  }
  if (equippingShield) {
    for (let i = 0; i < inventory.length; i++) {
      if (i === index) continue;
      const other = inventory[i];
      if (isShieldKind(other.kind)) other.equipped = false;
    }
    // Shield occupies off-hand: clear Off weapon and two-handed/ranged Main.
    for (const other of inventory) {
      if (!isWeaponKind(other.kind)) continue;
      if (other.weaponHand === "off") clearWeaponHand(other);
      if (other.weaponHand === "main" && weaponOccupiesBothHands(other)) {
        clearWeaponHand(other);
      }
    }
  }
}

export function gearStatsFromEquipmentIndex(input: {
  kind?: string | null;
  weight?: string | null;
  indexData?: unknown;
  category?: string | null;
}): Pick<
  InventoryRow,
  | "kind"
  | "category"
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
  const category =
    input.category ??
    (typeof index.category === "string" ? index.category : null);
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
    category,
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
