"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PcSpecialAttackDialog } from "@/components/tools/pc-special-attack-dialog";
import { PcSpecialAttacksActions } from "@/components/tools/pc-special-attacks-actions";
import { PcWeaponAttacksList } from "@/components/tools/pc-weapon-attacks-list";
import { abilityModifier, type CombatComputed } from "@/lib/pc-planner/combatStats";
import {
  computeNaturalAttackRows,
  formatSpecialAttackChip,
  syncSpecialAttacksString,
  type SpecialAttackPreviewContext,
} from "@/lib/pc-planner/specialAttacks";
import { isUnarmedStrikeEntry } from "@/lib/pc-planner/unarmedStrike";
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
  stats,
  pcPlanId = null,
  readOnly = false,
}: {
  state: PcPlanState;
  patch: PatchFn;
  stats: CombatComputed;
  pcPlanId?: string | null;
  readOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const entries = (state.combat.specialAttacks ?? []).filter(
    (entry) => !isUnarmedStrikeEntry(entry),
  );
  const naturalRows = useMemo(
    () => computeNaturalAttackRows(state, stats),
    [state, stats],
  );
  const naturalIds = new Set(
    naturalRows.map((row) => row.entryId).filter((id): id is string => Boolean(id)),
  );
  const hiddenNaturals = entries.filter(
    (entry) => entry.kind === "natural" && !naturalIds.has(entry.id),
  );
  const hasSpecials = entries.some((entry) => entry.kind === "special");
  const isEmpty =
    naturalRows.length === 0 && hiddenNaturals.length === 0 && !hasSpecials;

  const previewContext = useMemo((): SpecialAttackPreviewContext => {
    return {
      bab: stats.bab,
      strMod: abilityModifier(state.abilities.str),
      sizeMod: state.combat.sizeMod,
      multiattack: hasMultiattackFeat(state),
    };
  }, [stats.bab, state.abilities.str, state.combat.sizeMod, state.feats]);

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
      <div className="pc-actions-weapons pc-actions-special-attacks">
        <div className="pc-actions-section-head">
          <h4 className="pc-actions-weapons-heading">Special attacks</h4>
          {!readOnly ? (
            <button
              type="button"
              className="pc-class-add-toggle"
              aria-label="Add special attack"
              onClick={() => setDialogOpen(true)}
            >
              <Plus aria-hidden className="pc-class-add-toggle-icon" />
            </button>
          ) : null}
        </div>
        {isEmpty ? (
          <p className="pc-sheet-empty">No special attacks.</p>
        ) : (
          <>
            {naturalRows.map((row) => (
              <div
                key={row.entryId ?? row.name}
                className="pc-actions-removable"
              >
                {!readOnly && row.entryId ? (
                  <button
                    type="button"
                    className="pc-language-chip-remove pc-actions-removable-remove"
                    aria-label={`Remove ${row.name}`}
                    onClick={() => removeEntry(row.entryId!)}
                  >
                    ×
                  </button>
                ) : null}
                <PcWeaponAttacksList weapons={[row]} pcPlanId={pcPlanId} />
              </div>
            ))}
            {hiddenNaturals.map((entry) => (
              <p key={entry.id} className="pc-actions-hidden-natural">
                <span>{formatSpecialAttackChip(entry)}</span>
                {!readOnly ? (
                  <button
                    type="button"
                    className="pc-language-chip-remove"
                    aria-label={`Remove ${entry.name}`}
                    onClick={() => removeEntry(entry.id)}
                  >
                    ×
                  </button>
                ) : null}
              </p>
            ))}
            <PcSpecialAttacksActions state={state} onRemove={readOnly ? undefined : removeEntry} />
          </>
        )}
      </div>
      <PcSpecialAttackDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addEntry}
        previewContext={previewContext}
      />
    </>
  );
}
