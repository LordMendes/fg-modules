import type { DensityKey, PrimaryRace, TownSizeKey } from "./types";

export const DENSITY_VALUES: Record<DensityKey, number> = {
  desolate: 20,
  low: 40,
  settled: 60,
  average: 80,
  high: 100,
  maximum: 120,
};

export const DENSITY_LABELS: Record<DensityKey, string> = {
  desolate: "Desolate (20)",
  low: "Low (40)",
  settled: "Settled (60)",
  average: "Average (80)",
  high: "High (100)",
  maximum: "Maximum (120)",
};

export const PRIMARY_RACES: PrimaryRace[] = [
  "Human",
  "Dwarf",
  "Elf",
  "Gnome",
  "Half-elf",
  "Half-orc",
  "Halfling",
];

/** Order for mixed and integrated percentages. */
export const RACE_ORDER: PrimaryRace[] = [
  "Human",
  "Halfling",
  "Elf",
  "Dwarf",
  "Gnome",
  "Half-elf",
  "Half-orc",
];

export const MIXED_PERCENTS = [79, 9, 5, 3, 2, 1, 1] as const;
export const INTEGRATED_PERCENTS = [37, 20, 18, 10, 7, 5, 3] as const;

export type TownSizeRow = {
  minPop: number;
  maxPop: number;
  key: TownSizeKey;
  label: string;
  gpLimit: number;
  powerCenterModifier: number;
  levelModifier: number;
  powerCenterRolls: number;
};

export const TOWN_SIZE_TABLE: TownSizeRow[] = [
  {
    minPop: 20,
    maxPop: 80,
    key: "thorp",
    label: "Thorp",
    gpLimit: 40,
    powerCenterModifier: -1,
    levelModifier: -3,
    powerCenterRolls: 1,
  },
  {
    minPop: 81,
    maxPop: 400,
    key: "hamlet",
    label: "Hamlet",
    gpLimit: 100,
    powerCenterModifier: 0,
    levelModifier: -2,
    powerCenterRolls: 1,
  },
  {
    minPop: 401,
    maxPop: 900,
    key: "village",
    label: "Village",
    gpLimit: 200,
    powerCenterModifier: 1,
    levelModifier: -1,
    powerCenterRolls: 1,
  },
  {
    minPop: 901,
    maxPop: 2000,
    key: "small town",
    label: "Small town",
    gpLimit: 800,
    powerCenterModifier: 2,
    levelModifier: 0,
    powerCenterRolls: 1,
  },
  {
    minPop: 2001,
    maxPop: 5000,
    key: "large town",
    label: "Large town",
    gpLimit: 3000,
    powerCenterModifier: 3,
    levelModifier: 3,
    powerCenterRolls: 1,
  },
  {
    minPop: 5001,
    maxPop: 12000,
    key: "small city",
    label: "Small city",
    gpLimit: 15000,
    powerCenterModifier: 4,
    levelModifier: 6,
    powerCenterRolls: 2,
  },
  {
    minPop: 12001,
    maxPop: 25000,
    key: "large city",
    label: "Large city",
    gpLimit: 40000,
    powerCenterModifier: 5,
    levelModifier: 9,
    powerCenterRolls: 3,
  },
  {
    minPop: 25001,
    maxPop: Number.POSITIVE_INFINITY,
    key: "metropolis",
    label: "Metropolis",
    gpLimit: 100000,
    powerCenterModifier: 6,
    levelModifier: 12,
    powerCenterRolls: 4,
  },
];

export const CLASS_DEFINITIONS = [
  { name: "Barbarian", dice: 1, sides: 4 },
  { name: "Bard", dice: 1, sides: 6 },
  { name: "Cleric", dice: 1, sides: 6 },
  { name: "Druid", dice: 1, sides: 6 },
  { name: "Fighter", dice: 1, sides: 8 },
  { name: "Monk", dice: 1, sides: 4 },
  { name: "Paladin", dice: 1, sides: 3 },
  { name: "Ranger", dice: 1, sides: 3 },
  { name: "Rogue", dice: 1, sides: 8 },
  { name: "Sorcerer", dice: 1, sides: 4 },
  { name: "Wizard", dice: 1, sides: 4 },
  { name: "Adept", dice: 1, sides: 6, firstLevelPercent: 0.5 },
  { name: "Aristocrat", dice: 1, sides: 4, firstLevelPercent: 0.5 },
  { name: "Commoner", dice: 4, sides: 4, firstLevelPercent: 91, commonerRemainder: true },
  { name: "Expert", dice: 3, sides: 4, firstLevelPercent: 3 },
  { name: "Warrior", dice: 2, sides: 4, firstLevelPercent: 5 },
] as const;

export const TRADE_RATIOS: readonly { trade: string; ratio: number }[] = [
  { trade: "Bakers", ratio: 800 },
  { trade: "Barbers", ratio: 350 },
  { trade: "Bathers", ratio: 1900 },
  { trade: "Beer-sellers", ratio: 1400 },
  { trade: "Blacksmiths", ratio: 1500 },
  { trade: "Bleachers", ratio: 2100 },
  { trade: "Bookbinders", ratio: 3000 },
  { trade: "Booksellers", ratio: 6300 },
  { trade: "Buckle makers", ratio: 1400 },
  { trade: "Butchers", ratio: 1200 },
  { trade: "Carpenters", ratio: 550 },
  { trade: "Chandlers", ratio: 700 },
  { trade: "Chicken butchers", ratio: 1000 },
  { trade: "Coopers", ratio: 700 },
  { trade: "Copyists", ratio: 2000 },
  { trade: "Cutlers", ratio: 2300 },
  { trade: "Doctors", ratio: 1700 },
  { trade: "Fishmongers", ratio: 1200 },
  { trade: "Furriers", ratio: 250 },
  { trade: "Glovemakers", ratio: 2400 },
  { trade: "Harness-makers", ratio: 2000 },
  { trade: "Hatmakers", ratio: 950 },
  { trade: "Hay merchants", ratio: 2300 },
  { trade: "Illuminators", ratio: 3900 },
  { trade: "Inns", ratio: 2000 },
  { trade: "Jewelers", ratio: 400 },
  { trade: "Locksmiths", ratio: 1900 },
  { trade: "Magic shops", ratio: 2800 },
  { trade: "Maidservants", ratio: 250 },
  { trade: "Masons", ratio: 500 },
  { trade: "Mercers", ratio: 700 },
  { trade: "Old-clothes dealers", ratio: 400 },
  { trade: "Painters", ratio: 1500 },
  { trade: "Pastrycooks", ratio: 500 },
  { trade: "Plasterers", ratio: 1400 },
  { trade: "Pursemakers", ratio: 1100 },
  { trade: "Roofers", ratio: 1800 },
  { trade: "Ropemakers", ratio: 1900 },
  { trade: "Rugmakers", ratio: 2000 },
  { trade: "Saddlers", ratio: 1000 },
  { trade: "Scabbardmakers", ratio: 850 },
  { trade: "Sculptors", ratio: 2000 },
  { trade: "Shoemakers", ratio: 150 },
  { trade: "Spice merchants", ratio: 1400 },
  { trade: "Tailors", ratio: 250 },
  { trade: "Tanners", ratio: 2000 },
  { trade: "Taverns", ratio: 400 },
  { trade: "Watercarriers", ratio: 850 },
  { trade: "Weavers", ratio: 600 },
  { trade: "Wine-sellers", ratio: 900 },
  { trade: "Woodcarvers", ratio: 2400 },
  { trade: "Woodsellers", ratio: 2400 },
];
