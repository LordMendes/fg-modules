import type { ShopType, TownSize } from "./types";

export const TOWN_SIZE_LABELS: Record<TownSize, string> = {
  thorp: "Thorp",
  hamlet: "Hamlet",
  village: "Village",
  "small-town": "Small town",
  "large-town": "Large town",
  "small-city": "Small city",
  "large-city": "Large city",
  metropolis: "Metropolis",
};

export const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  trader: "Trader",
  armorer: "Armorer",
  weaponsmith: "Weaponsmith",
  alchemist: "Alchemist",
  scribe: "Scribe",
  wandwright: "Wandwright",
};

export const TOWN_STOCK_DICE: Record<TownSize, string> = {
  thorp: "1d4",
  hamlet: "1d6",
  village: "2d4",
  "small-town": "3d4",
  "large-town": "3d4",
  "small-city": "4d4",
  "large-city": "4d4",
  metropolis: "6d4",
};

export const TOWN_MAX_GP: Record<TownSize, number> = {
  thorp: 40,
  hamlet: 100,
  village: 200,
  "small-town": 800,
  "large-town": 3000,
  "small-city": 15000,
  "large-city": 40000,
  metropolis: 100000,
};

export const TOWN_SIZE_PROSE: Record<TownSize, string> = {
  thorp: "a tiny thorp",
  hamlet: "a quiet hamlet",
  village: "a busy village",
  "small-town": "a small town",
  "large-town": "a large town",
  "small-city": "a small city",
  "large-city": "a large city",
  metropolis: "a sprawling metropolis",
};

export const SHORTFALL_MESSAGE = "The shop has nothing else in stock.";
