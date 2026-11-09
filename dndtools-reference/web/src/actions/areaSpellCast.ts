"use server";

import { requireCombatActor } from "@/actions/combat";
import { startCombatRoll } from "@/lib/combat/combatRolls";
import type {
  CombatRollResult,
  StartCombatRollInput,
} from "@/lib/combat/combatRollTypes";
import { requireCurrentUser } from "@/lib/auth/session";

/**
 * Cast an area spell with computed target IDs from map placement.
 * Same as startCombatRollAction but explicitly for area spells.
 */
export async function castAreaSpellAction(
  input: StartCombatRollInput,
): Promise<CombatRollResult> {
  const user = await requireCurrentUser();
  const auth = await requireCombatActor(input.campaignId);
  if (!auth.ok) return { success: false, error: auth.error };

  return startCombatRoll(
    {
      ...auth.actor,
      username: user.username,
      isDm: auth.isDm,
      pcPlanId: auth.pcPlanId,
    },
    input,
  );
}
