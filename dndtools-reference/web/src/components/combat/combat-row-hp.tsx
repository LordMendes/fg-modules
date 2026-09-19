"use client";

import {
  combatApplyDamage,
  combatApplyHeal,
  combatApplyNonlethal,
  combatApplyTempHp,
  combatSetHp,
} from "@/actions/combat";
import { canEditHp } from "@/components/combat/combat-utils";
import { healthStatusLabel } from "@/lib/combat/healthStatus";
import type { CombatantView, DamageType } from "@/lib/combat/types";
import { useEffect, useRef, useState, useTransition } from "react";

const DAMAGE_TYPES: DamageType[] = [
  "untyped",
  "slashing",
  "piercing",
  "bludgeoning",
  "fire",
  "cold",
  "acid",
  "electricity",
  "sonic",
  "force",
  "positive",
  "negative",
  "magic",
];

function HpDisplay({
  c,
  showExact,
}: {
  c: CombatantView;
  showExact: boolean;
}) {
  if (showExact) {
    const cur = c.hpMax - c.wounds + c.hpTemp;
    return (
      <span className="combat-hp-exact">
        {cur}/{c.hpMax}
        {c.hpTemp > 0 ? ` (+${c.hpTemp})` : ""}
        {c.nonlethal > 0 ? (
          <span className="combat-hp-nl"> NL {c.nonlethal}</span>
        ) : null}
      </span>
    );
  }
  return (
    <span className={`combat-hp-status combat-hp-status--${c.status}`}>
      {healthStatusLabel(c.status)}
    </span>
  );
}

function HpEditor({
  c,
  campaignId,
  isDm,
  onClose,
}: {
  c: CombatantView;
  campaignId: string;
  isDm: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [damageAmt, setDamageAmt] = useState("5");
  const [damageType, setDamageType] = useState<DamageType>("untyped");
  const [healAmt, setHealAmt] = useState("3");
  const [tempAmt, setTempAmt] = useState("8");
  const [nlAmt, setNlAmt] = useState("2");
  const [setAmt, setSetAmt] = useState(String(c.hpCurrent));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      onClose();
    });
  }

  return (
    <div className="combat-hp-editor" ref={ref} role="dialog" aria-label="HP editor">
      <div className="combat-hp-editor-row">
        <label className="combat-hp-editor-label">Damage</label>
        <input
          className="tool-input tool-input-sm"
          type="number"
          min={0}
          value={damageAmt}
          onChange={(e) => setDamageAmt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = Number.parseInt(damageAmt, 10);
              if (Number.isFinite(n) && n >= 0) {
                run(() =>
                  combatApplyDamage(campaignId, c.id, {
                    amount: n,
                    types: [damageType],
                  }),
                );
              }
            }
          }}
        />
        <select
          className="tool-select combat-hp-type-select"
          value={damageType}
          onChange={(e) => setDamageType(e.target.value as DamageType)}
        >
          {DAMAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="tool-btn tool-btn--ghost"
          disabled={pending}
          onClick={() => {
            const n = Number.parseInt(damageAmt, 10);
            if (!Number.isFinite(n) || n < 0) return;
            run(() =>
              combatApplyDamage(campaignId, c.id, {
                amount: n,
                types: [damageType],
              }),
            );
          }}
        >
          Apply
        </button>
      </div>

      <div className="combat-hp-editor-row">
        <label className="combat-hp-editor-label">Heal</label>
        <input
          className="tool-input tool-input-sm"
          type="number"
          min={0}
          value={healAmt}
          onChange={(e) => setHealAmt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = Number.parseInt(healAmt, 10);
              if (Number.isFinite(n) && n >= 0) {
                run(() => combatApplyHeal(campaignId, c.id, n));
              }
            }
          }}
        />
        <button
          type="button"
          className="tool-btn tool-btn--ghost"
          disabled={pending}
          onClick={() => {
            const n = Number.parseInt(healAmt, 10);
            if (!Number.isFinite(n) || n < 0) return;
            run(() => combatApplyHeal(campaignId, c.id, n));
          }}
        >
          Apply
        </button>
      </div>

      <div className="combat-hp-editor-row">
        <label className="combat-hp-editor-label">Temp</label>
        <input
          className="tool-input tool-input-sm"
          type="number"
          min={0}
          value={tempAmt}
          onChange={(e) => setTempAmt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = Number.parseInt(tempAmt, 10);
              if (Number.isFinite(n) && n >= 0) {
                run(() => combatApplyTempHp(campaignId, c.id, n));
              }
            }
          }}
        />
        <button
          type="button"
          className="tool-btn tool-btn--ghost"
          disabled={pending}
          onClick={() => {
            const n = Number.parseInt(tempAmt, 10);
            if (!Number.isFinite(n) || n < 0) return;
            run(() => combatApplyTempHp(campaignId, c.id, n));
          }}
        >
          Apply
        </button>
      </div>

      {isDm ? (
        <>
          <div className="combat-hp-editor-row">
            <label className="combat-hp-editor-label">Nonlethal</label>
            <input
              className="tool-input tool-input-sm"
              type="number"
              min={0}
              value={nlAmt}
              onChange={(e) => setNlAmt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number.parseInt(nlAmt, 10);
                  if (Number.isFinite(n) && n >= 0) {
                    run(() => combatApplyNonlethal(campaignId, c.id, n));
                  }
                }
              }}
            />
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              disabled={pending}
              onClick={() => {
                const n = Number.parseInt(nlAmt, 10);
                if (!Number.isFinite(n) || n < 0) return;
                run(() => combatApplyNonlethal(campaignId, c.id, n));
              }}
            >
              Apply
            </button>
          </div>

          <div className="combat-hp-editor-row">
            <label className="combat-hp-editor-label">Set</label>
            <input
              className="tool-input tool-input-sm"
              type="number"
              min={0}
              value={setAmt}
              onChange={(e) => setSetAmt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Number.parseInt(setAmt, 10);
                  if (Number.isFinite(n) && n >= 0) {
                    run(() => combatSetHp(campaignId, c.id, n));
                  }
                }
              }}
            />
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              disabled={pending}
              onClick={() => {
                const n = Number.parseInt(setAmt, 10);
                if (!Number.isFinite(n) || n < 0) return;
                run(() => combatSetHp(campaignId, c.id, n));
              }}
            >
              Apply
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CombatRowHp({
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
  const [open, setOpen] = useState(false);
  const showExact = isDm || (c.kind === "pc" && c.pcPlanId === viewerPcPlanId);
  const editable = canEditHp(c, isDm, viewerPcPlanId);

  return (
    <div className="combat-hp-cell">
      {editable ? (
        <button
          type="button"
          className="combat-hp-btn"
          title="Edit HP"
          onClick={() => setOpen((v) => !v)}
        >
          <HpDisplay c={c} showExact={showExact} />
        </button>
      ) : (
        <HpDisplay c={c} showExact={showExact} />
      )}
      {open && editable ? (
        <HpEditor
          c={c}
          campaignId={campaignId}
          isDm={isDm}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
