export type AdventureInput = {
  seed: number;
};

export type AdventureSectionResult = {
  id: string;
  title: string;
  text: string;
};

export type AdventureResult = {
  seed: number;
  sections: AdventureSectionResult[];
};

export type AdventureSectionDef = {
  id: string;
  title: string;
  entries: readonly string[];
};
