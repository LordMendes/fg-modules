export type TownEnvironment =
  | "arctic"
  | "desert"
  | "forest"
  | "grassland"
  | "mountain"
  | "subterranean";

export type TownTopography = "inland" | "coastal" | "island";

export type TownSize =
  | "thorp"
  | "hamlet"
  | "village"
  | "small-town"
  | "large-town"
  | "small-city"
  | "large-city"
  | "metropolis";

export type TownRace = "any" | "human" | "dwarf" | "elf";

export type TownInput = {
  name: string;
  environment: TownEnvironment;
  topography: TownTopography;
  river: boolean;
  size: TownSize;
  walled: boolean;
  labels: boolean;
  normalizeCells?: boolean;
  race: TownRace;
  culture: string;
};

export type BuildingType =
  | "smith"
  | "shrine"
  | "inn"
  | "warehouse"
  | "homes"
  | "mill"
  | "barracks"
  | "well";

export type TownDistrict = {
  index: number;
  name: string;
  buildingType: BuildingType;
  notes: string;
};

export type TownBuildingRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  shade?: number;
};

export type TownDistrictLayout = {
  index: number;
  name: string;
  buildingType: BuildingType;
  bounds: { x: number; y: number; w: number; h: number };
  buildings: TownBuildingRect[];
};

export type TownRiver = {
  points: { x: number; y: number }[];
  width: number;
};

export type TownWallKind = "none" | "palisade" | "stone";

export type TownSvgDraft = {
  labels: boolean;
  districtTextIds: string[];
  hasWater: boolean;
  river: TownRiver | null;
  wallKind: TownWallKind;
};

export type TownResult = {
  name: string;
  culture: string;
  environment: TownEnvironment;
  topography: TownTopography;
  effectiveTopography: TownTopography;
  river: boolean;
  size: TownSize;
  walled: boolean;
  labels: boolean;
  race: TownRace;
  wallKind: TownWallKind;
  wallDescription: string;
  districtCount: number;
  districts: TownDistrict[];
  marketName: string | null;
  riverGeometry: TownRiver | null;
  hasWater: boolean;
  svg: string;
  svgDraft: TownSvgDraft;
  profile: {
    population: string;
    government: string;
    notable: string[];
  };
};

export const TOWN_VIEW_SIZE = 900;

export const DISTRICT_COUNT_BY_SIZE: Record<TownSize, number> = {
  thorp: 1,
  hamlet: 2,
  village: 3,
  "small-town": 4,
  "large-town": 6,
  "small-city": 8,
  "large-city": 10,
  metropolis: 14,
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  smith: "Smith",
  shrine: "Shrine",
  inn: "Inn",
  warehouse: "Warehouse",
  homes: "Homes",
  mill: "Mill",
  barracks: "Barracks",
  well: "Well",
};

export const BUILDING_TYPES: BuildingType[] = [
  "smith",
  "shrine",
  "inn",
  "warehouse",
  "homes",
  "mill",
  "barracks",
  "well",
];

export const TOWN_ENVIRONMENTS: TownEnvironment[] = [
  "arctic",
  "desert",
  "forest",
  "grassland",
  "mountain",
  "subterranean",
];

export const TOWN_TOPOGRAPHIES: TownTopography[] = ["inland", "coastal", "island"];

export const TOWN_SIZES: TownSize[] = [
  "thorp",
  "hamlet",
  "village",
  "small-town",
  "large-town",
  "small-city",
  "large-city",
  "metropolis",
];

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

export const TOWN_RACES: TownRace[] = ["any", "human", "dwarf", "elf"];

export const DEFAULT_TOWN_INPUT: Omit<TownInput, "name"> = {
  environment: "grassland",
  topography: "inland",
  river: false,
  size: "village",
  walled: false,
  labels: true,
  race: "any",
  culture: "default",
};

export function defaultWalledForSize(size: TownSize): boolean {
  return (
    size === "small-city" || size === "large-city" || size === "metropolis"
  );
}
