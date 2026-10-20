import type { TreasureItemEntry } from "@/lib/treasure";

export type RandomTableKind =
  | "traps"
  | "npcs"
  | "pickpocket"
  | "magic-items"
  | "spellbooks";

export type NpcGender = "any" | "male" | "female";
export type NpcRace =
  | "any"
  | "human"
  | "dwarf"
  | "elf"
  | "gnome"
  | "half-elf"
  | "half-orc"
  | "halfling";
export type NpcClassOrder =
  | "any"
  | "adventurer"
  | "npc-class"
  | "arcane"
  | "divine"
  | "martial"
  | "scoundrel"
  | "wild";

export type MagicItemRank = "minor" | "medium" | "major";
export type MagicItemType =
  | "any"
  | "armor"
  | "potion"
  | "ring"
  | "rod"
  | "scroll"
  | "staff"
  | "wand"
  | "weapon"
  | "wondrous";

export type SpellbookRank = "mundane" | "minor" | "medium" | "major";

export type RandomTablesInput = {
  kind: RandomTableKind;
  count: number;
  seed: number;
  trapCr?: number;
  npcGender?: NpcGender;
  npcRace?: NpcRace;
  npcClassOrder?: NpcClassOrder;
  magicRank?: MagicItemRank;
  magicType?: MagicItemType;
  spellbookRank?: SpellbookRank;
};

export type TrapResult = {
  kind: "trap";
  name: string;
  cr: number;
  searchDc: number;
  disableDeviceDc: number;
  trigger: string;
  attackOrSave: string;
  damageExpression: string;
  exampleDamage: number;
  bypass: string;
  isMagic: boolean;
  spellEffect?: string;
  spellHref?: string;
};

export type NpcResult = {
  kind: "npc";
  text: string;
  name: string;
  race: string;
  gender: string;
  className: string;
  level: number;
  mannerism: string;
  classHref?: string;
};

export type PickpocketResult = {
  kind: "pickpocket";
  summary: string;
};

export type MagicItemTableResult = {
  kind: "magic-item";
  item?: TreasureItemEntry;
  error?: string;
};

export type SpellbookSpellEntry = {
  name: string;
  level: number;
  href?: string;
};

export type SpellbookResult = {
  kind: "spellbook";
  title: string;
  spells: SpellbookSpellEntry[];
};

export type RandomTableEntry =
  | TrapResult
  | NpcResult
  | PickpocketResult
  | MagicItemTableResult
  | SpellbookResult;

export type RandomTablesResult = {
  entries: RandomTableEntry[];
  magicItemsUnavailable?: boolean;
};

export type SpellRef = {
  slug: string;
  name: string;
  level: number;
};

export type RandomTablesContext = {
  spellsByLevel?: Record<number, SpellRef[]>;
  wizardSpellsByLevel?: Record<number, SpellRef[]>;
  classSlugByLowerName?: Record<string, string>;
  itemSlugByLowerName?: Record<string, string>;
  spellSlugByLowerName?: Record<string, string>;
};
