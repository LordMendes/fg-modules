import { spellsOfInterestCount } from "./wizard-progression";
import type { RandomSpellbookUrlState } from "./types";

export const DEFAULT_WIZARD_LEVEL = 5;
export const DEFAULT_INT_MODIFIER = 2;
export const DEFAULT_SOURCES = ["PH"];

export const DEFAULT_RANDOM_SPELLBOOK_URL_STATE: RandomSpellbookUrlState = {
  wizardLevel: DEFAULT_WIZARD_LEVEL,
  intModifier: DEFAULT_INT_MODIFIER,
  selectedSources: DEFAULT_SOURCES,
  specialization: "",
  prohibitedSchools: [],
  interestPerLevel: spellsOfInterestCount(DEFAULT_WIZARD_LEVEL),
  seed: "",
};
