"use client";

import {
  addPartyToCombat,
  combatRemoveCombatant,
  combatSetInitiative,
  combatToggleTarget,
} from "@/actions/combat";
import { CampaignDrawerShell } from "@/components/combat/campaign-drawer-shell";
import { healthStatusLabel } from "@/lib/combat/healthStatus";
import type { CampaignCombatView, CombatantView } from "@/lib/combat/types";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import { formatModifier } from "@/lib/pc-planner/combatStats";
import { ChevronDown, ChevronRight, Swords } from "lucide-react";
import { useState, useTransition } from "react";
import { useCombatContext } from "./combat-context";

function FactionIcon({ faction }: { faction: CombatantView["faction"] }) {
  return (
    <span
      className={`combat-faction combat-faction--${faction}`}
      aria-hidden
    />
  );
}

function HpCell({
  c,
  isDm,
  viewerPcPlanId,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
}) {
  const showExact =
    isDm || (c.kind === "pc" && c.pcPlanId === viewerPcPlanId);
  if (showExact) {
    const cur = c.hpMax - c.wounds + c.hpTemp;
    return (
      <span className="combat-hp-exact">
        {cur}/{c.hpMax}
        {c.hpTemp > 0 ? ` (+${c.hpTemp} temp)` : ""}
      </span>
    );
  }
  return (
    <span className={`combat-hp-status combat-hp-status--${c.status}`}>
      {healthStatusLabel(c.status)}
    </span>
  );
}

