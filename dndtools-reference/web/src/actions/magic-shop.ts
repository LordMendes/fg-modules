"use server";

import { prisma } from "@/lib/prisma";
import {
  pickShopItems,
  priceEligibleItems,
  rollStockCount,
  sectionRng,
  TOWN_MAX_GP,
  type ShopItemRow,
  type ShopType,
  type TownSize,
} from "@/lib/magic-shop";

export type GetShopItemsInput = {
  townSize: TownSize;
  shopType: ShopType;
  seed: number;
  itemsBump?: number;
};

export type GetShopItemsResult = {
  count: number;
  items: ShopItemRow[];
};

export async function getShopItems(input: GetShopItemsInput): Promise<GetShopItemsResult> {
  const maxGp = TOWN_MAX_GP[input.townSize];
  const rows = await prisma.item.findMany({
    select: {
      slug: true,
      name: true,
      itemType: true,
      price: true,
    },
  });

  const eligible = priceEligibleItems(rows, maxGp);
  const rng = sectionRng(input.seed, "items", input.itemsBump ?? 0);
  const count = rollStockCount(input.townSize, rng);
  const items = pickShopItems(eligible, input.shopType, count, rng);
  return { count, items };
}
