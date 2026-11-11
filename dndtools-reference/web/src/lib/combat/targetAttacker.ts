export type TargetAttackerInput = {
  isDm: boolean;
  requestedAttackerId?: string | null;
  currentCombatantId: string | null;
  combatantIds: string[];
  ownedCombatantId: string | null;
};

export function resolveTargetAttacker(
  input: TargetAttackerInput,
): { ok: true; attackerId: string } | { ok: false; error: string } {
  const ids = input.combatantIds;
  const requested = input.requestedAttackerId?.trim() || null;

  if (requested) {
    if (!ids.includes(requested)) {
      return { ok: false, error: "Combatant not found" };
    }
    if (input.isDm || requested === input.ownedCombatantId) {
      return { ok: true, attackerId: requested };
    }
    return { ok: false, error: "Not allowed to set targets for that combatant" };
  }

  if (input.isDm) {
    const source =
      input.currentCombatantId && ids.includes(input.currentCombatantId)
        ? input.currentCombatantId
        : ids[0];
    if (!source) return { ok: false, error: "No combatants in combat" };
    return { ok: true, attackerId: source };
  }

  if (!input.ownedCombatantId || !ids.includes(input.ownedCombatantId)) {
    return { ok: false, error: "No PC in combat" };
  }
  return { ok: true, attackerId: input.ownedCombatantId };
}
