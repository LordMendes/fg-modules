import type { CategoryKey } from "@/lib/categories";

export const CATALOG_LETTERS = [
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  "#",
] as const;

export type CatalogLetter = (typeof CATALOG_LETTERS)[number];

export function isCatalogLetter(value: string): value is CatalogLetter {
  return (CATALOG_LETTERS as readonly string[]).includes(value.toLowerCase());
}

export function normalizeCatalogLetter(raw: string): CatalogLetter | null {
  const decoded = decodeURIComponent(raw).toLowerCase();
  if (decoded === "#") return "#";
  if (decoded.length === 1 && decoded >= "a" && decoded <= "z") return decoded as CatalogLetter;
  return null;
}

export function catalogLetterHref(category: CategoryKey, letter: CatalogLetter): string {
  const segment = letter === "#" ? "%23" : letter;
  return `/catalog/${category}/${segment}`;
}

export function catalogLetterLabel(letter: CatalogLetter): string {
  return letter === "#" ? "#" : letter.toUpperCase();
}
