"use client";

import {
  combatActNow,
  combatDelayCombatant,
  combatReadyCombatant,
  combatRemoveCombatant,
  combatSetCombatantFlags,
  combatToggleTarget,
} from "@/actions/combat";
import {
  canExpandRow,
  isDeadRow,
  isOwnPc,
  nextFaction,
} from "@/components/combat/combat-utils";
import {
  isCombatDragEvent,
  readCombatDragPayload,
  resolveCombatDrop,
} from "@/components/combat/combat-roll-drop";
import type { CombatantView } from "@/lib/combat/types";
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useCombatContext } from "./combat-context";
import { CombatRowDetail } from "./combat-row-detail";
import { CombatRowEffectsStrip } from "./combat-row-effects";
import { CombatRowHp } from "./combat-row-hp";
import { CombatRowInit } from "./combat-row-init";

function FactionIcon({
  faction,
  onClick,
}: {
  faction: CombatantView["faction"];
  onClick?: () => void;
}) {
  const inner = (
    <span
      className={`combat-faction combat-faction--${faction}`}
      aria-hidden
    />
  );
  if (!onClick) return inner;
  return (
    <button
      type="button"
      className="combat-faction-btn"
      title="Cycle faction"
      onClick={onClick}
    >
      {inner}
    </button>
  );
}

export function CombatRow({
  c,
  isDm,
  viewerPcPlanId,
  campaignId,
  expanded,
  onToggleExpand,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const ctx = useCombatContext();
  const [pending, startTransition] = useTransition();
  const [dropOver, setDropOver] = useState(false);

  const dead = isDeadRow(c);
  const expandable = canExpandRow(c, isDm, viewerPcPlanId);
  const currentActor = ctx?.currentActor;
  const canTarget =
    ctx &&
    (isDm ||
      (currentActor != null &&
        viewerPcPlanId != null &&
        currentActor.pcPlanId === viewerPcPlanId));
  const isTargeted = currentActor?.targetIds.includes(c.id) ?? false;
  const showCrosshair =
    canTarget && currentActor?.id !== c.id && !dead;

  const rowFlash = ctx?.rowFlashes[c.id];
  const focused = ctx?.focusedRowIds.includes(c.id);

  const targets = (ctx?.combat?.combatants ?? []).filter((t) =>
    c.targetIds.includes(t.id),
  );

  return (
    <div
      className={[
        "combat-row",
        c.isCurrentTurn ? "combat-row--active" : "",
        !c.tokenId && c.kind === "npc" ? "combat-row--unplaced" : "",
        dead ? "combat-row--dead" : "",
        dropOver ? "combat-row--drop" : "",
        rowFlash ? `combat-row--${rowFlash}` : "",
        focused ? "combat-row--focus" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={(e) => {
        if (!isCombatDragEvent(e)) return;
        e.preventDefault();
        setDropOver(true);
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={(e) => {
        setDropOver(false);
        if (!ctx) return;
        const payload = readCombatDragPayload(e);
        if (!payload) return;
        e.preventDefault();
        resolveCombatDrop(ctx, payload, c.id);
      }}
    >
      <div className="combat-row-main">
        <FactionIcon
          faction={c.faction}
          onClick={
            isDm
              ? () => {
                  startTransition(async () => {
                    await combatSetCombatantFlags(campaignId, c.id, {
                      faction: nextFaction(c.faction),
                    });
                  });
                }
              : undefined
          }
        />
        {c.tokenImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="combat-row-token" src={c.tokenImageUrl} alt="" />
        ) : (
          <span className="combat-row-token combat-row-token--blank" />
        )}
        <div className="combat-row-identity">
          <span className="combat-row-name">{c.name}</span>
          <CombatRowEffectsStrip
            c={c}
            isDm={isDm}
            viewerPcPlanId={viewerPcPlanId}
            campaignId={campaignId}
          />
          <div className="combat-status-badges">
            {c.turnState === "delayed" ? (
              <span className="combat-row-badge">Delayed</span>
            ) : null}
            {c.turnState === "readied" ? (
              <span className="combat-row-badge">Readied</span>
            ) : null}
            {!c.tokenId && c.kind === "npc" ? (
              <span className="combat-row-badge">Unplaced</span>
            ) : null}
            {isDm && !c.visibleToPlayers ? (
              <span className="combat-row-badge combat-row-badge--icon" title="Hidden from players">
                <EyeOff size={12} aria-hidden />
                Hidden
              </span>
            ) : null}
            {isDm && !c.identified ? (
              <span className="combat-row-badge combat-row-badge--icon" title="Unidentified">
                <HelpCircle size={12} aria-hidden />
                Unidentified
              </span>
            ) : null}
          </div>
        </div>

        {showCrosshair ? (
          <button
            type="button"
            className={`combat-target-toggle${isTargeted ? " combat-target-toggle--on" : ""}`}
            title={isTargeted ? "Remove target" : "Add target"}
            onClick={() => {
              startTransition(async () => {
                await combatToggleTarget(campaignId, c.id);
              });
            }}
          >
            <Crosshair size={16} aria-hidden />
          </button>
        ) : (
          <span className="combat-target-spacer" aria-hidden />
        )}

        <CombatRowInit
          c={c}
          isDm={isDm}
          canRollOwn={isOwnPc(c, viewerPcPlanId)}
        />
        <CombatRowHp
          c={c}
          isDm={isDm}
          viewerPcPlanId={viewerPcPlanId}
          campaignId={campaignId}
        />
        {expandable ? (
          <button
            type="button"
            className="combat-expand-btn"
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="combat-expand-spacer" aria-hidden />
        )}
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
                    startTransition(async () => {
                      await combatToggleTarget(campaignId, t.id);
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

      {expanded && expandable ? (
        <>
          <CombatRowDetail
            c={c}
            isDm={isDm}
            viewerPcPlanId={viewerPcPlanId}
            campaignId={campaignId}
          />
          {isDm || isOwnPc(c, viewerPcPlanId) ? (
            <div className="combat-row-actions">
              {isDm ? (
                <>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost tool-btn--danger"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await combatRemoveCombatant(campaignId, c.id);
                      });
                    }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await combatSetCombatantFlags(campaignId, c.id, {
                          visibleToPlayers: !c.visibleToPlayers,
                        });
                      });
                    }}
                  >
                    {c.visibleToPlayers ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await combatSetCombatantFlags(campaignId, c.id, {
                          identified: !c.identified,
                        });
                      });
                    }}
                  >
                    {c.identified ? "Mask" : "Identify"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await combatDelayCombatant(campaignId, c.id);
                  });
                }}
              >
                Delay
              </button>
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await combatReadyCombatant(campaignId, c.id);
                  });
                }}
              >
                Ready
              </button>
              {c.turnState === "delayed" || c.turnState === "readied" ? (
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await combatActNow(campaignId, c.id);
                    });
                  }}
                >
                  Act now
                </button>
              ) : null}
              {c.deathState === "dying" && (isDm || isOwnPc(c, viewerPcPlanId)) ? (
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost dice-rollable"
                  disabled={pending || !ctx}
                  onClick={() => {
                    ctx?.rollStabilize(c.id, `${c.name} stabilize check`);
                  }}
                >
                  Stabilize
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
