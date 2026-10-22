export {
  catalogIdForAncestry,
  genderFromHint,
  rollRandomCharacterName,
  type NameGender,
} from "./ancestry";
export {
  generateBuiltinNames,
  generateMarkovNames,
  generateNames,
} from "./generate";
export {
  generateMarkovBatch,
  generateMarkovName,
  markovOutputUsesTrainingPairs,
  parseSourceNames,
  trainMarkovModel,
  type MarkovModel,
} from "./markov";
export {
  catalogSupportsLastName,
  catalogsForGroup,
  DEFAULT_CATALOG_ID,
  getNameCatalog,
  NAME_CATALOG_GROUPS,
  NAME_CATALOGS,
} from "./tables";
export type {
  BuiltinNameInput,
  MarkovNameInput,
  NameCatalog,
  NameCatalogGroup,
  NameGeneratorInput,
  NameGeneratorMode,
  NameGeneratorResult,
  NameSyllables,
} from "./types";
export {
  DEFAULT_MARKOV_ORDER,
  DEFAULT_NAME_COUNT,
  DEFAULT_NAME_SEED,
} from "./types";
