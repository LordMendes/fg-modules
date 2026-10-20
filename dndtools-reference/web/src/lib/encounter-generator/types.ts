export type EncounterPlane = "prime" | "abyssal" | "infernal";

export type EncounterClimate = "cold" | "temperate" | "warm";

export type EncounterTerrain =
  | "aquatic"
  | "desert"
  | "forest"
  | "hill"
  | "marsh"
  | "mountain"
  | "plain"
  | "underground";

export type EncounterInput = {
  level: number;
  plane: EncounterPlane;
  climate: EncounterClimate;
  terrain: EncounterTerrain;
  partySize: number;
  partyLevel: number;
};

export type MonsterCandidate = {
  slug: string;
  name: string;
  cr: string;
  crNum: number;
  environment: string | null;
  subtypes: string | null;
  creatureType: string | null;
  treasure: string | null;
  size: string | null;
};

export type EncounterGroup = {
  slug: string;
  name: string;
  cr: string;
  crNum: number;
  count: number;
  size: string | null;
  creatureType: string | null;
  treasure: string | null;
};

export type EncounterGenerateResult = {
  description: string;
  groups: EncounterGroup[];
  actualEl: number | null;
  emptyPool: boolean;
};

export type GroupXpLine = {
  slug: string;
  name: string;
  count: number;
  xpEach: number;
  xpNote: string | null;
};

export type EncounterXpSummary = {
  totalXp: number;
  xpPerPc: number;
  lines: GroupXpLine[];
};
