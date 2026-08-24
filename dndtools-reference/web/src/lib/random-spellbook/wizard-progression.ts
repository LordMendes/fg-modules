/** Max arcane spell level a wizard can cast at the given class level (3.5 PHB). */
export function maxSpellLevelForWizard(wizardLevel: number): number {
  if (wizardLevel < 1) return 0;
  if (wizardLevel < 3) return 1;
  if (wizardLevel < 5) return 2;
  if (wizardLevel < 7) return 3;
  if (wizardLevel < 9) return 4;
  if (wizardLevel < 11) return 5;
  if (wizardLevel < 13) return 6;
  if (wizardLevel < 15) return 7;
  if (wizardLevel < 17) return 8;
  return 9;
}

/** Starting 1st-level spells written at 1st level: 3 + Int modifier (minimum 1). */
export function startingFirstLevelSpellCount(intModifier: number): number {
  return Math.max(1, 3 + intModifier);
}

/** Total non-cantrip free spells gained by class level (RAW progression). */
export function totalNonCantripSpellCount(wizardLevel: number, intModifier: number): number {
  if (wizardLevel < 1) return 0;
  return startingFirstLevelSpellCount(intModifier) + (wizardLevel - 1) * 2;
}

/** Wishlist sample size per spell circle, scaled to wizard level. */
export function spellsOfInterestCount(wizardLevel: number): number {
  return Math.max(3, Math.ceil(wizardLevel / 2));
}
