import type {
  InventoryRow,
  InventorySpellEffect,
  PcPlanState,
} from "./types";

export type SpellItemKind = "wand" | "scroll";

export type ItemSpellAction = {
  inventoryIndex: number;
  itemId: string | null;
  itemName: string;
  slug: string;
  name: string;
  spellLevel: number;
  casterLevel: number;
  notes?: string;
  chargesCurrent: number | null;
  chargesMax: number | null;
};

export function isWandKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "wand";
}

export function isScrollKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "scroll";
}

export function isSpellItemKind(kind: string | null | undefined): kind is SpellItemKind {
  return isWandKind(kind) || isScrollKind(kind);
}

/** True when the row has a charge pool (max set). */
export function isChargedSpellItem(row: InventoryRow): boolean {
  return row.chargesMax != null && Number.isFinite(row.chargesMax);
}

/**
 * SRD minimum caster level for a spell on a wand/scroll:
 * cantrips CL 1, otherwise max(1, spellLevel * 2 - 1).
 */
export function minItemCasterLevel(spellLevel: number): number {
  const level = Number.isFinite(spellLevel) ? Math.max(0, Math.floor(spellLevel)) : 1;
  if (level <= 0) return 1;
  return Math.max(1, level * 2 - 1);
}

/**
 * Assumed ability modifier for item spell DCs: floor(spellLevel / 2).
 * DC = 10 + spellLevel + this value.
 */
export function itemSpellSaveDcMod(spellLevel: number): number {
  const level = Number.isFinite(spellLevel) ? Math.max(0, Math.floor(spellLevel)) : 0;
  return Math.floor(level / 2);
}

export function suggestedSpellItemName(
  kind: SpellItemKind | string,
  spellName: string,
): string {
  const spell = spellName.trim();
  if (!spell) {
    if (isWandKind(kind)) return "Wand";
    if (isScrollKind(kind)) return "Scroll";
    return "";
  }
  if (isWandKind(kind)) return `Wand of ${spell}`;
  if (isScrollKind(kind)) return `Scroll of ${spell}`;
  return spell;
}

function primarySpellLevel(row: InventoryRow): number {
  const effect = row.spellEffects?.[0];
  if (effect?.spellLevel != null && Number.isFinite(effect.spellLevel)) {
    return Math.max(0, Math.floor(effect.spellLevel));
  }
  return 1;
}

/**
 * Apply wand/scroll defaults when the kind changes.
 * Does not wipe an existing attached spell.
 */
export function applySpellItemKindDefaults(
  row: InventoryRow,
  kind: SpellItemKind | string,
): void {
  const lower = (kind ?? "").toLowerCase();
  row.kind = lower;

  if (isWandKind(lower)) {
    row.itemType = "Wand";
    row.weight = row.weight || 0;
    if (row.chargesMax == null || !Number.isFinite(row.chargesMax)) {
      row.chargesMax = 50;
      row.chargesCurrent = 50;
    }
    if (row.itemCasterLevel == null || !Number.isFinite(row.itemCasterLevel)) {
      row.itemCasterLevel = minItemCasterLevel(primarySpellLevel(row));
    }
    return;
  }

  if (isScrollKind(lower)) {
    row.itemType = "Scroll";
    row.weight = row.weight || 0;
    if (row.chargesMax == null || !Number.isFinite(row.chargesMax)) {
      row.chargesMax = 1;
      row.chargesCurrent = 1;
    }
    if (row.itemCasterLevel == null || !Number.isFinite(row.itemCasterLevel)) {
      row.itemCasterLevel = minItemCasterLevel(primarySpellLevel(row));
    }
  }
}

/** Keep current between 0 and max (when max is set). */
export function clampItemCharges(row: InventoryRow): void {
  if (row.chargesMax == null || !Number.isFinite(row.chargesMax)) return;
  const max = Math.max(0, Math.floor(row.chargesMax));
  row.chargesMax = max;
  const current =
    row.chargesCurrent == null || !Number.isFinite(row.chargesCurrent)
      ? max
      : Math.floor(row.chargesCurrent);
  row.chargesCurrent = Math.max(0, Math.min(max, current));
}

