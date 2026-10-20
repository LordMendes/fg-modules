import type {
  MagicItemRank,
  MagicItemType,
  NpcClassOrder,
  NpcGender,
  NpcRace,
  RandomTableKind,
  SpellbookRank,
} from "./types";

export const RANDOM_TABLE_KINDS: { value: RandomTableKind; label: string }[] = [
  { value: "traps", label: "Traps" },
  { value: "npcs", label: "NPCs" },
  { value: "pickpocket", label: "Pickpocket loot" },
  { value: "magic-items", label: "Magic items" },
  { value: "spellbooks", label: "Spellbooks" },
];

export const NPC_GENDERS: { value: NpcGender; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const NPC_RACES: { value: NpcRace; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "human", label: "Human" },
  { value: "dwarf", label: "Dwarf" },
  { value: "elf", label: "Elf" },
  { value: "gnome", label: "Gnome" },
  { value: "half-elf", label: "Half-elf" },
  { value: "half-orc", label: "Half-orc" },
  { value: "halfling", label: "Halfling" },
];

export const NPC_CLASS_ORDERS: { value: NpcClassOrder; label: string }[] = [
  { value: "any", label: "Any class" },
  { value: "adventurer", label: "Adventurer" },
  { value: "npc-class", label: "NPC class" },
  { value: "arcane", label: "Arcane" },
  { value: "divine", label: "Divine" },
  { value: "martial", label: "Martial" },
  { value: "scoundrel", label: "Scoundrel" },
  { value: "wild", label: "Wild" },
];

export const MAGIC_ITEM_RANKS: { value: MagicItemRank; label: string }[] = [
  { value: "minor", label: "Minor" },
  { value: "medium", label: "Medium" },
  { value: "major", label: "Major" },
];

export const MAGIC_ITEM_TYPES: { value: MagicItemType; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "armor", label: "Armor" },
  { value: "potion", label: "Potion" },
  { value: "ring", label: "Ring" },
  { value: "rod", label: "Rod" },
  { value: "scroll", label: "Scroll" },
  { value: "staff", label: "Staff" },
  { value: "wand", label: "Wand" },
  { value: "weapon", label: "Weapon" },
  { value: "wondrous", label: "Wondrous" },
];

export const SPELLBOOK_RANKS: { value: SpellbookRank; label: string }[] = [
  { value: "mundane", label: "Mundane" },
  { value: "minor", label: "Minor" },
  { value: "medium", label: "Medium" },
  { value: "major", label: "Major" },
];
