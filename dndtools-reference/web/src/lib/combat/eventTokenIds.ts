import type {
  CastAreaPayload,
  CastEventPayload,
} from "@/lib/combat/events/types";
import type { DamageType } from "@/lib/combat/types";

type TokenCombatant = { id: string; tokenId?: string | null };

export type TokenIdFields = {
  sourceTokenId?: string;
  targetTokenId?: string;
};

export function tokenIdsForCombatants(
  combatants: TokenCombatant[],
  actorCombatantId?: string | null,
  targetCombatantId?: string | null,
): TokenIdFields {
  const actor = actorCombatantId
    ? combatants.find((c) => c.id === actorCombatantId)
    : undefined;
  const target = targetCombatantId
    ? combatants.find((c) => c.id === targetCombatantId)
    : undefined;
  return {
    ...(actor?.tokenId ? { sourceTokenId: actor.tokenId } : {}),
    ...(target?.tokenId ? { targetTokenId: target.tokenId } : {}),
  };
}

export function withEventTokenIds<T extends Record<string, unknown>>(
  payload: T,
  combatants: TokenCombatant[],
  actorCombatantId?: string | null,
  targetCombatantId?: string | null,
): T & TokenIdFields {
  return {
    ...payload,
    ...tokenIdsForCombatants(combatants, actorCombatantId, targetCombatantId),
  };
}

/** Build a cast payload with optional map pointer area and token ids. */
export function buildCastEventPayload(
  base: Pick<CastEventPayload, "spellName" | "targetNames"> &
    Partial<Pick<CastEventPayload, "casterLevel">>,
  opts: {
    combatants: TokenCombatant[];
    actorCombatantId?: string | null;
    targetCombatantId?: string | null;
    area?: CastAreaPayload;
    damageType?: DamageType;
  },
): CastEventPayload {
  return {
    ...base,
    ...tokenIdsForCombatants(
      opts.combatants,
      opts.actorCombatantId,
      opts.targetCombatantId,
    ),
    ...(opts.area ? { area: opts.area } : {}),
    ...(opts.damageType ? { damageType: opts.damageType } : {}),
  };
}
