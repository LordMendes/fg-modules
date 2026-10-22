import { parsePriceGp } from "@/lib/treasure/parse";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { SHORTFALL_MESSAGE } from "./constants";
import {
  filterItemsForShopType,
  matchesSpecializedShopType,
  type CompendiumItem,
} from "./filters";
import type { ShopItemRow, ShopType } from "./types";

export function priceEligibleItems(
  items: CompendiumItem[],
  maxGp: number,
): CompendiumItem[] {
  return items.filter((item) => {
    const gp = parsePriceGp(item.price);
    return gp != null && gp <= maxGp;
  });
}

export function pickShopItems(
  eligible: CompendiumItem[],
  shopType: ShopType,
  count: number,
  rng: SeededRng,
): ShopItemRow[] {
  if (count <= 0) return [];

  const specialized = filterItemsForShopType(eligible, shopType);
  const traderPool = filterItemsForShopType(eligible, "trader");
  const picked: CompendiumItem[] = [];
  const usedSlugs = new Set<string>();

  function takeFrom(pool: CompendiumItem[], needed: number) {
    const available = pool.filter((item) => !usedSlugs.has(item.slug));
    const sample = rng.sample(available, needed);
    for (const item of sample) {
      picked.push(item);
      usedSlugs.add(item.slug);
    }
    return sample.length;
  }

  let remaining = count;
  remaining -= takeFrom(specialized, remaining);

  if (shopType !== "trader" && remaining > 0) {
    remaining -= takeFrom(traderPool, remaining);
  }

  const rows: ShopItemRow[] = picked.map((item) => ({
    name: item.name,
    slug: item.slug,
    price: item.price,
  }));

  while (rows.length < count) {
    rows.push({
      name: SHORTFALL_MESSAGE,
      slug: null,
      price: null,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return rows;
}

export function itemMatchesShopFilterForTest(
  item: CompendiumItem,
  shopType: ShopType,
  usedFallback: boolean,
): boolean {
  if (shopType === "trader" || usedFallback) return true;
  return matchesSpecializedShopType(item, shopType);
}
