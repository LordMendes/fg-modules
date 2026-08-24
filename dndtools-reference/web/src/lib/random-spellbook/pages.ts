import type { WizardSpellRef } from "./types";

/** Blank spellbook rule: 1 page per cantrip, 2 pages per spell level otherwise. */
export function spellPages(spellLevel: number): number {
  if (spellLevel <= 0) return 1;
  return spellLevel * 2;
}

export function totalSpellbookPages(spells: WizardSpellRef[]): number {
  return spells.reduce((sum, spell) => sum + spellPages(spell.level), 0);
}

export const STANDARD_BLANK_SPELLBOOK_PAGES = 100;
