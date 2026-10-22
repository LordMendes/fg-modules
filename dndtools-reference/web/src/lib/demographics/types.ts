import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export type DensityKey =
  | "desolate"
  | "low"
  | "settled"
  | "average"
  | "high"
  | "maximum";

export type RacialMixMode = "isolated" | "mixed" | "integrated";

export type PrimaryRace =
  | "Human"
  | "Dwarf"
  | "Elf"
  | "Gnome"
  | "Half-elf"
  | "Half-orc"
  | "Halfling";

export type PowerCenterKind =
  | "conventional"
  | "nonstandard"
  | "magical"
  | "monstrous";

export type AlignmentLabel =
  | "lawful good"
  | "neutral good"
  | "chaotic good"
  | "lawful neutral"
  | "true neutral"
  | "chaotic neutral"
  | "lawful evil"
  | "neutral evil"
  | "chaotic evil";

export type KingdomInput = {
  name: string;
  areaSqMi: number;
  density: DensityKey;
  ageYears: number;
};

export type KingdomResult = {
  population: number;
  cultivatedFraction: number;
  cultivatedSqMi: number;
  wildernessFraction: number;
  wildernessSqMi: number;
  largestSettlementPop: number;
  largestSettlementLabel: string;
  secondSettlementPop: number;
  extraCityCount: number;
  townsOfNote: number;
  townsOfNoteNote: string;
  castlesActive: number;
  castlesActiveWilderness: number;
  castlesActiveSettled: number;
  castlesRuined: number;
  castlesRuinedWilderness: number;
  castlesRuinedSettled: number;
};

export type TownSizeKey =
  | "thorp"
  | "hamlet"
  | "village"
  | "small town"
  | "large town"
  | "small city"
  | "large city"
  | "metropolis";

export type TownInput = {
  name: string;
  population: number;
  racialMix: RacialMixMode;
  primaryRace: PrimaryRace;
};

export type RacialMixLine = {
  race: string;
  percent: number;
  label: string;
};

export type PowerCenter = {
  kind: PowerCenterKind;
  alignment: AlignmentLabel;
  sentence: string;
};

export type BusinessRow = {
  trade: string;
  count: number;
};

export type StaffCounts = {
  nobles: number;
  guards: number;
  advocates: number;
  clergy: number;
  priests: number;
};

export type ClassLevelGrid = {
  className: string;
  levels: Record<number, number>;
};

export type TownResult = {
  communityLabel: string;
  sizeKey: TownSizeKey;
  sizeLabel: string;
  gpLimit: number;
  readyCash: number;
  racialMixText: string;
  racialLines: RacialMixLine[];
  powerCenters: PowerCenter[];
  businesses: BusinessRow[];
  staff: StaffCounts;
  classGrid: ClassLevelGrid[];
  powerCenterRollCount: number;
  levelModifier: number;
};

export type DemographicsRng = SeededRng;

export type DieRoller = () => number;
