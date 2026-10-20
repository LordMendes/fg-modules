import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_TREASURE_INPUT,
  rollMagicCategory,
  rollMagicItem,
  type MagicTier,
  type TreasureInput,
} from "@/lib/treasure";
import type { MagicItemRank, MagicItemType, MagicItemTableResult } from "./types";

const TYPE_TO_CATEGORY: Record<
  Exclude<MagicItemType, "any">,
  keyof TreasureInput["magicTypes"]
> = {
  armor: "armor",
  weapon: "weapon",
  potion: "potion",
  ring: "ring",
  rod: "rod",
  scroll: "scroll",
  staff: "staff",
  wand: "wand",
  wondrous: "wondrous",
};

const TYPE_TO_ROLL_CATEGORY: Record<
  Exclude<MagicItemType, "any">,
  string
> = {
  armor: "armor",
  weapon: "weapons",
  potion: "potions",
  ring: "rings",
  rod: "rods",
  scroll: "scrolls",
  staff: "staffs",
  wand: "wands",
  wondrous: "wondrous",
};

function buildTreasureInput(
  rank: MagicItemRank,
  type: MagicItemType,
  linkContext?: TreasureInput["linkContext"],
): TreasureInput {
  const magicTypes = { ...DEFAULT_TREASURE_INPUT.magicTypes };
  if (type !== "any") {
    for (const key of Object.keys(magicTypes) as (keyof typeof magicTypes)[]) {
      magicTypes[key] = key === TYPE_TO_CATEGORY[type];
    }
  }
  return {
    ...DEFAULT_TREASURE_INPUT,
    rows: [],
    magicTypes,
    ranks: {
      minor: rank === "minor",
      medium: rank === "medium",
      major: rank === "major",
    },
    linkContext,
  };
}

export function rollTableMagicItem(
  rank: MagicItemRank,
  type: MagicItemType,
  rng: SeededRng,
  linkContext?: TreasureInput["linkContext"],
): MagicItemTableResult {
  try {
    const input = buildTreasureInput(rank, type, linkContext);
    const tier = rank as MagicTier;
    const entries =
      type === "any"
        ? rollMagicCategory(tier, rng, input)
        : rollMagicItem(tier, TYPE_TO_ROLL_CATEGORY[type], rng, input);
    const item = entries[0];
    if (!item) {
      return {
        kind: "magic-item",
        error: "No item matched the selected rank and type.",
      };
    }
    return { kind: "magic-item", item };
  } catch {
    return {
      kind: "magic-item",
      error: "Magic item rolls need the treasure tables.",
    };
  }
}
