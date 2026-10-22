import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  MAGIC_CATEGORY_FILES,
  treasureData,
  WEAPON_TYPE_TO_MUNDANE,
  type MagicItemRow,
  type MagicTierName,
} from "./data";
import {
  normalizeItemName,
  parsePriceGp,
  pickRowByRange,
  scrollPriceGp,
} from "./parse";
import type { MagicTier, TreasureInput, TreasureItemEntry } from "./types";

const MAX_ITEM_REROLLS = 20;

type RollContext = {
  input: TreasureInput;
  tier: MagicTier;
  rng: SeededRng;
};

function tierRange(row: MagicItemRow, tier: MagicTier): [number, number] | null {
  return row[tier];
}

function rowsForTier(tableKey: string, tier: MagicTier): MagicItemRow[] {
  if (tableKey.startsWith("wondrous_")) {
    return treasureData.magicTables[tableKey as keyof typeof treasureData.magicTables] ?? [];
  }
  const rows = treasureData.magicTables[tableKey as keyof typeof treasureData.magicTables] ?? [];
  return rows.filter((row) => tierRange(row, tier) !== null);
}

function pickMagicRow(
  tableKey: string,
  tier: MagicTier,
  rng: SeededRng,
): MagicItemRow | undefined {
  const rows = rowsForTier(tableKey, tier);
  if (rows.length === 0) return undefined;

  const dPctRows = rows.filter(
    (row): row is MagicItemRow & { d_pct: [number, number] } => Boolean(row.d_pct),
  );
  if (dPctRows.length > 0) {
    const roll = rng.pickInt(1, 100);
    return dPctRows.find(
      (row) => roll >= row.d_pct[0] && roll <= row.d_pct[1],
    );
  }

  const roll = rng.pickInt(1, 100);
  for (const row of rows) {
    const range = tierRange(row, tier);
    if (range && roll >= range[0] && roll <= range[1]) {
      return row;
    }
  }
  return undefined;
}

function resolveSubtableKey(target: string, tier: MagicTier): string | "armor_shield_special" | "weapon_special" | "mundane_ammunition" {
  if (target === "magic_armor_shield_special") return "armor_shield_special";
  if (target === "magic_weapon_special") return "weapon_special";
  if (target === "magic_weapon_ammunition") return "mundane_ammunition";
  const short = target.replace(/^magic_/, "");
  if (short === "specific_weapons") return "specific_weapons";
  if (short === "specific_armors") return "specific_armors";
  if (short === "specific_shields") return "specific_shields";
  if (short === "armor_type") return "armor_type";
  if (short === "shield_type") return "shield_type";
  if (short === "weapon_type") return "weapon_type";
  if (short.endsWith(`_${tier}`)) return short;
  return `${short}_${tier}`.replace(/_minor|_medium|_major/g, `_${tier}`);
}

function wondrousTableKey(tier: MagicTier): string {
  return `wondrous_${tier}`;
}

function categoryAllowed(category: string, input: TreasureInput): boolean {
  const map: Record<string, keyof TreasureInput["magicTypes"]> = {
    armor: "armor",
    weapons: "weapon",
    potions: "potion",
    rings: "ring",
    rods: "rod",
    scrolls: "scroll",
    staffs: "staff",
    wands: "wand",
    wondrous: "wondrous",
  };
  const key = map[category];
  return key ? input.magicTypes[key] : true;
}

function labelMatchesDisabledTypes(label: string, input: TreasureInput): boolean {
  const lower = label.toLowerCase();
  const checks: [keyof TreasureInput["magicTypes"], string][] = [
    ["potion", "potion"],
    ["wand", "wand"],
    ["staff", "staff"],
    ["ring", "ring"],
    ["rod", "rod"],
    ["scroll", "scroll"],
    ["armor", "armor"],
    ["armor", "shield"],
    ["weapon", "weapon"],
    ["wondrous", "wondrous"],
  ];
  for (const [key, token] of checks) {
    if (!input.magicTypes[key] && lower.includes(token)) {
      return true;
    }
  }
  return false;
}

