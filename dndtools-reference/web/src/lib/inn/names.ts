import { generateBuiltinNames } from "@/lib/names";
import {
  applyKeeperPossessiveName,
  applyKeeperPlaceholder,
  parseKeeperGivenName,
} from "@/lib/magic-shop/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { INN_NAME_PATTERNS } from "./tables";

export function rollCatalogInnName(rng: SeededRng): string {
  const names = generateBuiltinNames(
    { catalogId: "inn", count: 1, seed: 1 },
    rng,
  );
  const base = names[0] ?? "Quiet Hearth";
  if (base.startsWith("The ")) return base;
  return `The ${base}`;
}

export function rollPatternInnName(
  keeper: string,
  rng: SeededRng,
  previousDisplayName?: string,
): { name: string; namePattern: string } {
  const pattern = rng.pick([...INN_NAME_PATTERNS]) ?? INN_NAME_PATTERNS[0]!;
  const givenName = parseKeeperGivenName(keeper);
  let name = applyKeeperPlaceholder(pattern, givenName);
  if (givenName && !pattern.includes("{keeper}") && previousDisplayName) {
    name = applyKeeperPossessiveName(name, givenName);
  } else if (givenName && !pattern.includes("{keeper}")) {
    name = applyKeeperPossessiveName(name, givenName);
  }
  return { name, namePattern: pattern };
}

export function rollInnName(
  keeper: string,
  rng: SeededRng,
  previousDisplayName?: string,
): { name: string; namePattern: string } {
  if (rng.next() < 0.5) {
    return { name: rollCatalogInnName(rng), namePattern: "" };
  }
  return rollPatternInnName(keeper, rng, previousDisplayName);
}

export function refreshInnNameForKeeper(
  namePattern: string,
  currentName: string,
  keeper: string,
): string {
  if (!namePattern) return currentName;
  const givenName = parseKeeperGivenName(keeper);
  if (!givenName) return currentName;
  if (namePattern.includes("{keeper}")) {
    return applyKeeperPlaceholder(namePattern, givenName);
  }
  return applyKeeperPossessiveName(currentName, givenName);
}

export function rollKeeperGivenName(rng: SeededRng): string {
  const catalogId = rng.next() < 0.5 ? "human-male" : "human-female";
  const names = generateBuiltinNames(
    { catalogId, count: 1, seed: 1 },
    rng,
  );
  return names[0] ?? "Mira";
}
