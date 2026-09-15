import type { InventoryRow } from "./types";

const SLOT_PATTERNS: { slot: string; pattern: RegExp }[] = [
  { slot: "ring", pattern: /\bring\b/i },
  { slot: "belt", pattern: /\bbelt\b/i },
  { slot: "amulet", pattern: /\bamulet\b|\bnecklace\b/i },
  { slot: "cloak", pattern: /\bcloak\b|\bcape\b|\brobe\b/i },
  { slot: "boots", pattern: /\bboots\b|\bboot\b|\bshoes\b/i },
  { slot: "gloves", pattern: /\bgloves\b|\bgauntlets\b|\bbracers\b/i },
  { slot: "head", pattern: /\bhelm\b|\bhat\b|\bcirclet\b|\bcrown\b/i },
];

export function inferBodySlot(row: InventoryRow): string | null {
  if (row.bodySlot) return row.bodySlot;
  const hay = `${row.name} ${row.itemType ?? ""}`.toLowerCase();
  for (const { slot, pattern } of SLOT_PATTERNS) {
    if (pattern.test(hay)) return slot;
  }
  return null;
}

export type BodySlotConflict = {
  slot: string;
  items: string[];
};

/** Warn-only duplicate slot detection; does not block equipping. */
export function detectBodySlotConflicts(inventory: InventoryRow[]): BodySlotConflict[] {
  const bySlot = new Map<string, string[]>();
  for (const row of inventory) {
    if (!row.equipped && !row.weaponHand) continue;
    const slot = inferBodySlot(row);
    if (!slot) continue;
    const list = bySlot.get(slot) ?? [];
    list.push(row.name);
    bySlot.set(slot, list);
  }
  const conflicts: BodySlotConflict[] = [];
  for (const [slot, items] of bySlot) {
    const limit = slot === "ring" ? 2 : 1;
    if (items.length > limit) conflicts.push({ slot, items });
  }
  return conflicts;
}
