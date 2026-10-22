import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";

export type NameCatalogGroup = "common" | "monstrous" | "outsider" | "places";

export type NameSyllables = {
  start: string[];
  middle: string[];
  end: string[];
};

export type NameCatalog = {
  id: string;
  label: string;
  group: NameCatalogGroup;
  syllables: NameSyllables;
  /** Optional second word for place-style catalogs */
  nouns?: string[];
  /** Fraction of rolls that append a noun (default 0.5 when nouns exist) */
  twoWordChance?: number;
};

export type NameGeneratorMode = "builtin" | "markov";

export type BuiltinNameInput = {
  mode: "builtin";
  catalogId: string;
  count: number;
  seed: number;
  withLastName?: boolean;
};

export type MarkovNameInput = {
  mode: "markov";
  sourceText: string;
  order: 2 | 3;
  count: number;
  seed: number;
  withLastName?: boolean;
};

export type NameGeneratorInput = BuiltinNameInput | MarkovNameInput;

export type NameGeneratorResult = {
  names: string[];
  error?: string;
  note?: string;
};

export const DEFAULT_NAME_COUNT = 10;
export const DEFAULT_NAME_SEED = 1;
export const DEFAULT_MARKOV_ORDER = 2 as const;

export type { SeededRng };