function CombatantRow({
  c,
  isDm,
  viewerPcPlanId,
  expanded,
  onToggleExpand,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const ctx = useCombatContext();
  const [pending, startTransition] = useTransition();
  const [editingInit, setEditingInit] = useState(false);
  const [initDraft, setInitDraft] = useState(String(c.init));

  const targets = (ctx?.combat?.combatants ?? []).filter((t) =>
    c.targetIds.includes(t.id),
  );
  const pendingCrit = ctx?.pendingCritFor(c.id) ?? null;

  return (
    <div
      className={`combat-row${c.isCurrentTurn ? " combat-row--active" : ""}${!c.tokenId && c.kind === "npc" ? " combat-row--unplaced" : ""}`}
    >
      <div className="combat-row-main">
        <FactionIcon faction={c.faction} />
        {c.tokenImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="combat-row-token" src={c.tokenImageUrl} alt="" />
        ) : (
          <span className="combat-row-token combat-row-token--blank" />
        )}
        <div className="combat-row-identity">
          <span className="combat-row-name">{c.name}</span>
          {!c.tokenId && c.kind === "npc" ? (
            <span className="combat-row-badge">Unplaced</span>
          ) : null}
        </div>
        {editingInit && isDm ? (
          <input
            className="tool-input tool-input-sm combat-init-input"
            value={initDraft}
            autoFocus
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
        ) : (
          <button
            type="button"
            className="combat-init-btn"
            title={isDm ? "Click to set, Shift+click to roll" : "Roll initiative"}
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
        )}
        <HpCell c={c} isDm={isDm} viewerPcPlanId={viewerPcPlanId} />
        {isDm ? (
          <button
            type="button"
            className="combat-expand-btn"
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : null}
      </div>

      {targets.length > 0 ? (
        <div className="combat-targets">
          {c.isCurrentTurn
            ? targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="combat-target-chip"
                  title="Remove target"
                  onClick={() => {
                    if (!ctx) return;
                    startTransition(async () => {
                      await combatToggleTarget(ctx.campaignId, t.id);
                    });
                  }}
                >
                  {t.name} ×
                </button>
              ))
            : (
              <span>Targets: {targets.map((t) => t.name).join(", ")}</span>
            )}
        </div>
      ) : null}

      {isDm && expanded ? (
        <div className="combat-row-detail">
          <div className="combat-detail-grid">
            <span>AC {c.ac}</span>
            {c.acTouch != null ? <span>Touch {c.acTouch}</span> : null}
            {c.acFlat != null ? <span>FF {c.acFlat}</span> : null}
            <span>
              Space {c.spaceSquares} · Reach {c.reachFeet} ft.
            </span>
            {c.snapshot.speed ? <span>Spd {c.snapshot.speed}</span> : null}
          </div>
          {c.attacks.length > 0 ? (
            <ul className="combat-attacks">
              {c.attacks.map((atk, i) => (
                <li key={`${atk.name}-${i}`} className="combat-attack-line">
                  <button
                    type="button"
                    className="dice-rollable"
                    disabled={pending || !ctx}
                    onClick={() => {
                      if (!ctx) return;
                      const bonuses = atk.iterativeBonuses ?? [atk.bonus];
                      ctx.rollAttack({
                        attackerId: c.id,
                        attackIndex: i,
                        targetIds: c.targetIds,
                        attackType: atk.attackType ?? atk.mode,
                        label: `${c.name} ${atk.name} attack`,
                        bonuses,
                      });
                    }}
                  >
                    {atk.name} {formatModifier(atk.bonus)} {atk.mode}
                  </button>
                  {atk.damage ? (
                    <button
                      type="button"
                      className="dice-rollable combat-dmg-btn"
                      disabled={pending || !ctx}
                      onClick={() => {
                        if (!ctx) return;
                        const parsed = parseDiceNotation(atk.damage);
                        if (!parsed) return;
                        const critForAttack =
                          pendingCrit?.attackName === atk.name ? pendingCrit : null;
                        ctx.rollDamage({
                          attackerId: c.id,
                          attackIndex: i,
                          targetIds: c.pendingTargetIds.length
                            ? c.pendingTargetIds
                            : targets.map((t) => t.id),
                          attackType: atk.attackType ?? atk.mode,
                          label: critForAttack
                            ? `${c.name} ${atk.name} critical damage`
                            : `${c.name} ${atk.name} damage`,
                          dice: parsed.dice,
                          modifier: parsed.modifier,
                          ...(critForAttack
                            ? {
                                crit: true,
                                multiplier: critForAttack.multiplier,
                              }
                            : {}),
                        });
                      }}
                    >
                      {atk.damage}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="combat-row-actions">
            <button
              type="button"
              className="tool-btn tool-btn--ghost tool-btn--danger"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await combatRemoveCombatant(ctx!.campaignId, c.id);
                });
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
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

  return (
    <CampaignDrawerShell
      title="Combat"
      subtitle={
        current
          ? `Round ${combat?.round ?? 1} · ${current.name}`
          : `Ctrl+click tokens to target · Round ${combat?.round ?? 1}`
      }
      icon={<Swords size={18} aria-hidden />}
      onClose={onClose}
      closeLabel="Close combat tracker"
      className="campaign-drawer--combat"
      footer={
        <div className="combat-footer-actions">
          {nextError ? (
            <span className="tool-error combat-footer-error">{nextError}</span>
          ) : null}
          <button
            type="button"
            className="tool-btn"
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
        </div>
      }
    >
      {isDm ? (
        <div className="combat-toolbar">
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await addPartyToCombat(campaignId);
              })
            }
          >
            Add party
          </button>
          {unplacedCount > 0 ? (
            <span className="combat-toolbar-meta">
              {unplacedCount} unplaced (right tray)
            </span>
          ) : null}
        </div>
      ) : null}

      {!combat || combat.combatants.length === 0 ? (
        <div className="combat-empty">
          <p className="campaign-roster-hint">
            {isDm
              ? "Add the party, or open NPCs to add creatures / encounters."
              : "Waiting for combat to start."}
          </p>
          {isDm && onOpenNpcs ? (
            <button
              type="button"
              className="tool-btn"
              onClick={onOpenNpcs}
            >
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
            <span>Init</span>
            <span>HP</span>
            <span />
          </div>
          <div className="combat-list">
            {combat.combatants.map((c) => (
              <CombatantRow
                key={c.id}
                c={c}
                isDm={isDm}
                viewerPcPlanId={viewerPcPlanId}
                expanded={expandedId === c.id}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === c.id ? null : c.id))
                }
              />
            ))}
          </div>
        </>
      )}
    </CampaignDrawerShell>
  );
}
