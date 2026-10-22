import type { ShopType } from "./types";

export type CompendiumItem = {
  slug: string;
  name: string;
  itemType: string | null;
  price: string | null;
};

function normalizedType(item: CompendiumItem): string {
  return (item.itemType ?? "").trim().toLowerCase();
}

function normalizedName(item: CompendiumItem): string {
  return item.name.trim().toLowerCase();
}

function typeOrNameIncludes(
  item: CompendiumItem,
  typeNeedles: string[],
  nameNeedles: string[],
): boolean {
  const type = normalizedType(item);
  const name = normalizedName(item);
  if (type.length > 0) {
    return typeNeedles.some((needle) => type.includes(needle));
  }
  return nameNeedles.some((needle) => name.includes(needle));
}

export function matchesSpecializedShopType(
  item: CompendiumItem,
  shopType: ShopType,
): boolean {
  switch (shopType) {
    case "trader":
      return true;
    case "armorer":
      return typeOrNameIncludes(item, ["armor", "shield"], [
        "armor",
        "shield",
        "mail",
        "plate",
        "helm",
        "gauntlet",
        "buckler",
        "breastplate",
        " chain",
        "chain ",
        " bracer",
        " greaves",
      ]);
    case "weaponsmith":
      return typeOrNameIncludes(item, ["weapon"], [
        "sword",
        "axe",
        "bow",
        "mace",
        "dagger",
        "spear",
        "hammer",
        "crossbow",
        "club",
        "flail",
        "rapier",
        "scimitar",
        "weapon",
      ]);
    case "alchemist":
      return typeOrNameIncludes(item, ["potion", "oil"], ["potion", " oil"]);
    case "scribe":
      return typeOrNameIncludes(item, ["scroll"], ["scroll"]);
    case "wandwright":
      return typeOrNameIncludes(item, ["wand", "staff"], ["wand", "staff", " rod"]);
    default:
      return false;
  }
}

export function filterItemsForShopType(
  items: CompendiumItem[],
  shopType: ShopType,
): CompendiumItem[] {
  if (shopType === "trader") return [...items];
  return items.filter((item) => matchesSpecializedShopType(item, shopType));
}
