"use client";

import {
  combatApplyDamage,
  combatToggleTarget,
} from "@/actions/combat";
import type {
  CampaignCombatView,
  CombatantView,
} from "@/lib/combat/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type CombatContextValue = {
  campaignId: string;
  combat: CampaignCombatView | null;
  isDm: boolean;
  viewerPcPlanId: string | null;
  currentActor: CombatantView | null;
  combatantByTokenId: (tokenId: string) => CombatantView | undefined;
  combatantByPcPlanId: (pcPlanId: string) => CombatantView | undefined;
  toggleTarget: (targetCombatantId: string) => Promise<void>;
  applyDamage: (combatantId: string, damage: number) => Promise<void>;
  resolveAttackTotals: (
    attackerPcPlanId: string | null,
    totals: number[],
    label: string,
  ) => { label: string; hits: string[] };
  pendingDamageTargets: CombatantView[];
  setPendingDamageTargets: (targets: CombatantView[]) => void;
};

const CombatContext = createContext<CombatContextValue | null>(null);

export function CombatProvider({
  campaignId,
  combat,
  isDm,
  viewerPcPlanId,
  pendingDamageTargets,
  setPendingDamageTargets,
  children,
}: {
  campaignId: string;
  combat: CampaignCombatView | null;
  isDm: boolean;
  viewerPcPlanId: string | null;
  pendingDamageTargets: CombatantView[];
  setPendingDamageTargets: (targets: CombatantView[]) => void;
  children: ReactNode;
}) {
  const currentActor = useMemo(() => {
    if (!combat?.currentCombatantId) return null;
    return combat.combatants.find((c) => c.id === combat.currentCombatantId) ?? null;
  }, [combat]);

  const combatantByTokenId = useCallback(
    (tokenId: string) =>
      combat?.combatants.find((c) => c.tokenId === tokenId),
    [combat],
  );

  const combatantByPcPlanId = useCallback(
    (pcPlanId: string) =>
      combat?.combatants.find((c) => c.pcPlanId === pcPlanId),
    [combat],
  );

  const toggleTarget = useCallback(
    async (targetCombatantId: string) => {
      await combatToggleTarget(campaignId, targetCombatantId);
    },
    [campaignId],
  );

  const applyDamage = useCallback(
    async (combatantId: string, damage: number) => {
      if (damage <= 0) return;
      await combatApplyDamage(campaignId, combatantId, damage);
    },
    [campaignId],
  );

  const resolveAttackTotals = useCallback(
    (
      attackerPcPlanId: string | null,
      totals: number[],
      label: string,
    ): { label: string; hits: string[] } => {
      const actor = attackerPcPlanId
        ? combat?.combatants.find((c) => c.pcPlanId === attackerPcPlanId)
        : currentActor;
      if (!actor || actor.targetIds.length === 0) {
        return { label, hits: [] };
      }
      const targets = actor.targetIds
        .map((id) => combat?.combatants.find((c) => c.id === id))
        .filter((c): c is CombatantView => Boolean(c));

      const hits: string[] = [];
      for (const total of totals) {
        for (const t of targets) {
          const hit = total >= t.ac;
          hits.push(`${t.name}: ${hit ? "Hit" : "Miss"} (AC ${t.ac})`);
        }
      }
      if (targets.length > 0) {
        setPendingDamageTargets(targets);
      }
      const suffix = hits.length ? ` · ${hits.join("; ")}` : "";
      return { label: `${label}${suffix}`, hits };
    },
    [combat, currentActor, setPendingDamageTargets],
  );

  const value = useMemo(
    (): CombatContextValue => ({
      campaignId,
      combat,
      isDm,
      viewerPcPlanId,
      currentActor,
      combatantByTokenId,
      combatantByPcPlanId,
      toggleTarget,
      applyDamage,
      resolveAttackTotals,
      pendingDamageTargets,
      setPendingDamageTargets,
    }),
    [
      campaignId,
      combat,
      isDm,
      viewerPcPlanId,
      currentActor,
      combatantByTokenId,
      combatantByPcPlanId,
      toggleTarget,
      applyDamage,
      resolveAttackTotals,
      pendingDamageTargets,
      setPendingDamageTargets,
    ],
  );

  return (
    <CombatContext.Provider value={value}>{children}</CombatContext.Provider>
  );
}

export function useCombatContext(): CombatContextValue | null {
  return useContext(CombatContext);
}
