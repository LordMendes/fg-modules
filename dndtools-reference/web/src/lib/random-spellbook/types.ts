import type { ArcaneSchool } from "@/lib/spell-utils";

export type RandomSpellbookUrlState = {
  wizardLevel: number;
  intModifier: number;
  selectedSources: string[];
  specialization: ArcaneSchool | "";
  prohibitedSchools: ArcaneSchool[];
  interestPerLevel: number;
  seed: string;
};

export type WizardSpellRef = {
  slug: string;
  name: string;
  level: number;
  schools: string[];
  sourceAbbrev: string | null;
};

export type SpellbookInput = {
  wizardLevel: number;
  intModifier: number;
  specialization: ArcaneSchool | null;
  prohibitedSchools: ArcaneSchool[];
  interestPerLevel?: number;
  seed?: number;
};

export type SpellbookByLevel = {
  level: number;
  spells: WizardSpellRef[];
};

export type SpellbookResult = {
  seed: number;
  spellbook: SpellbookByLevel[];
  spellsOfInterest: SpellbookByLevel[];
  pageCount: number;
  totalSpells: number;
  cantripCount: number;
  maxSpellLevel: number;
  interestPerLevel: number;
};

export type WizardSourceOption = {
  abbrev: string;
  name: string;
  spellCount: number;
};
