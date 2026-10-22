import { rollExpression } from "@/lib/dice/roll-expression";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { TOWN_STOCK_DICE } from "./constants";
import {
  rollDescription,
  rollKeeper,
  rollLocation,
  rollShopNamePattern,
} from "./flavor";
import { finalizeShopName, refreshShopNameForKeeper } from "./names";
import type {
  MagicShopFlavor,
  MagicShopInput,
  MagicShopSection,
  ShopType,
  TownSize,
} from "./types";
import { MAGIC_SHOP_SECTION_SALT } from "./types";

export function magicShopSectionSeed(seed: number, section: MagicShopSection): number {
  const salt = MAGIC_SHOP_SECTION_SALT[section];
  return (seed + salt * 1_000_003) >>> 0;
}

export function sectionRng(
  seed: number,
  section: MagicShopSection,
  bump = 0,
): SeededRng {
  return createSeededRng((magicShopSectionSeed(seed, section) + bump * 97) >>> 0);
}

export function rollStockCount(townSize: TownSize, rng: SeededRng): number {
  const expr = TOWN_STOCK_DICE[townSize];
  return Math.max(1, Math.round(rollExpression(expr, rng).count));
}

export function rollShopName(
  keeper: string,
  rng: SeededRng,
  previousDisplayName?: string,
): { shopName: string; shopNamePattern: string } {
  const pattern = rollShopNamePattern(rng);
  return finalizeShopName(pattern, keeper, previousDisplayName);
}

export function generateMagicShopFlavor(
  input: Pick<MagicShopInput, "townSize" | "shopType" | "seed">,
): MagicShopFlavor {
  const keeperRng = sectionRng(input.seed, "keeper");
  const keeper = rollKeeper(input.shopType, keeperRng);

  const nameRng = sectionRng(input.seed, "name");
  const { shopName, shopNamePattern } = rollShopName(keeper, nameRng);

  const locationRng = sectionRng(input.seed, "location");
  const descriptionRng = sectionRng(input.seed, "description");

  return {
    shopName,
    shopNamePattern,
    location: rollLocation(input.townSize, locationRng),
    description: rollDescription(descriptionRng),
    keeper,
    itemCount: 0,
  };
}

export function rerollMagicShopSection(
  section: MagicShopSection,
  input: Pick<MagicShopInput, "townSize" | "shopType" | "seed">,
  current: MagicShopFlavor,
  bump = 0,
): MagicShopFlavor {
  const rng = sectionRng(input.seed, section, bump);
  switch (section) {
    case "keeper": {
      const keeper = rollKeeper(input.shopType, rng);
      const shopName = refreshShopNameForKeeper(
        current.shopNamePattern,
        current.shopName,
        keeper,
      );
      return { ...current, keeper, shopName };
    }
    case "name": {
      const rolled = rollShopName(current.keeper, rng, current.shopName);
      return {
        ...current,
        shopName: rolled.shopName,
        shopNamePattern: rolled.shopNamePattern,
      };
    }
    case "location":
      return { ...current, location: rollLocation(input.townSize, rng) };
    case "description":
      return { ...current, description: rollDescription(rng) };
    case "items":
      return { ...current, itemCount: 0 };
    default:
      return current;
  }
}

export function generateMagicShop(
  input: MagicShopInput,
  _rng: SeededRng,
): MagicShopFlavor {
  return generateMagicShopFlavor(input);
}
