export type CoinMode = "none" | "tenth" | "half" | "standard" | "double" | "triple";
export type GoodsMode = "none" | "half-chance" | "standard" | "double" | "triple";

export type MagicTier = "minor" | "medium" | "major";

export type HoardRow = {
  count: number;
  level: number;
  coins: CoinMode;
  valuables: GoodsMode;
  items: GoodsMode;
};

export type TreasureInput = {
  rows: HoardRow[];
  moreRandomCoins: boolean;
  salvagePercent: number;
  gems: boolean;
  art: boolean;
  magicTypes: {
    armor: boolean;
    weapon: boolean;
    potion: boolean;
    ring: boolean;
    rod: boolean;
    scroll: boolean;
    staff: boolean;
    wand: boolean;
    wondrous: boolean;
  };
  ranks: { minor: boolean; medium: boolean; major: boolean };
  maxGp: number | null;
  combine: boolean;
  linkContext?: {
    itemSlugByLowerName?: Record<string, string>;
    spellSlugByLowerName?: Record<string, string>;
  };
};

export type TreasureCoinPile = {
  cp: number;
  sp: number;
  gp: number;
  pp: number;
  display: string;
  gpTotal: number;
};

export type TreasureGoodEntry = {
  name: string;
  valueGp: number;
  valueDisplay: string;
  averageDisplay: string;
  kind: "gem" | "art";
};

export type TreasureItemEntry = {
  label: string;
  priceDisplay: string;
  priceGp: number | null;
  href?: string;
};

export type TreasureHoard = {
  title: string;
  level: number;
  coins: TreasureCoinPile;
  totalGp: number;
  gems: TreasureGoodEntry[];
  art: TreasureGoodEntry[];
  salvage: TreasureItemEntry[];
  items: TreasureItemEntry[];
};

export type TreasureResult = {
  hoards: TreasureHoard[];
};

export const DEFAULT_HOARD_ROW: HoardRow = {
  count: 1,
  level: 1,
  coins: "standard",
  valuables: "standard",
  items: "standard",
};

export const DEFAULT_TREASURE_INPUT: TreasureInput = {
  rows: [{ ...DEFAULT_HOARD_ROW }],
  moreRandomCoins: false,
  salvagePercent: 0,
  gems: true,
  art: true,
  magicTypes: {
    armor: true,
    weapon: true,
    potion: true,
    ring: true,
    rod: true,
    scroll: true,
    staff: true,
    wand: true,
    wondrous: true,
  },
  ranks: { minor: true, medium: true, major: true },
  maxGp: null,
  combine: false,
};
