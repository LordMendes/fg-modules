"use client";

import { useMemo, useState } from "react";
import { DraggableDialog } from "@/components/draggable-dialog";
import {
  createDefenseId,
  DEFENSE_ENERGY_OPTIONS,
  formatDefenseBadge,
} from "@/lib/pc-planner/pcDefenses";
import type { PcDefenseEntry, PcDefenseKind } from "@/lib/pc-planner/types";

const KIND_OPTIONS: { value: PcDefenseKind; label: string }[] = [
  { value: "dr", label: "Damage Reduction" },
  { value: "resistance", label: "Energy Resistance" },
  { value: "immunity", label: "Immunity" },
  { value: "vulnerability", label: "Vulnerability" },
];

export function PcDefenseDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: PcDefenseEntry) => void;
}) {
  const [kind, setKind] = useState<PcDefenseKind>("dr");
  const [amount, setAmount] = useState("2");
  const [bypass, setBypass] = useState("-");
  const [subject, setSubject] = useState("fire");
  const [energy, setEnergy] = useState<(typeof DEFENSE_ENERGY_OPTIONS)[number]>("fire");

  const draft: PcDefenseEntry = useMemo(() => {
    if (kind === "dr") {
      return {
        id: "preview",
        kind: "dr",
        amount: Number.parseInt(amount, 10) || 0,
        bypass: bypass.trim() || "-",
        source: "custom",
      };
    }
    if (kind === "resistance") {
      return {
        id: "preview",
        kind: "resistance",
        subject: energy,
        amount: Number.parseInt(amount, 10) || 0,
        source: "custom",
      };
    }
    return {
      id: "preview",
      kind,
      subject: subject.trim() || "unknown",
      source: "custom",
    };
  }, [kind, amount, bypass, subject, energy]);

  const preview = formatDefenseBadge(draft);
  const canAdd =
    kind === "dr"
      ? Number.isFinite(Number.parseInt(amount, 10))
      : kind === "resistance"
        ? Number.isFinite(Number.parseInt(amount, 10))
        : subject.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      ...draft,
      id: createDefenseId(),
    });
    onClose();
  }

  return (
    <DraggableDialog
      open={open}
      title="Add defense"
      onClose={onClose}
      panelClassName="pc-defense-dialog"
    >
      <div className="pc-defense-dialog-body">
        <label className="pc-identity-field">
          <span className="npc-sheet-sub">Type</span>
          <select
            className="pc-sheet-input"
            value={kind}
            onChange={(e) => setKind(e.target.value as PcDefenseKind)}
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {kind === "dr" ? (
          <div className="pc-defense-dialog-fields">
            <label className="pc-identity-field">
              <span className="npc-sheet-sub">Amount</span>
              <input
                type="number"
                className="pc-sheet-input pc-sheet-input--narrow"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="pc-identity-field">
              <span className="npc-sheet-sub">Bypassed by</span>
              <input
                type="text"
                className="pc-sheet-input"
                value={bypass}
                placeholder="-"
                onChange={(e) => setBypass(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {kind === "resistance" ? (
          <div className="pc-defense-dialog-fields">
            <label className="pc-identity-field">
              <span className="npc-sheet-sub">Energy</span>
              <select
                className="pc-sheet-input"
                value={energy}
                onChange={(e) =>
                  setEnergy(e.target.value as (typeof DEFENSE_ENERGY_OPTIONS)[number])
                }
              >
                {DEFENSE_ENERGY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="pc-identity-field">
              <span className="npc-sheet-sub">Amount</span>
              <input
                type="number"
                className="pc-sheet-input pc-sheet-input--narrow"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {kind === "immunity" || kind === "vulnerability" ? (
          <label className="pc-identity-field">
            <span className="npc-sheet-sub">
              {kind === "immunity" ? "Immune to" : "Vulnerable to"}
            </span>
            <input
              type="text"
              className="pc-sheet-input"
              value={subject}
              placeholder={kind === "immunity" ? "sleep" : "fire"}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
        ) : null}

        <p className="pc-defense-dialog-preview">
          <span className="npc-sheet-sub">Preview</span>
          <span className="pc-language-chip pc-defense-badge">{preview}</span>
        </p>

        <div className="pc-defense-dialog-actions">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={!canAdd}
            onClick={handleAdd}
          >
            Add
          </button>
        </div>
      </div>
    </DraggableDialog>
  );
}
