import type {
  CombatFilterCombatant,
  CombatEventViewer,
} from "@/lib/combat/events/types";

export type EventLabelSnapshot = {
  actor: string | null;
  target: string | null;
};

export function resolveEventDisplayName(
  combatant: CombatFilterCombatant | null,
  viewer: CombatEventViewer,
): string | null {
  if (!combatant) return null;
  if (!viewer.isDm && !combatant.visibleToPlayers) return null;
  if (!viewer.isDm && !combatant.identified) {
    return combatant.genericLabel ?? "Creature";
  }
  return combatant.name;
}

export function labelsFromCombatants(
  combatants: CombatFilterCombatant[],
  actorId: string | null,
  targetId: string | null,
  viewer: CombatEventViewer,
): EventLabelSnapshot {
  const find = (id: string | null) =>
    id ? combatants.find((c) => c.id === id) ?? null : null;
  return {
    actor: resolveEventDisplayName(find(actorId), viewer),
    target: resolveEventDisplayName(find(targetId), viewer),
  };
}

export function mergeLabelsIntoPayload<T extends object>(
  payload: T,
  labels: EventLabelSnapshot,
): T & { _labels?: EventLabelSnapshot } {
  if (labels.actor == null && labels.target == null) return payload;
  return { ...payload, _labels: labels };
}

export function labelsFromPayload(payload: unknown): EventLabelSnapshot | null {
  if (!payload || typeof payload !== "object") return null;
  const labels = (payload as { _labels?: EventLabelSnapshot })._labels;
  if (!labels || typeof labels !== "object") return null;
  return {
    actor: typeof labels.actor === "string" ? labels.actor : labels.actor,
    target: typeof labels.target === "string" ? labels.target : labels.target,
  };
}
