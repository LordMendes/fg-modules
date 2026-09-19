import { deriveHealthStatus } from "@/lib/combat/healthStatus";
import type {
  CombatEventKind,
  CombatEventPayloadMap,
  CombatEventRecord,
  StatePatch,
} from "@/lib/combat/events/types";
import type { CombatantView } from "@/lib/combat/types";
import type { Prisma } from "@/generated/prisma/client";

const UNDOABLE_KINDS = new Set<CombatEventKind>([
  "damage",
  "heal",
  "tempHp",
  "nonlethal",
  "effectApply",
  "effectRemove",
  "hpEdit",
  "init",
]);

const ROW_DEPENDENT_KINDS = new Set<CombatEventKind>([
  "damage",
  "heal",
  "tempHp",
  "nonlethal",
  "hpEdit",
]);

export function canUndoEvent(
  event: { id: string; kind: CombatEventKind; targetCombatantId: string | null; reverted: boolean },
  allEvents: Array<{ id: string; kind: CombatEventKind; targetCombatantId: string | null; revertedAt: Date | null; seq: number }>,
): { ok: true } | { ok: false; reason: string } {
  if (!UNDOABLE_KINDS.has(event.kind)) {
    return { ok: false, reason: "This event type cannot be undone" };
  }
  if (event.reverted) {
    return { ok: false, reason: "Event already undone" };
  }
  if (ROW_DEPENDENT_KINDS.has(event.kind) && event.targetCombatantId) {
    const rowId = event.targetCombatantId;
    const later = allEvents.filter(
      (e) =>
        e.targetCombatantId === rowId &&
        e.revertedAt == null &&
        ROW_DEPENDENT_KINDS.has(e.kind as CombatEventKind) &&
        e.seq > allEvents.find((x) => x.id === event.id)!.seq,
    );
    if (later.length > 0) {
      return {
        ok: false,
        reason: "Only the most recent damage or heal on this row can be undone",
      };
    }
  }
  return { ok: true };
}

export type UndoRevertPlan = {
  combatantPatches: StatePatch[];
  effectDeletes: string[];
  effectRestores: Array<{
    id: string;
    data: Prisma.CampaignCombatEffectCreateInput;
  }>;
  summary: string;
};

export function planUndoRevert(
  kind: CombatEventKind,
  payload: CombatEventPayloadMap[CombatEventKind],
  targetCombatantId: string | null,
  effectRow?: {
    id: string;
    label: string;
    components: unknown;
    duration: number | null;
    durationUnit: string;
    expiry: string;
    applyMode: string;
    visibility: string;
    active: boolean;
    system: boolean;
    sourceCombatantId: string | null;
    tickInit: number | null;
    seq: number;
  } | null,
): UndoRevertPlan {
  const patches: StatePatch[] = [];
  const effectDeletes: string[] = [];
  const effectRestores: UndoRevertPlan["effectRestores"] = [];
  let summary = `Undid ${kind}`;

  switch (kind) {
    case "damage": {
      const p = payload as CombatEventPayloadMap["damage"];
      if (!targetCombatantId) break;
      patches.push({
        combatantId: targetCombatantId,
        wounds: p.woundsBefore ?? 0,
        hpTemp: p.hpTempBefore ?? 0,
        nonlethal: p.nonlethalBefore ?? 0,
        deathState: p.deathStateBefore ?? null,
      });
      summary = `Undid ${p.applied} damage`;
      break;
    }
    case "heal": {
      const p = payload as CombatEventPayloadMap["heal"];
      if (!targetCombatantId) break;
      patches.push({
        combatantId: targetCombatantId,
        wounds: p.woundsBefore ?? Math.max(0, p.hpMax - p.hpBefore),
        nonlethal: p.nonlethalBefore,
        deathState: p.deathStateBefore ?? null,
      });
      summary = `Undid ${p.amount} healing`;
      break;
    }
    case "tempHp": {
      const p = payload as CombatEventPayloadMap["tempHp"];
      if (!targetCombatantId) break;
      patches.push({
        combatantId: targetCombatantId,
        hpTemp: p.tempBefore,
      });
      summary = `Undid ${p.amount} temp HP`;
      break;
    }
    case "nonlethal": {
      const p = payload as CombatEventPayloadMap["nonlethal"];
      if (!targetCombatantId) break;
      patches.push({
        combatantId: targetCombatantId,
        nonlethal: p.nonlethalBefore,
      });
      summary = `Undid ${p.amount} nonlethal`;
      break;
    }
    case "hpEdit": {
      const p = payload as CombatEventPayloadMap["hpEdit"];
      if (!targetCombatantId) break;
      const hpMax = p.hpMax;
      patches.push({
        combatantId: targetCombatantId,
        wounds: Math.max(0, hpMax - p.hpBefore),
      });
      summary = "Undid HP edit";
      break;
    }
    case "init": {
      const p = payload as CombatEventPayloadMap["init"];
      const id = targetCombatantId;
      if (!id) break;
      patches.push({
        combatantId: id,
        init: p.initBefore ?? p.storedInit - p.face - p.effectBonus,
      });
      summary = "Undid initiative roll";
      break;
    }
    case "effectApply": {
      if (effectRow) effectDeletes.push(effectRow.id);
      summary = `Undid effect ${(payload as CombatEventPayloadMap["effectApply"]).label}`;
      break;
    }
    case "effectRemove": {
      if (effectRow) {
        effectRestores.push({
          id: effectRow.id,
          data: {
            id: effectRow.id,
            label: effectRow.label,
            components: effectRow.components as object,
            duration: effectRow.duration,
            durationUnit: effectRow.durationUnit,
            expiry: effectRow.expiry,
            applyMode: effectRow.applyMode,
            visibility: effectRow.visibility,
            active: effectRow.active,
            system: effectRow.system,
            sourceCombatantId: effectRow.sourceCombatantId,
            tickInit: effectRow.tickInit,
            seq: effectRow.seq,
            combatant: { connect: { id: targetCombatantId! } },
          },
        });
      }
      summary = `Undid removing ${(payload as CombatEventPayloadMap["effectRemove"]).label}`;
      break;
    }
    default:
      break;
  }

  return { combatantPatches: patches, effectDeletes, effectRestores, summary };
}

export function statusAfterUndo(
  hpMax: number,
  wounds: number,
  hpTemp: number,
  nonlethal: number,
  deathState: CombatantView["deathState"],
) {
  return deriveHealthStatus(hpMax, wounds, hpTemp, nonlethal, deathState);
}
