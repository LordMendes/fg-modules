"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PcSpecialAttackDialog } from "@/components/tools/pc-special-attack-dialog";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { abilityModifier } from "@/lib/pc-planner/combatStats";
import {
  formatSpecialAttackChip,
  formatSpecialAttacksString,
  syncSpecialAttacksString,
  type SpecialAttackPreviewContext,
} from "@/lib/pc-planner/specialAttacks";
import type { PcPlanState, PcSpecialAttackEntry } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

function hasMultiattackFeat(state: PcPlanState): boolean {
  return (state.feats ?? []).some((feat) => {
    const name = feat.name.trim().toLowerCase();
    const slug = feat.slug.toLowerCase();
    return (
      name === "multiattack" ||
      slug === "multiattack" ||
      slug.startsWith("multiattack-")
    );
  });
}

function applySpecialAttacks(
  patch: PatchFn,
  entries: PcSpecialAttackEntry[],
) {
  patch((s) => {
    s.combat.specialAttacks = entries;
    s.combat.attacks = syncSpecialAttacksString(entries);
  });
}

export function PcSpecialAttacksBlock({
  state,
  patch,
  bab = 0,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  /** Character BAB for dialog preview (from computeCombatStats). */
  bab?: number;
  readOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const entries = state.combat.specialAttacks ?? [];

  const previewContext = useMemo((): SpecialAttackPreviewContext => {
    return {
      bab,
      strMod: abilityModifier(state.abilities.str),
      sizeMod: state.combat.sizeMod,
      multiattack: hasMultiattackFeat(state),
    };
  }, [bab, state.abilities.str, state.combat.sizeMod, state.feats]);

  function addEntry(entry: PcSpecialAttackEntry) {
    applySpecialAttacks(patch, [...entries, entry]);
  }

  function removeEntry(id: string) {
    applySpecialAttacks(
      patch,
      entries.filter((e) => e.id !== id),
    );
  }

  return (
    <>
      <PcSheetCard
        title="Special attacks"
        className="pc-combat-attacks-card"
        actions={
          !readOnly ? (
            <button
              type="button"
              className="pc-class-add-toggle"
              aria-label="Add special attack"
              onClick={() => setDialogOpen(true)}
            >
              <Plus aria-hidden className="pc-class-add-toggle-icon" />
            </button>
          ) : null
        }
      >
        <div className="pc-special-attacks-body">
          {entries.length > 0 ? (
            <ul
              className="pc-language-list pc-special-attacks-list"
              aria-label="Special attacks"
            >
              {entries.map((entry) => (
                <li key={entry.id}>
                  <span
                    className="pc-language-chip pc-special-attack-chip"
                    title={formatSpecialAttacksString([entry])}
                  >
                    {formatSpecialAttackChip(entry)}
                    {!readOnly ? (
                      <button
                        type="button"
                        className="pc-language-chip-remove"
                        aria-label={`Remove ${formatSpecialAttackChip(entry)}`}
                        onClick={() => removeEntry(entry.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pc-sheet-empty pc-special-attacks-empty">
              No special attacks yet.
            </p>
          )}
        </div>
      </PcSheetCard>
      <PcSpecialAttackDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addEntry}
        previewContext={previewContext}
      />
    </>
  );
}
