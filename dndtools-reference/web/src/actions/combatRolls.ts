"use server";

import { requireCombatActor } from "@/actions/combat";
import { startCombatRoll } from "@/lib/combat/combatRolls";
import type {
  CombatRollResult,
  StartCombatRollInput,
} from "@/lib/combat/combatRollTypes";
import { requireCurrentUser } from "@/lib/auth/session";

export type CombatRollActionResult = CombatRollResult;

export async function startCombatRollAction(
  input: StartCombatRollInput,
): Promise<CombatRollActionResult> {
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
