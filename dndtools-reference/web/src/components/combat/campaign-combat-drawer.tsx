"use client";

import { combatClearTargets } from "@/actions/combat";
import { CampaignDrawerShell } from "@/components/combat/campaign-drawer-shell";
import { CombatModifierStack } from "@/components/combat/combat-modifier-stack";
import { CombatRow } from "@/components/combat/combat-row";
import { CombatRollRequests } from "@/components/combat/combat-roll-requests";
import { CombatToolbar } from "@/components/combat/combat-toolbar";
import type { CampaignCombatView } from "@/lib/combat/types";
import { Swords } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useCombatContext } from "./combat-context";

function combatSubtitle(combat: CampaignCombatView | null): string {
  if (!combat) return "Idle";
  if (combat.state === "ended") return "Ended";
  if (combat.state !== "active") return "Idle";
  const current = combat.combatants.find((c) => c.isCurrentTurn);
  return current
    ? `Round ${combat.round} · ${current.name}`
    : `Round ${combat.round}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function CampaignCombatDrawer({
  combat,
  isDm,
  viewerPcPlanId,
  campaignId,
  onClose,
  onOpenNpcs,
}: {
  combat: CampaignCombatView | null;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
  onClose: () => void;
  onOpenNpcs?: () => void;
}) {
  const ctx = useCombatContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nextError, setNextError] = useState<string | null>(null);

  const current = combat?.combatants.find((c) => c.isCurrentTurn);
  const unplacedCount =
    combat?.combatants.filter((c) => c.kind === "npc" && !c.tokenId).length ??
    0;

  const viewerCombatant = combat?.combatants.find(
    (c) => c.pcPlanId === viewerPcPlanId,
  );
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (isTypingTarget(e.target)) return;
      if (!isDm || !ctx) return;
      e.preventDefault();
      setNextError(null);
      startTransition(async () => {
        const result = await ctx.nextActor();
        if (!result.success) {
          setNextError(result.error ?? "Could not advance turn");
        }
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDm, ctx]);

  return (
    <CampaignDrawerShell
      title="Combat"
      subtitle={combatSubtitle(combat)}
      icon={<Swords size={18} aria-hidden />}
      onClose={onClose}
      closeLabel="Close combat tracker"
      className="campaign-drawer--combat"
      footer={
        <div className="combat-footer-actions">
          {nextError ? (
            <span className="tool-error combat-footer-error">{nextError}</span>
          ) : null}
          {isDm ? (
            <button
              type="button"
              className="tool-btn combat-footer-next"
              disabled={pending || !combat?.combatants.length || !ctx}
              onClick={() => {
                if (!ctx) return;
                setNextError(null);
                startTransition(async () => {
                  const result = await ctx.nextActor();
                  if (!result.success) {
                    setNextError(result.error ?? "Could not advance turn");
                  }
                });
              }}
            >
              Next actor
            </button>
          ) : (
            <p className="combat-footer-wait">
              {viewerCombatant && viewerCombatant.targetIds.length > 0 ? (
                <span className="combat-ready-indicator">Ready</span>
              ) : null}
              {current
                ? `Waiting for ${current.name}`
                : "Waiting for combat to start"}
            </p>
          )}
          {!isDm && viewerCombatant ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await combatClearTargets(
                    campaignId,
                    "one",
                    viewerCombatant.id,
                  );
                });
              }}
            >
              Clear targets
            </button>
          ) : null}
        </div>
      }
    >
      <CombatToolbar
        combat={combat}
        campaignId={campaignId}
        isDm={isDm}
        unplacedCount={unplacedCount}
      />

      {!combat || combat.combatants.length === 0 ? (
        <div className="combat-empty">
          <p className="campaign-roster-hint">
            {isDm
              ? "Add the party, or open NPCs to add creatures / encounters."
              : "Waiting for combat to start."}
          </p>
          {isDm && onOpenNpcs ? (
            <button type="button" className="tool-btn" onClick={onOpenNpcs}>
              Open NPC library
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="combat-list-header" aria-hidden>
            <span />
            <span />
            <span>Name</span>
            <span />
            <span>Init</span>
            <span>HP</span>
            <span />
          </div>
          <div className="combat-list">
            {combat.combatants.map((c) => (
              <CombatRow
                key={c.id}
                c={c}
                isDm={isDm}
                viewerPcPlanId={viewerPcPlanId}
                campaignId={campaignId}
                expanded={expandedId === c.id}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === c.id ? null : c.id))
                }
              />
            ))}
          </div>
        </>
      )}

      <CombatRollRequests
        campaignId={campaignId}
        isDm={isDm}
        viewerPcPlanId={viewerPcPlanId}
        requests={combat?.rollRequests ?? []}
      />

      <CombatModifierStack />
    </CampaignDrawerShell>
  );
}
