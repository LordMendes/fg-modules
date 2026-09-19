"use client";

import { combatComputeEndXp, combatEnd } from "@/actions/combat";
import type { DefeatedNpcXpRow } from "@/lib/combat/combatXp";
import { useEffect, useState, useTransition } from "react";

export function CombatEndDialog({
  campaignId,
  open,
  onClose,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<DefeatedNpcXpRow[]>([]);
  const [partySize, setPartySize] = useState(1);
  const [partyLevel, setPartyLevel] = useState(1);
  const [removeNpcs, setRemoveNpcs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void combatComputeEndXp(campaignId).then((result) => {
      if (result.success) {
        setRows(result.defeated);
        setPartySize(result.partySize);
        setPartyLevel(result.partyLevel);
      }
    });
  }, [campaignId, open]);

  if (!open) return null;

  const selected = rows.filter((r) => r.selected);
  const totalXp = selected.reduce((s, r) => s + r.xpPerPc, 0);
  const perPc = partySize > 0 ? Math.floor(totalXp) : 0;

  return (
    <div className="combat-dialog-backdrop" role="presentation">
      <div
        className="combat-dialog"
        role="dialog"
        aria-labelledby="combat-end-title"
        aria-modal="true"
      >
        <h3 id="combat-end-title">End combat</h3>
        <p className="campaign-roster-hint">
          Party level {partyLevel}, {partySize} PC{partySize !== 1 ? "s" : ""}
        </p>
        {rows.length === 0 ? (
          <p className="campaign-roster-hint">No defeated NPCs in combat.</p>
        ) : (
          <ul className="combat-end-defeated">
            {rows.map((row) => (
              <li key={row.combatantId}>
                <label>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => {
                      setRows((prev) =>
                        prev.map((r) =>
                          r.combatantId === row.combatantId
                            ? { ...r, selected: e.target.checked }
                            : r,
                        ),
                      );
                    }}
                  />
                  {row.name}
                  {row.crLabel ? ` (CR ${row.crLabel})` : ""}
                  {" · "}
                  {row.xpPerPc} XP/PC
                </label>
              </li>
            ))}
          </ul>
        )}
        <p>
          Total {totalXp} XP · {perPc} per PC
        </p>
        <label className="combat-end-option">
          <input
            type="checkbox"
            checked={removeNpcs}
            onChange={(e) => setRemoveNpcs(e.target.checked)}
          />
          Remove all NPCs from combat
        </label>
        {error ? <p className="tool-error">{error}</p> : null}
        <div className="combat-dialog-actions">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await combatEnd(campaignId, {
                  awardXp: selected.length > 0,
                  selectedNpcIds: selected.map((r) => r.combatantId),
                  removeAllNpcs: removeNpcs,
                });
                if (!result.success) {
                  setError(result.error ?? "Could not end combat");
                  return;
                }
                onClose();
              });
            }}
          >
            End without XP
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            disabled={pending || selected.length === 0}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await combatEnd(campaignId, {
                  awardXp: true,
                  selectedNpcIds: selected.map((r) => r.combatantId),
                  removeAllNpcs: removeNpcs,
                });
                if (!result.success) {
                  setError(result.error ?? "Could not end combat");
                  return;
                }
                onClose();
              });
            }}
          >
            Award to party
          </button>
        </div>
      </div>
    </div>
  );
}
