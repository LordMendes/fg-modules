import { CORE_WEAPONS } from "./core/weapons";
import { CAD_WEAPONS } from "./complete/adventurer";
import { CW_WEAPONS } from "./complete/warrior";
import type { Weapon } from "../types";

export const WEAPONS: Weapon[] = [...CORE_WEAPONS, ...CW_WEAPONS, ...CAD_WEAPONS];

export const WEAPON_BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));

export const WEAPON_CATEGORY_LABELS = {
  simple: "Simple",
  martial: "Martial",
  exotic: "Exotic",
} as const;
