import type {
  ClimateType,
  NearbyFeature,
  SettlementDistance,
  SettlementSize,
  TerrainType,
} from "./types";

export type ClimateOption = {
  value: ClimateType;
  label: string;
  priceModifier: number;
  note?: string;
};

export type TerrainOption = {
  value: TerrainType;
  label: string;
  priceModifier: number;
  note?: string;
};

export const CLIMATE_OPTIONS: ClimateOption[] = [
  { value: "cold", label: "Cold", priceModifier: 5, note: "–50% to cost of ice walls" },
  { value: "temperate", label: "Temperate", priceModifier: 0 },
  { value: "warm", label: "Warm", priceModifier: -5 },
];

export const TERRAIN_OPTIONS: TerrainOption[] = [
  { value: "aquatic", label: "Aquatic", priceModifier: 15 },
  { value: "desert", label: "Desert", priceModifier: 10 },
  { value: "plains", label: "Plains", priceModifier: -5 },
  { value: "forest", label: "Forest", priceModifier: 0, note: "–10% to cost of wood walls" },
  { value: "hill", label: "Hill", priceModifier: -5 },
  { value: "marsh", label: "Marsh", priceModifier: 10 },
  {
    value: "mountains",
    label: "Mountains",
    priceModifier: 0,
    note: "–5% to cost of hewn stone walls",
  },
  {
    value: "underground",
    label: "Underground",
    priceModifier: 10,
    note: "Hewn stone walls are free",
  },
  { value: "exotic", label: "Exotic (planar etc.)", priceModifier: 15 },
  { value: "mobile", label: "Mobile stronghold", priceModifier: -10 },
];

export type SettlementOption = {
  value: SettlementSize;
  label: string;
  gpLimit: number;
};

export const SETTLEMENT_OPTIONS: SettlementOption[] = [
  { value: "small-town", label: "Small town", gpLimit: 800 },
  { value: "large-town", label: "Large town", gpLimit: 3000 },
  { value: "small-city", label: "Small city", gpLimit: 15000 },
  { value: "large-city", label: "Large city", gpLimit: 40000 },
  { value: "metropolis", label: "Metropolis", gpLimit: 100000 },
];

export type DistanceOption = {
  value: SettlementDistance;
  label: string;
};

export const DISTANCE_OPTIONS: DistanceOption[] = [
  { value: "less-than-1", label: "Less than 1 mile" },
  { value: "1-16", label: "1–16 miles" },
  { value: "17-48", label: "17–48 miles" },
  { value: "49-112", label: "49–112 miles" },
  { value: "113-plus", label: "113 miles or more" },
];

const SETTLEMENT_DISTANCE_MODIFIERS: Record<
  SettlementSize,
  Record<SettlementDistance, number>
> = {
  "small-town": {
    "less-than-1": 0,
    "1-16": 2,
    "17-48": 4,
    "49-112": 7,
    "113-plus": 10,
  },
  "large-town": {
    "less-than-1": 2,
    "1-16": 0,
    "17-48": 2,
    "49-112": 4,
    "113-plus": 7,
  },
  "small-city": {
    "less-than-1": 3,
    "1-16": 1,
    "17-48": -2,
    "49-112": 1,
    "113-plus": 6,
  },
  "large-city": {
    "less-than-1": 6,
    "1-16": 3,
    "17-48": 1,
    "49-112": -1,
    "113-plus": 5,
  },
  metropolis: {
    "less-than-1": 10,
    "1-16": 7,
    "17-48": 5,
    "49-112": 0,
    "113-plus": 4,
  },
};

export type NearbyFeatureOption = {
  value: NearbyFeature;
  label: string;
  modifier: number;
};

export const NEARBY_FEATURE_OPTIONS: NearbyFeatureOption[] = [
  {
    value: "impedes-movement",
    label: "Natural feature that impedes normal movement",
    modifier: 2,
  },
  {
    value: "prohibits-movement",
    label: "Natural feature that prohibits normal movement",
    modifier: 4,
  },
  {
    value: "easier-attack",
    label: "Natural feature that makes attacking easier",
    modifier: -2,
  },
  { value: "legal-dispute", label: "Site under legal dispute", modifier: -5 },
  { value: "lawless", label: "Site in lawless area", modifier: -10 },
  {
    value: "controls-income",
    label: "Site controls income source",
    modifier: 10,
  },
  {
    value: "potential-income",
    label: "Nearby potential income source",
    modifier: 5,
  },
  {
    value: "hidden",
    label: "Site hidden from long-range observation",
    modifier: 5,
  },
];

export function getClimateModifier(climate: ClimateType | null): number {
  if (!climate) return 0;
  return CLIMATE_OPTIONS.find((c) => c.value === climate)?.priceModifier ?? 0;
}

export function getTerrainModifier(terrain: TerrainType): number {
  return TERRAIN_OPTIONS.find((t) => t.value === terrain)?.priceModifier ?? 0;
}

export function getSettlementModifier(
  settlement: SettlementSize,
  distance: SettlementDistance,
): number {
  return SETTLEMENT_DISTANCE_MODIFIERS[settlement][distance];
}

export function getNearbyFeatureModifier(feature: NearbyFeature): number {
  return (
    NEARBY_FEATURE_OPTIONS.find((f) => f.value === feature)?.modifier ?? 0
  );
}
