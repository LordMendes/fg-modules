export type EncounterEntry = {
  slug: string;
  name: string;
  cr: string;
  count: number;
};

export type EncounterSummary = {
  el: number | null;
  totalXpPerPc: number;
  creatureCount: number;
  invalidCrCount: number;
};

export type SavedEncounter = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  entries: EncounterEntry[];
};

export type MonsterRef = {
  slug: string;
  name: string;
  cr: string;
};
