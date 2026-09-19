"use client";

import {
  combatCreateSaveRequest,
  combatDismissRollRequest,
} from "@/actions/combat";
import { useCombatContext } from "@/components/combat/combat-context";
import { useDice } from "@/components/dice/dice-provider";
import { createRollId } from "@/lib/dice/notation";
import type { CombatRollRequestView } from "@/lib/combat/types";
import { useTransition } from "react";

function saveBonus(combatant: { snapshot: { fort?: number; ref?: number; will?: number } }, saveType: string): number {
  if (saveType === "fort") return combatant.snapshot.fort ?? 0;
  if (saveType === "ref") return combatant.snapshot.ref ?? 0;
  return combatant.snapshot.will ?? 0;
}

export function CombatRollRequests({
  campaignId,
  isDm,
  viewerPcPlanId,
  requests,
}: {
  campaignId: string;
  isDm: boolean;
  viewerPcPlanId: string | null;
  requests: CombatRollRequestView[];
}) {
  const ctx = useCombatContext();
  const { roll } = useDice();
  const [pending, startTransition] = useTransition();

  const viewerRequests = isDm
    ? []
    : requests.filter((r) => {
        const target = ctx?.combat?.combatants.find(
          (c) => c.id === r.targetCombatantId,
        );
        return target?.pcPlanId === viewerPcPlanId;
      });

  if (viewerRequests.length === 0 && (!isDm || requests.length === 0)) {
    return null;
  }

  return (
    <div className="combat-request-stack">
      {viewerRequests.map((req) => {
        const target = ctx?.combat?.combatants.find(
          (c) => c.id === req.targetCombatantId,
        );
        const bonus = target ? saveBonus(target, req.saveType) : 0;
        return (
          <div key={req.id} className="combat-request">
            <span>
              {req.label} · DC {req.dc ?? "?"} · {req.saveType} {bonus >= 0 ? "+" : ""}
              {bonus}
            </span>
            <button
              type="button"
              className="tool-btn tool-btn-primary"
              disabled={pending}
              aria-label={`Roll ${req.saveType} save for ${req.label}`}
              onClick={() => {
                if (!target) return;
                roll({
                  id: createRollId(),
                  label: req.label,
                  dice: [{ qty: 1, sides: 20 }],
                  modifier: bonus,
                  kind: "other",
                  combat: {
                    kind: "save",
                    targetIds: [target.id],
                    saveType: req.saveType,
                    dc: req.dc ?? 0,
                    source: req.label,
                    requestId: req.id,
                  },
                });
              }}
            >
              Roll
            </button>
          </div>
        );
      })}
      {isDm && requests.length > 0 ? (
        <ul className="combat-request-dm-list" aria-label="Pending save requests">
          {requests.map((req) => {
            const target = ctx?.combat?.combatants.find(
              (c) => c.id === req.targetCombatantId,
            );
            const bonus = target ? saveBonus(target, req.saveType) : 0;
            return (
              <li key={req.id} className="combat-request-dm-item">
                <span>{req.label}</span>
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost"
                  disabled={pending}
                  aria-label={`Roll save for ${target?.name ?? "target"}`}
                  onClick={() => {
                    if (!target) return;
                    roll({
                      id: createRollId(),
                      label: req.label,
                      dice: [{ qty: 1, sides: 20 }],
                      modifier: bonus,
                      kind: "other",
                      combat: {
                        kind: "save",
                        targetIds: [target.id],
                        saveType: req.saveType,
                        dc: req.dc ?? 0,
                        source: req.label,
                        requestId: req.id,
                      },
                    });
                  }}
                >
                  Roll for them
                </button>
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost"
                  disabled={pending}
                  aria-label={`Dismiss save request for ${target?.name ?? "target"}`}
                  onClick={() => {
                    startTransition(async () => {
                      await combatDismissRollRequest(campaignId, req.id);
                    });
                  }}
                >
                  Dismiss
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export async function maybeCreateSaveRequest(
  campaignId: string,
  targetCombatantId: string,
  saveType: "fort" | "ref" | "will",
  dc: number,
  label: string,
  askPlayers: boolean,
  isOnlinePc: boolean,
): Promise<"request" | "direct"> {
  if (askPlayers && isOnlinePc) {
    await combatCreateSaveRequest(campaignId, {
      targetCombatantId,
      saveType,
      dc,
      label,
    });
    return "request";
  }
  return "direct";
}
