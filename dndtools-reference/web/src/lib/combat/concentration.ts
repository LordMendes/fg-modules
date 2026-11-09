/**
 * Concentration check mechanics for D&D 3.5E.
 * 
 * Rules:
 * - DC = 10 + damage taken + spell level being cast/maintained
 * - Roll d20 + caster level + Constitution modifier + bonuses
 * - Must succeed to maintain concentration or complete casting
 */

export type ConcentrationCheckInput = {
  /** d20 roll face value */
  face: number;
  /** Caster level */
  casterLevel: number;
  /** Constitution modifier */
  conModifier: number;
  /** Damage taken this round (for casting check) */
  damageTaken: number;
  /** Spell level being cast or maintained */
  spellLevel: number;
  /** Misc bonus from feats like Combat Casting (+4) */
  miscBonus?: number;
};

export type ConcentrationCheckOutcome = {
  face: number;
  casterLevel: number;
  conModifier: number;
  miscBonus: number;
  total: number;
  dc: number;
  success: boolean;
};

/**
 * Resolve a concentration check (3.5E rules).
 * DC = 10 + damage taken + spell level
 * Roll = d20 + CL + CON + bonuses (Combat Casting feat adds +4)
 */
export function resolveConcentrationCheck(
  input: ConcentrationCheckInput,
): ConcentrationCheckOutcome {
  const total =
    input.face +
    input.casterLevel +
    input.conModifier +
    (input.miscBonus ?? 0);

  const dc = 10 + input.damageTaken + input.spellLevel;

  return {
    face: input.face,
    casterLevel: input.casterLevel,
    conModifier: input.conModifier,
    miscBonus: input.miscBonus ?? 0,
    total,
    dc,
    success: total >= dc,
  };
}

/**
 * Check if concentration is required when taking damage.
 * Only needed if caster is currently maintaining a concentration spell
 * or in the middle of casting.
 */
export function requiresConcentrationCheck(
  isCasting: boolean,
  hasConcentrationSpells: boolean,
): boolean {
  return isCasting || hasConcentrationSpells;
}
