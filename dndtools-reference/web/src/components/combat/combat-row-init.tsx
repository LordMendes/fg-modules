"use client";

import { combatSetInitiative, combatSetActiveCombatant } from "@/actions/combat";
import type { CombatantView } from "@/lib/combat/types";
import { formatModifier } from "@/lib/pc-planner/combatStats";
import { ChevronRight } from "lucide-react";
import { useState, useTransition } from "react";
import { useCombatContext } from "./combat-context";

export function CombatRowInit({
  c,
  isDm,
  canRollOwn,
}: {
  c: CombatantView;
  isDm: boolean;
  canRollOwn: boolean;
}) {
  const ctx = useCombatContext();
  const [pending, startTransition] = useTransition();
  const [editingInit, setEditingInit] = useState(false);
  const [initDraft, setInitDraft] = useState(String(c.init));

  const canEdit = isDm || canRollOwn;

  if (editingInit && isDm) {
    return (
      <input
        className="tool-input tool-input-sm combat-init-input"
        value={initDraft}
        autoFocus
        disabled={pending}
        onChange={(e) => setInitDraft(e.target.value)}
        onBlur={() => {
          setEditingInit(false);
          const n = Number.parseFloat(initDraft);
          if (!Number.isFinite(n) || !ctx) return;
          startTransition(async () => {
            await combatSetInitiative(ctx.campaignId, c.id, n);
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditingInit(false);
        }}
      />
    );
  }

  return (
    <div className="combat-init-cell">
      {c.isCurrentTurn ? (
        <button
          type="button"
          className="combat-init-active-mark"
          title={isDm ? "Set active actor" : "Current actor"}
          aria-current="true"
          disabled={pending || !isDm || !ctx}
          onClick={() => {
            if (!ctx || !isDm) return;
            startTransition(async () => {
              await combatSetActiveCombatant(ctx.campaignId, c.id);
            });
          }}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className="combat-init-btn"
        title={
          isDm
            ? "Click to set, Shift+click to roll"
            : canRollOwn
              ? "Roll initiative"
              : undefined
        }
        disabled={pending || (!isDm && !canRollOwn)}
        onClick={(e) => {
          if (isDm && !e.shiftKey) {
            setInitDraft(String(c.init));
            setEditingInit(true);
            return;
          }
          if (!ctx) return;
          ctx.rollInitiative([c.id], `${c.name} initiative`, c.initMod);
        }}
      >
        {c.init ? c.init.toFixed(1) : formatModifier(c.initMod)}
      </button>
    </div>
  );
}
