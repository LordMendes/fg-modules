import artObjects from "./data/art_objects.json";
import gems from "./data/gems.json";
import mundaneArmor from "./data/mundane_armor.json";
import mundane from "./data/mundane.json";
import mundaneWeapons from "./data/mundane_weapons.json";
import randomMagicCategories from "./data/random_magic_categories.json";
import treasureLevels from "./data/treasure_levels.json";
import armorAndShields from "./data/magic_items/armor_and_shields.json";
import armorSpecial from "./data/magic_items/armor_special.json";
import armorType from "./data/magic_items/armor_type.json";
import commonMeleeWeapons from "./data/magic_items/common_melee_weapons.json";
import commonRangedWeapons from "./data/magic_items/common_ranged_weapons.json";
import meleeSpecial from "./data/magic_items/melee_special.json";
import potions from "./data/magic_items/potions.json";
import rangedSpecial from "./data/magic_items/ranged_special.json";
import rings from "./data/magic_items/rings.json";
import rods from "./data/magic_items/rods.json";
import scrollSpellLevels from "./data/magic_items/scroll_spell_levels.json";
import shieldSpecial from "./data/magic_items/shield_special.json";
import shieldType from "./data/magic_items/shield_type.json";
import specificArmors from "./data/magic_items/specific_armors.json";
import specificShields from "./data/magic_items/specific_shields.json";
import specificWeapons from "./data/magic_items/specific_weapons.json";
import staffs from "./data/magic_items/staffs.json";
import uncommonWeapons from "./data/magic_items/uncommon_weapons.json";
import wands from "./data/magic_items/wands.json";
import weapons from "./data/magic_items/weapons.json";
import weaponType from "./data/magic_items/weapon_type.json";
import wondrousMajor from "./data/magic_items/wondrous_major.json";
import wondrousMedium from "./data/magic_items/wondrous_medium.json";
import wondrousMinor from "./data/magic_items/wondrous_minor.json";

export type RangeRow = {
  from: number;
  to: number;
};

export type TreasureLevelEntry = {
  coin_range: [number, number] | null;
  coins: string;
  goods_range: [number, number] | null;
  goods: string;
  items_range: [number, number] | null;
  items: string;
};

export type GemRow = RangeRow & {
  value: string;
  average: string;
  examples: string;
};

export type MundaneRangeRow = RangeRow & {
  result: string;
  section?: string;
  subtable?: string;
  equipment_slug?: string;
};

export type MagicItemRow = {
  minor: [number, number] | null;
  medium: [number, number] | null;
  major: [number, number] | null;
  d_pct?: [number, number];
  label: string;
  price: string;
  action: "item" | "roll_again" | "roll_twice" | "subtable";
  target?: string | null;
};

export type WeaponRow = RangeRow & {
  weapon: string;
  cost: string;
  equipment_slug?: string;
  subtable?: string;
};

export const treasureData = {
  treasureLevels: treasureLevels as unknown as Record<string, TreasureLevelEntry[]>,
  gems: gems as GemRow[],
  artObjects: artObjects as GemRow[],
  mundane: mundane as Record<string, MundaneRangeRow[]>,
  mundaneArmor: mundaneArmor as Record<string, MundaneRangeRow[]>,
  mundaneWeapons: mundaneWeapons as Record<string, WeaponRow[]>,
  randomMagicCategories: randomMagicCategories as Record<
    MagicTierName,
    { from: number; to: number; category: string; label: string }[]
  >,
  magicTables: {
    armor_and_shields: armorAndShields.rows as MagicItemRow[],
    weapons: weapons.rows as MagicItemRow[],
    potions: potions.rows as MagicItemRow[],
    rings: rings.rows as MagicItemRow[],
    rods: rods.rows as MagicItemRow[],
    staffs: staffs.rows as MagicItemRow[],
    wands: wands.rows as MagicItemRow[],
    scroll_spell_levels: scrollSpellLevels.rows as MagicItemRow[],
    armor_type: armorType.rows as MagicItemRow[],
    shield_type: shieldType.rows as MagicItemRow[],
    weapon_type: weaponType.rows as MagicItemRow[],
    armor_special: armorSpecial.rows as MagicItemRow[],
    shield_special: shieldSpecial.rows as MagicItemRow[],
    melee_special: meleeSpecial.rows as MagicItemRow[],
    ranged_special: rangedSpecial.rows as MagicItemRow[],
    specific_armors: specificArmors.rows as MagicItemRow[],
    specific_shields: specificShields.rows as MagicItemRow[],
    specific_weapons: specificWeapons.rows as MagicItemRow[],
    wondrous_minor: wondrousMinor.rows as MagicItemRow[],
    wondrous_medium: wondrousMedium.rows as MagicItemRow[],
    wondrous_major: wondrousMajor.rows as MagicItemRow[],
    common_melee_weapons: commonMeleeWeapons.rows as MagicItemRow[],
    uncommon_weapons: uncommonWeapons.rows as MagicItemRow[],
    common_ranged_weapons: commonRangedWeapons.rows as MagicItemRow[],
  },
};

export type MagicTierName = "minor" | "medium" | "major";

export const MAGIC_CATEGORY_FILES: Record<string, string> = {
  armor: "armor_and_shields",
  weapons: "weapons",
  potions: "potions",
  rings: "rings",
  rods: "rods",
  staffs: "staffs",
  wands: "wands",
  scrolls: "scroll_spell_levels",
  wondrous: "wondrous",
};

export const WEAPON_TYPE_TO_MUNDANE: Record<string, keyof typeof mundaneWeapons> = {
  "common melee weapon": "common_melee",
  "uncommon weapon": "uncommon",
  "common ranged weapon": "common_ranged",
};
