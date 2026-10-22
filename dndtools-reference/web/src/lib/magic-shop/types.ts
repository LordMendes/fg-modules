export const TOWN_SIZES = [
  "thorp",
  "hamlet",
  "village",
  "small-town",
  "large-town",
  "small-city",
  "large-city",
  "metropolis",
] as const;

export type TownSize = (typeof TOWN_SIZES)[number];

export const SHOP_TYPES = [
  "trader",
  "armorer",
  "weaponsmith",
  "alchemist",
  "scribe",
  "wandwright",
] as const;

export type ShopType = (typeof SHOP_TYPES)[number];

export type ShopItemRow = {
  name: string;
  slug: string | null;
  price: string | null;
};

export type MagicShopInput = {
  townSize: TownSize;
  shopType: ShopType;
  seed: number;
};

export type MagicShopFlavor = {
  shopName: string;
  shopNamePattern: string;
  location: string;
  description: string;
  keeper: string;
  itemCount: number;
};

export type MagicShopResult = MagicShopFlavor & {
  items: ShopItemRow[];
};

export const MAGIC_SHOP_SECTION_SALT = {
  name: 1,
  location: 2,
  description: 3,
  keeper: 4,
  items: 5,
} as const;

export type MagicShopSection = keyof typeof MAGIC_SHOP_SECTION_SALT;