function resolveItemLink(
  label: string,
  input: TreasureInput,
): string | undefined {
  const items = input.linkContext?.itemSlugByLowerName;
  const spells = input.linkContext?.spellSlugByLowerName;
  const lower = normalizeItemName(label);
  if (spells?.[lower]) {
    return `/spells/${spells[lower]}`;
  }
  const spellMatch = lower.match(/^(.+?)\s*\(scroll\)$/);
  if (spellMatch && spells?.[normalizeItemName(spellMatch[1]!)]) {
    return `/spells/${spells[normalizeItemName(spellMatch[1]!)]}`;
  }
  if (items?.[lower]) {
    return `/items/${items[lower]}`;
  }
  for (const [name, slug] of Object.entries(items ?? {})) {
    if (lower.includes(name)) {
      return `/items/${slug}`;
    }
  }
  return undefined;
}

function entryFromParts(
  parts: string[],
  priceDisplay: string,
  priceGp: number | null,
  input: TreasureInput,
): TreasureItemEntry {
  const label = parts.filter(Boolean).join(", ");
  return {
    label,
    priceDisplay,
    priceGp,
    href: resolveItemLink(label, input),
  };
}

function rollMundaneWeaponTable(
  tableKey: keyof typeof treasureData.mundaneWeapons,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry {
  const rows = treasureData.mundaneWeapons[tableKey] ?? [];
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(rows, roll);
  const label = row ? `Masterwork ${row.weapon}` : "Masterwork weapon";
  const priceGp = parsePriceGp(row?.cost ?? null);
  return entryFromParts([label], row?.cost?.replace(/^\+/, "") ?? "", priceGp, input);
}

function resolveScrollRow(row: MagicItemRow, rng: SeededRng, input: TreasureInput): TreasureItemEntry {
  const tradition = rng.next() < 0.5 ? "Arcane" : "Divine";
  const spellLevel = row.label;
  const caster = row.price;
  const priceGp = scrollPriceGp(spellLevel, caster);
  const label = `${tradition} scroll (${spellLevel}-level spell, caster ${caster})`;
  return entryFromParts([label], `${priceGp} gp`, priceGp, input);
}

function resolveMagicRowInternal(
  tableKey: string,
  tier: MagicTier,
  rng: SeededRng,
  input: TreasureInput,
  parentTable?: string,
  prefixParts: string[] = [],
  depth = 0,
): TreasureItemEntry[] {
  if (depth > 12) {
    return [entryFromParts(prefixParts, "", null, input)];
  }

  if (tableKey === "armor_shield_special") {
    const roll = rng.pickInt(1, 100);
    const nextKey = roll <= 50 ? "armor_special" : "shield_special";
    const specialRow = pickMagicRow(nextKey, tier, rng);
    const ability = specialRow?.label ?? "Special ability";
    const baseEntries = resolveMagicRowInternal(
      "armor_and_shields",
      tier,
      rng,
      input,
      "armor_and_shields",
      prefixParts,
      depth + 1,
    );
    return baseEntries.map((entry) =>
      entryFromParts(
        [...prefixParts, entry.label, ability],
        entry.priceDisplay,
        entry.priceGp,
        input,
      ),
    );
  }

  if (tableKey === "weapon_special") {
    const roll = rng.pickInt(1, 100);
    const nextKey = roll <= 70 ? "melee_special" : "ranged_special";
    const specialRow = pickMagicRow(nextKey, tier, rng);
    const ability = specialRow?.label ?? "Special ability";
    const baseEntries = resolveMagicRowInternal(
      "weapons",
      tier,
      rng,
      input,
      "weapons",
      prefixParts,
      depth + 1,
    );
    return baseEntries.map((entry) =>
      entryFromParts(
        [...prefixParts, entry.label, ability],
        entry.priceDisplay,
        entry.priceGp,
        input,
      ),
    );
  }

  if (tableKey === "mundane_ammunition") {
    const ammo = rollMundaneWeaponTable("ammunition" as keyof typeof treasureData.mundaneWeapons, rng, input);
    return [entryFromParts([...prefixParts, ammo.label], ammo.priceDisplay, ammo.priceGp, input)];
  }

  const resolvedKey =
    tableKey === "wondrous" ? wondrousTableKey(tier) : tableKey;

  const row = pickMagicRow(resolvedKey, tier, rng);
  if (!row) {
    return [entryFromParts(prefixParts, "", null, input)];
  }

  if (resolvedKey === "scroll_spell_levels") {
    return [resolveScrollRow(row, rng, input)];
  }

  const weaponType = WEAPON_TYPE_TO_MUNDANE[row.label.toLowerCase()];
  if (weaponType) {
    const weaponEntry = rollMundaneWeaponTable(weaponType, rng, input);
    return [entryFromParts([...prefixParts, row.label, weaponEntry.label], weaponEntry.priceDisplay, weaponEntry.priceGp, input)];
  }

  if (row.action === "subtable" && row.target) {
    const subKey = resolveSubtableKey(row.target, tier);
    const nested = resolveMagicRowInternal(
      subKey,
      tier,
      rng,
      input,
      resolvedKey,
      [...prefixParts, row.label],
      depth + 1,
    );
    if (subKey === "armor_shield_special" || subKey === "weapon_special") {
      return nested;
    }
    const priceGp = parsePriceGp(row.price);
    return nested.map((entry) =>
      entryFromParts(
        [row.label, entry.label],
        entry.priceDisplay || row.price,
        entry.priceGp ?? priceGp,
        input,
      ),
    );
  }

  if (row.action === "roll_again" && parentTable) {
    const first = resolveMagicRowInternal(
      parentTable,
      tier,
      rng,
      input,
      parentTable,
      prefixParts,
      depth + 1,
    );
    const second = resolveMagicRowInternal(
      parentTable,
      tier,
      rng,
      input,
      parentTable,
      prefixParts,
      depth + 1,
    );
    return [...first, ...second];
  }

  if (row.action === "roll_twice" && parentTable) {
    const first = resolveMagicRowInternal(
      parentTable,
      tier,
      rng,
      input,
      parentTable,
      prefixParts,
      depth + 1,
    );
    const second = resolveMagicRowInternal(
      parentTable,
      tier,
      rng,
      input,
      parentTable,
      prefixParts,
      depth + 1,
    );
    return [...first, ...second];
  }

  const priceGp = parsePriceGp(row.price);
  return [
    entryFromParts(
      [...prefixParts, row.label],
      row.price,
      priceGp,
      input,
    ),
  ];
}

function entryPassesFilters(entry: TreasureItemEntry, ctx: RollContext): boolean {
  if (!ctx.input.ranks[ctx.tier]) return false;
  if (labelMatchesDisabledTypes(entry.label, ctx.input)) return false;
  if (ctx.input.maxGp != null && entry.priceGp != null && entry.priceGp > ctx.input.maxGp) {
    return false;
  }
  return true;
}

function filterEntries(
  entries: TreasureItemEntry[],
  ctx: RollContext,
): TreasureItemEntry[] {
  return entries.filter((entry) => entryPassesFilters(entry, ctx));
}

export function rollMagicItem(
  tier: MagicTier,
  category: string,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry[] {
  if (!input.ranks[tier]) return [];
  if (!categoryAllowed(category, input)) return [];

  const tableKey =
    category === "wondrous"
      ? wondrousTableKey(tier)
      : MAGIC_CATEGORY_FILES[category] ?? category;

  for (let attempt = 0; attempt < MAX_ITEM_REROLLS; attempt++) {
    const entries = resolveMagicRowInternal(
      tableKey,
      tier,
      rng,
      input,
      tableKey,
    );
    const valid = filterEntries(entries, { input, tier, rng });
    if (valid.length > 0) return valid;
  }
  return [];
}

export function rollMagicCategory(
  tier: MagicTier,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry[] {
  const categories = treasureData.randomMagicCategories[tier as MagicTierName] ?? [];
  for (let attempt = 0; attempt < MAX_ITEM_REROLLS; attempt++) {
    const roll = rng.pickInt(1, 100);
    const categoryRow = pickRowByRange(categories, roll);
    if (!categoryRow) continue;
    if (!categoryAllowed(categoryRow.category, input)) continue;
    const items = rollMagicItem(tier, categoryRow.category, rng, input);
    if (items.length > 0) return items;
  }
  return [];
}