export function spendItemCharge(row: InventoryRow): boolean {
  clampItemCharges(row);
  if (row.chargesCurrent == null || row.chargesCurrent <= 0) return false;
  row.chargesCurrent -= 1;
  return true;
}

export function restoreItemCharge(row: InventoryRow): boolean {
  clampItemCharges(row);
  if (row.chargesMax == null) return false;
  if (row.chargesCurrent == null) {
    row.chargesCurrent = 1;
    clampItemCharges(row);
    return true;
  }
  if (row.chargesCurrent >= row.chargesMax) return false;
  row.chargesCurrent += 1;
  return true;
}

/**
 * SRD pricing: wand = level × CL × 750, scroll = level × CL × 25.
 * Treat spell level 0 as 0.5.
 */
export function spellItemPriceGp(row: InventoryRow): number | null {
  if (!isSpellItemKind(row.kind)) return null;
  const effect = row.spellEffects?.[0];
  if (!effect) return null;
  const spellLevel =
    effect.spellLevel != null && Number.isFinite(effect.spellLevel)
      ? Math.max(0, effect.spellLevel)
      : 1;
  const levelFactor = spellLevel <= 0 ? 0.5 : spellLevel;
  const cl =
    row.itemCasterLevel != null && Number.isFinite(row.itemCasterLevel)
      ? Math.max(1, Math.floor(row.itemCasterLevel))
      : minItemCasterLevel(spellLevel);
  const rate = isWandKind(row.kind) ? 750 : 25;
  return Math.round(levelFactor * cl * rate);
}

export function itemSpellDisplayLabel(
  itemName: string,
  spellName: string,
): string {
  const item = itemName.trim();
  const spell = spellName.trim();
  if (!item) return spell || "Spell";
  if (!spell) return item;
  const lowerItem = item.toLowerCase();
  const lowerSpell = spell.toLowerCase();
  if (lowerItem.includes(lowerSpell)) return item;
  return `${item}: ${spell}`;
}

function resolveSpellLevel(effect: InventorySpellEffect): number {
  if (effect.spellLevel != null && Number.isFinite(effect.spellLevel)) {
    return Math.max(0, Math.floor(effect.spellLevel));
  }
  return 1;
}

function resolveCasterLevel(row: InventoryRow, spellLevel: number): number {
  if (row.itemCasterLevel != null && Number.isFinite(row.itemCasterLevel)) {
    return Math.max(1, Math.floor(row.itemCasterLevel));
  }
  return minItemCasterLevel(spellLevel);
}

/**
 * Equipped inventory rows with spell effects become Actions rows.
 */
export function computeItemSpellActions(state: PcPlanState): ItemSpellAction[] {
  const out: ItemSpellAction[] = [];
  for (let i = 0; i < state.inventory.length; i++) {
    const row = state.inventory[i];
    if (!row.equipped) continue;
    const effects = row.spellEffects ?? [];
    if (effects.length === 0) continue;
    for (const effect of effects) {
      const spellLevel = resolveSpellLevel(effect);
      out.push({
        inventoryIndex: i,
        itemId: row.id ?? null,
        itemName: row.name.trim() || "Item",
        slug: effect.slug,
        name: effect.name,
        spellLevel,
        casterLevel: resolveCasterLevel(row, spellLevel),
        notes: effect.notes,
        chargesCurrent:
          row.chargesCurrent != null && Number.isFinite(row.chargesCurrent)
            ? Math.floor(row.chargesCurrent)
            : null,
        chargesMax:
          row.chargesMax != null && Number.isFinite(row.chargesMax)
            ? Math.floor(row.chargesMax)
            : null,
      });
    }
  }
  return out;
}
