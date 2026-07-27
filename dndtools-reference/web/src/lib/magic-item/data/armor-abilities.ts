import { CORE_ARMOR_ABILITIES } from "./core/armor-abilities";
import { CAR_ARMOR_ABILITIES } from "./complete/arcane";
import { CAD_ARMOR_ABILITIES } from "./complete/adventurer";
import { CS_ARMOR_ABILITIES } from "./complete/scoundrel";
import type { ArmorAbility, SourceAbbrev } from "../types";

export const ARMOR_ABILITIES: ArmorAbility[] = [
  ...CORE_ARMOR_ABILITIES,
  ...CAR_ARMOR_ABILITIES,
  ...CAD_ARMOR_ABILITIES,
  ...CS_ARMOR_ABILITIES,
];

export const ARMOR_ABILITY_BY_ID = new Map(
  ARMOR_ABILITIES.map((a) => [a.id, a]),
);

export function filterArmorAbilitiesBySource(
  abilities: ArmorAbility[],
  source: SourceAbbrev | "all",
): ArmorAbility[] {
  if (source === "all") return abilities;
  return abilities.filter((a) => a.source === source);
}

export const ARMOR_ABILITY_SOURCES: (SourceAbbrev | "all")[] = [
  "all",
  "DMG",
  "CAr",
  "CAd",
  "CS",
];
