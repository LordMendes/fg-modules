import { CORE_WEAPON_ABILITIES, BANE_SUBTYPES } from "./core/weapon-abilities";
import { CAR_WEAPON_ABILITIES } from "./complete/arcane";
import { CAD_WEAPON_ABILITIES } from "./complete/adventurer";
import { CC_WEAPON_ABILITIES } from "./complete/champion";
import { CD_WEAPON_ABILITIES } from "./complete/divine";
import { CM_WEAPON_ABILITIES } from "./complete/mage";
import { CS_WEAPON_ABILITIES } from "./complete/scoundrel";
import { CW_WEAPON_ABILITIES } from "./complete/warrior";
import type { SourceAbbrev, WeaponAbility } from "../types";

export { BANE_SUBTYPES };

export const WEAPON_ABILITIES: WeaponAbility[] = [
  ...CORE_WEAPON_ABILITIES,
  ...CW_WEAPON_ABILITIES,
  ...CAR_WEAPON_ABILITIES,
  ...CAD_WEAPON_ABILITIES,
  ...CD_WEAPON_ABILITIES,
  ...CS_WEAPON_ABILITIES,
  ...CM_WEAPON_ABILITIES,
  ...CC_WEAPON_ABILITIES,
];

export const WEAPON_ABILITY_BY_ID = new Map(
  WEAPON_ABILITIES.map((a) => [a.id, a]),
);

export function abilitiesForWeaponKind(kind: "melee" | "ranged"): WeaponAbility[] {
  return WEAPON_ABILITIES.filter((a) => a.scope === "both" || a.scope === kind);
}

export function filterWeaponAbilitiesBySource(
  abilities: WeaponAbility[],
  source: SourceAbbrev | "all",
): WeaponAbility[] {
  if (source === "all") return abilities;
  return abilities.filter((a) => a.source === source);
}

export const WEAPON_ABILITY_SOURCES: (SourceAbbrev | "all")[] = [
  "all",
  "DMG",
  "CW",
  "CAr",
  "CAd",
  "CD",
  "CS",
  "CM",
  "CC",
];
