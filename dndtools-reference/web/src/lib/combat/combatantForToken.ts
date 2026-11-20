import type { CampaignCombatView } from "./types";
import type { MapTokenView } from "@/lib/map/types";

/**
 * Find the combatant associated with a map token.
 * First tries to match by tokenId, then falls back to matching PC combatants by pcPlanId.
 * This supports the FG-style workflow where PCs can be added to combat before their tokens
 * are placed, or tokens can be placed before adding to combat.
 */
export function combatantForToken(
  combat: CampaignCombatView | null,
  tokenId: string,
  allTokens: MapTokenView[],
): CampaignCombatView["combatants"][number] | null {
  if (!combat) return null;

  // First try to match by tokenId (the primary link)
  const byTokenId = combat.combatants.find((c) => c.tokenId === tokenId);
  if (byTokenId) return byTokenId;

  // If no tokenId match, try to match PC combatants by pcPlanId
  // This handles the case where a PC was added to combat without a token
  const token = allTokens.find((t) => t.id === tokenId);
  if (token?.pcPlanId) {
    return (
      combat.combatants.find(
        (c) => c.kind === "pc" && c.pcPlanId === token.pcPlanId,
      ) ?? null
    );
  }

  return null;
}

/**
 * Build a map of pcPlanId -> tokenId for all PC tokens on a map.
 * Used when adding party to combat to link existing tokens.
 */
export function buildPcTokenMap(
  tokens: Array<{ id: string; kind: string; pcPlanId: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const token of tokens) {
    if (token.kind === "pc" && token.pcPlanId) {
      map.set(token.pcPlanId, token.id);
    }
  }
  return map;
}
