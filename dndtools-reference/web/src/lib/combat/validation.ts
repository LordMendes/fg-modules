/**
 * Validation and helper functions for combat operations
 */

/**
 * Parse initiative value from string input
 * Allows any finite float value (positive or negative)
 */
export function parseInitiative(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Clamp integer value to min/max bounds with truncation
 * Returns null if value is not finite
 */
export function clampInt(value: unknown, min: number, max: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.trunc(Number(value))));
}

export type TargetingPermission = {
  canTarget: boolean;
  sourceCombatantId: string | null;
  reason?: string;
};

/**
 * Resolve which combatant should be the source for targeting actions
 * 
 * For DM:
 * - Use selected token if one is selected
 * - Fall back to current turn actor
 * - Fall back to first combatant
 * 
 * For players:
 * - Can only target from their own PC
 */
export function resolveTargetingSource(
  isDm: boolean,
  currentTurnCombatantId: string | null,
  selectedTokenCombatantId: string | null,
  ownPcCombatantIds: string[],
  allCombatants: Array<{ id: string }>,
): TargetingPermission {
  if (isDm) {
    const source = 
      selectedTokenCombatantId ?? 
      currentTurnCombatantId ?? 
      allCombatants[0]?.id ?? 
      null;
    
    if (!source) {
      return { canTarget: false, sourceCombatantId: null, reason: "No combatants in combat" };
    }
    
    return { canTarget: true, sourceCombatantId: source };
  }

  if (ownPcCombatantIds.length === 0) {
    return { canTarget: false, sourceCombatantId: null, reason: "No PC in combat" };
  }

  const source = ownPcCombatantIds[0]!;
  return { canTarget: true, sourceCombatantId: source };
}
