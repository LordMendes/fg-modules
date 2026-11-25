"use client";

import { useEffect } from "react";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import {
  FEAT_ASSET_SCHOOLS,
  type FeatAssetSpec,
} from "@/lib/pc-planner/featAsset";
import { weaponChoiceOptions } from "@/lib/pc-planner/weaponFeatBonuses";
import type { InventoryRow } from "@/lib/pc-planner/types";

type FeatAssetDialogProps = {
  featName: string;
  spec: FeatAssetSpec;
  value: string;
  inventory: InventoryRow[];
  onPick: (value: string) => void;
  onClose: () => void;
};

export function FeatAssetDialog({
  featName,
  spec,
  value,
  inventory,
  onPick,
  onClose,
}: FeatAssetDialogProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picks =
    spec.kind === "weapon" ? weaponPicks(inventory) : [];
  const current = value.trim().toLowerCase();

  return (
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="confirm-dialog-panel pc-feat-asset-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-feat-asset-title"
      >
        <h3 id="pc-feat-asset-title">{featName}</h3>
        <p className="pc-feat-asset-prompt">{spec.prompt}</p>
        {spec.kind === "school" ? (
          <ul className="pc-feat-asset-picks">
            {FEAT_ASSET_SCHOOLS.map((school) => (
              <li key={school}>
                <button
                  type="button"
                  className={
                    current === school.toLowerCase()
                      ? "pc-feat-asset-pick is-selected"
                      : "pc-feat-asset-pick"
                  }
                  aria-pressed={current === school.toLowerCase()}
                  onClick={() => onPick(school)}
                >
                  {school}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {picks.length > 0 ? (
              <ul className="pc-feat-asset-picks">
                {picks.map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      className={
                        current === label.toLowerCase()
                          ? "pc-feat-asset-pick is-selected"
                          : "pc-feat-asset-pick"
                      }
                      aria-pressed={current === label.toLowerCase()}
                      onClick={() => onPick(label)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {spec.categories ? (
              <EntitySearchCombobox
                categories={spec.categories}
                fields={spec.fields}
                placeholder={spec.placeholder}
                label={spec.placeholder}
                className="pc-feat-asset-search"
                onSelect={(hit) => onPick(hit.name)}
              />
            ) : null}
          </>
        )}
        <div className="confirm-dialog-actions">
          {value.trim() ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              onClick={() => onPick("")}
            >
              Clear
            </button>
          ) : null}
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function weaponPicks(inventory: InventoryRow[]): string[] {
  const labels = weaponChoiceOptions(inventory).map((option) => option.label);
  const hasUnarmed = labels.some((label) => label.toLowerCase() === "unarmed strike");
  return hasUnarmed ? labels : ["Unarmed strike", ...labels];
}
