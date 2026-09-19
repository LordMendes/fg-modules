import { labelsFromPayload } from "@/lib/combat/eventLabels";
import { formatEventForViewer } from "./format";
import type {
  CombatEventPayload,
  CombatEventRecord,
  CombatEventView,
  CombatEventViewer,
  CombatFilterCombatant,
  CombatFilterContext,
} from "./types";

function findCombatant(
  combat: CombatFilterContext,
  combatantId: string | null,
): CombatFilterCombatant | null {
  if (!combatantId) return null;
  return combat.combatants.find((c) => c.id === combatantId) ?? null;
}

function isVisibleToViewer(
  combatant: CombatFilterCombatant,
  viewer: CombatEventViewer,
): boolean {
  return viewer.isDm || combatant.visibleToPlayers;
}

function resolveDisplayName(
  combatant: CombatFilterCombatant | null,
  viewer: CombatEventViewer,
): string | null {
  if (!combatant) return null;
  if (!isVisibleToViewer(combatant, viewer)) return null;
  if (!viewer.isDm && !combatant.identified) {
    return combatant.genericLabel ?? "Creature";
  }
  return combatant.name;
}

function redactPayloadForViewer(
  kind: CombatEventRecord["kind"],
  payload: CombatEventPayload,
  viewer: CombatEventViewer,
): unknown {
  if (viewer.isDm) return payload;

  switch (kind) {
    case "attack":
    case "critConfirm":
    case "save":
      return {
        ...(payload as Record<string, unknown>),
        modifiers: [],
      };
    case "damage":
      return {
        ...(payload as Record<string, unknown>),
        packets: [],
        adjustments: [],
      };
    default:
      return payload;
  }
}

function shouldOmitForViewer(
  actor: CombatFilterCombatant | null,
  target: CombatFilterCombatant | null,
  viewer: CombatEventViewer,
): boolean {
  if (viewer.isDm) return false;

  const actorHidden = actor != null && !actor.visibleToPlayers;
  const targetHidden = target != null && !target.visibleToPlayers;

  if (actorHidden && targetHidden) return true;
  if (actorHidden && target == null) return true;
  if (targetHidden && actor == null) return true;

  return false;
}

/** Filter a persisted combat event for one viewer; null drops the event. */
export function filterEventForViewer(
  event: CombatEventRecord,
  viewer: CombatEventViewer,
  combat: CombatFilterContext,
): CombatEventView | null {
  if (!viewer.isDm && event.visibility === "dm") {
    return null;
  }

  const actor = findCombatant(combat, event.actorCombatantId);
  const target = findCombatant(combat, event.targetCombatantId);

  if (shouldOmitForViewer(actor, target, viewer)) {
    return null;
  }

  const snap = labelsFromPayload(event.payload);
  const actorName =
    snap?.actor ?? resolveDisplayName(actor, viewer);
  const targetName =
    snap?.target ?? resolveDisplayName(target, viewer);
  const payload = redactPayloadForViewer(event.kind, event.payload, viewer);

  const lines = formatEventForViewer(
    {
      kind: event.kind,
      payload: event.payload,
      actorName,
      targetName,
      targetPcPlanId: target?.pcPlanId ?? null,
    },
    viewer,
  );

  return {
    id: event.id,
    seq: event.seq,
    round: event.round,
    kind: event.kind,
    at: event.at,
    actorName,
    targetName,
    actorCombatantId: event.actorCombatantId,
    targetCombatantId: event.targetCombatantId,
    lines,
    payload,
    rollId: event.rollId,
    reverted: event.reverted,
  };
}
