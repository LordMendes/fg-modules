"use client";

import {
  attackTypeBadge,
  formatDefensesSummary,
  formatIterativeBonuses,
  formatThreatRange,
} from "@/components/combat/combat-utils";
import {
  makeDamageDragPayload,
  setCombatDragData,
} from "@/components/combat/combat-roll-drop";
import { useDice } from "@/components/dice/dice-provider";
import { useCombatContext } from "@/components/combat/combat-context";
import { parseDiceNotation } from "@/lib/dice/parseDiceNotation";
import type { CombatantView } from "@/lib/combat/types";
import { formatModifier } from "@/lib/pc-planner/combatStats";
import { CombatRowEffectsSection } from "./combat-row-effects";

function DefenseSection({ c }: { c: CombatantView }) {
  const saves = [
    c.snapshot.fort != null ? `Fort ${formatModifier(c.snapshot.fort)}` : null,
    c.snapshot.ref != null ? `Ref ${formatModifier(c.snapshot.ref)}` : null,
    c.snapshot.will != null ? `Will ${formatModifier(c.snapshot.will)}` : null,
  ].filter(Boolean);

  const defenseParts = formatDefensesSummary(c.defenses);

  return (
    <section className="combat-detail-section">
      <h4 className="combat-detail-heading">Defense</h4>
      <div className="combat-detail-grid">
        <span>AC {c.ac}</span>
        {c.acTouch != null ? <span>T {c.acTouch}</span> : null}
        {c.acFlat != null ? <span>FF {c.acFlat}</span> : null}
        {saves.length > 0 ? <span>{saves.join(" · ")}</span> : null}
        {defenseParts.map((part) => (
          <span key={part}>{part}</span>
        ))}
        <span>
          Space {c.spaceSquares} · Reach {c.reachFeet} ft.
        </span>
        {c.snapshot.speed ? <span>Spd {c.snapshot.speed}</span> : null}
      </div>
    </section>
  );
}

function OffenseSection({ c }: { c: CombatantView }) {
  const ctx = useCombatContext();
  const { rolling: pending } = useDice();
  const targets = (ctx?.combat?.combatants ?? []).filter((t) =>
    c.targetIds.includes(t.id),
  );
  const pendingCrit = ctx?.pendingCritFor(c.id) ?? null;

  if (c.attacks.length === 0) return null;

  return (
    <section className="combat-detail-section">
      <h4 className="combat-detail-heading">Offense</h4>
      <ul className="combat-attacks">
        {c.attacks.map((atk, i) => {
          const bonuses = atk.iterativeBonuses ?? [atk.bonus];
          const attackType = atk.attackType ?? atk.mode;
          const isGrapple = attackType === "grapple";
          const critForAttack =
            pendingCrit?.attackName === atk.name ? pendingCrit : null;
          const threatLabel = formatThreatRange(atk);

          return (
            <li key={`${atk.name}-${i}`} className="combat-attack-line">
              <span className="combat-attack-name">{atk.name}</span>
              <span className="combat-attack-badge" title={attackType}>
                {attackTypeBadge(attackType)}
              </span>
              <span className="combat-attack-bonus">
                {formatIterativeBonuses(bonuses)}
              </span>
              {atk.damage ? (
                <span className="combat-attack-damage">{atk.damage}</span>
              ) : null}
              {threatLabel ? (
                <span className="combat-attack-threat">{threatLabel}</span>
              ) : null}

              <button
                type="button"
                className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"
                disabled={pending || !ctx}
                draggable
                onDragStart={(e) => {
                  if (!ctx) return;
                  setCombatDragData(e, {
                    kind: "attack",
                    attackerId: c.id,
                    attackIndex: i,
                    label: `${c.name} ${atk.name} attack`,
                    bonuses,
                    attackType,
                  });
                }}
                onClick={() => {
                  if (!ctx) return;
                  ctx.rollAttack({
                    attackerId: c.id,
                    attackIndex: i,
                    targetIds: c.targetIds,
                    attackType,
                    label: `${c.name} ${atk.name} attack`,
                    bonuses,
                  });
                }}
              >
                Attack
              </button>

              {critForAttack && !isGrapple ? (
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"
                  disabled={pending || !ctx || targets.length === 0}
                  onClick={() => {
                    if (!ctx || targets.length === 0) return;
                    ctx.rollConfirm({
                      attackerId: c.id,
                      attackIndex: i,
                      targetId: targets[0]!.id,
                      attackType,
                      label: `${c.name} ${atk.name} confirm critical`,
                      bonus: bonuses[0] ?? atk.bonus,
                    });
                  }}
                >
                  Confirm
                </button>
              ) : null}

              {atk.damage && !isGrapple ? (
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost dice-rollable combat-attack-btn"
                  disabled={pending || !ctx}
                  draggable
                  onDragStart={(e) => {
                    const payload = makeDamageDragPayload(
                      c.id,
                      i,
                      critForAttack
                        ? `${c.name} ${atk.name} critical damage`
                        : `${c.name} ${atk.name} damage`,
                      atk.damage,
                      attackType,
                      critForAttack
                        ? { multiplier: critForAttack.multiplier }
                        : undefined,
                    );
                    if (payload) setCombatDragData(e, payload);
                  }}
                  onClick={() => {
                    if (!ctx) return;
                    const parsed = parseDiceNotation(atk.damage);
                    if (!parsed) return;
                    const targetIds = c.pendingTargetIds.length
                      ? c.pendingTargetIds
                      : targets.map((t) => t.id);
                    ctx.rollDamage({
                      attackerId: c.id,
                      attackIndex: i,
                      targetIds,
                      attackType,
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
                  {critForAttack
                    ? `Crit damage x${critForAttack.multiplier}`
                    : "Damage"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CombatRowDetail({
  c,
  isDm,
  viewerPcPlanId,
  campaignId,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
}) {
  const showDefense = isDm || (c.kind === "pc" && c.pcPlanId === viewerPcPlanId);

  return (
    <div className="combat-row-detail">
      {showDefense && (c.ac || c.defenses) ? <DefenseSection c={c} /> : null}
      {(isDm || c.attacks.length > 0) && c.identified ? (
        <OffenseSection c={c} />
      ) : null}
      <CombatRowEffectsSection
        c={c}
        isDm={isDm}
        viewerPcPlanId={viewerPcPlanId}
        campaignId={campaignId}
      />
    </div>
  );
}
