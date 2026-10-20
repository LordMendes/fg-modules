export type WorldStyle = "atlas" | "antique";

export type WorldRivers = "none" | "yes" | "many";

export type WorldCities = "none" | "yes" | "many";

export type TerrainKind = "sea" | "lowland" | "mountain" | "ice";

export type WorldInput = {
  name: string;
  water: number;
  ice: number;
  style: WorldStyle;
  geography: boolean;
  rivers: WorldRivers;
  cities: WorldCities;
  hexGrid: boolean;
  labels: boolean;
};

export type WorldCell = {
  col: number;
  row: number;
  height: number;
  terrain: TerrainKind;
  river: boolean;
  coast: boolean;
};

export type SettlementKind = "city" | "ruin" | "capital";

export type WorldSettlement = {
  col: number;
  row: number;
  name: string;
  kind: SettlementKind;
};

export type RiverPath = {
  points: { col: number; row: number }[];
};

export type WorldResult = {
  name: string;
  input: WorldInput;
  cells: WorldCell[];
  rivers: RiverPath[];
  settlements: WorldSettlement[];
  svg: string;
  seaCount: number;
  iceCount: number;
};

export const DEFAULT_WORLD_INPUT: WorldInput = {
  name: "",
  water: 60,
  ice: 8,
  style: "atlas",
  geography: true,
  rivers: "yes",
  cities: "yes",
  hexGrid: true,
  labels: true,
};
