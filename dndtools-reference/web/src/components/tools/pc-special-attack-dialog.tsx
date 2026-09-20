"use client";

import { useEffect, useMemo, useState } from "react";
import { DraggableDialog } from "@/components/draggable-dialog";
import {
  entryFromTemplate,
  filterSpecialAttackCatalog,
  type SpecialAttackTemplate,
} from "@/lib/pc-planner/specialAttackCatalog";
import {
  createSpecialAttackId,
  formatSpecialAttackPreview,
  type SpecialAttackPreviewContext,
} from "@/lib/pc-planner/specialAttacks";
import type {
  PcSpecialAttackEntry,
  PcSpecialAttackKind,
  PcSpecialAttackSaveType,
} from "@/lib/pc-planner/types";

const SAVE_OPTIONS: { value: "" | PcSpecialAttackSaveType; label: string }[] = [
  { value: "", label: "None" },
  { value: "fort", label: "Fortitude" },
  { value: "ref", label: "Reflex" },
  { value: "will", label: "Will" },
];

function blankDraft(): PcSpecialAttackEntry {
  return {
    id: "preview",
    kind: "natural",
    templateId: "custom",
    name: "",
    count: 1,
    primary: true,
    damageM: "1d6",
    damageS: "1d4",
    damageType: "Bludgeoning",
    critical: "x2",
    attackMisc: 0,
    damageMisc: 0,
    saveDc: null,
    saveType: null,
    notes: "",
  };
}

function draftFromTemplate(template: SpecialAttackTemplate): PcSpecialAttackEntry {
  return {
    ...entryFromTemplate(template, "preview"),
    kind: template.id === "custom" ? "natural" : template.kind,
  };
}

export function PcSpecialAttackDialog({
  open,
  onClose,
  onAdd,
  previewContext = null,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (entry: PcSpecialAttackEntry) => void;
  previewContext?: SpecialAttackPreviewContext | null;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PcSpecialAttackEntry>(blankDraft);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedId(null);
    setDraft(blankDraft());
  }, [open]);

  const catalog = useMemo(() => filterSpecialAttackCatalog(query), [query]);

  function selectTemplate(template: SpecialAttackTemplate) {
    setSelectedId(template.id);
    setDraft(draftFromTemplate(template));
  }

  function patchDraft(partial: Partial<PcSpecialAttackEntry>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  const preview = formatSpecialAttackPreview(draft, previewContext);
  const canAdd = draft.name.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      ...draft,
      id: createSpecialAttackId(),
      name: draft.name.trim(),
      count: Math.max(1, draft.count || 1),
      notes: draft.notes?.trim() ?? "",
    });
    onClose();
  }

  const showSaveFields = draft.kind === "special";

  return (
    <DraggableDialog
      open={open}
      title="Add special attack"
      onClose={onClose}
      panelClassName="pc-special-attack-dialog"
    >
      <div className="pc-special-attack-dialog-body">
        <label className="pc-identity-field">
          <span className="npc-sheet-sub">Catalog</span>
          <input
            type="search"
            className="pc-sheet-input"
            value={query}
            placeholder="Filter natural or special…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <ul className="pc-special-attack-catalog" aria-label="Attack templates">
          {catalog.map((template) => {
            const active = selectedId === template.id;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  className={[
                    "pc-special-attack-catalog-item",
                    active ? "pc-special-attack-catalog-item--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectTemplate(template)}
                >
                  <span className="pc-special-attack-catalog-name">
                    {template.name}
                    <span className="npc-sheet-sub">
                      {" "}
                      · {template.kind === "natural" ? "natural" : "special"}
                    </span>
                  </span>
                  <span className="npc-sheet-sub pc-special-attack-catalog-blurb">
                    {template.blurb}
                    {template.damageM ? ` (${template.damageM})` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {selectedId ? (
          <>
            <div className="pc-special-attack-dialog-fields">
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Name</span>
                <input
                  type="text"
                  className="pc-sheet-input"
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Kind</span>
                <select
                  className="pc-sheet-input"
                  value={draft.kind}
                  onChange={(e) =>
                    patchDraft({ kind: e.target.value as PcSpecialAttackKind })
                  }
                >
                  <option value="natural">Natural (rollable)</option>
                  <option value="special">Special (notes / DC)</option>
                </select>
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Count</span>
                <input
                  type="number"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  min={1}
                  value={draft.count}
                  onChange={(e) =>
                    patchDraft({
                      count: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Role</span>
                <select
                  className="pc-sheet-input"
                  value={draft.primary ? "primary" : "secondary"}
                  onChange={(e) =>
                    patchDraft({ primary: e.target.value === "primary" })
                  }
                >
                  <option value="primary">Primary (full Str)</option>
                  <option value="secondary">Secondary (-5 / ½ Str)</option>
                </select>
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Damage (M)</span>
                <input
                  type="text"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  value={draft.damageM}
                  placeholder="1d6"
                  onChange={(e) => patchDraft({ damageM: e.target.value })}
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Damage (S)</span>
                <input
                  type="text"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  value={draft.damageS}
                  placeholder="1d4"
                  onChange={(e) => patchDraft({ damageS: e.target.value })}
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Type</span>
                <input
                  type="text"
                  className="pc-sheet-input"
                  value={draft.damageType}
                  placeholder="Piercing"
                  onChange={(e) => patchDraft({ damageType: e.target.value })}
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Critical</span>
                <input
                  type="text"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  value={draft.critical ?? ""}
                  placeholder="x2"
                  onChange={(e) =>
                    patchDraft({ critical: e.target.value.trim() || null })
                  }
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Attack misc</span>
                <input
                  type="number"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  value={draft.attackMisc ?? 0}
                  onChange={(e) =>
                    patchDraft({
                      attackMisc: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </label>
              <label className="pc-identity-field">
                <span className="npc-sheet-sub">Damage misc</span>
                <input
                  type="number"
                  className="pc-sheet-input pc-sheet-input--narrow"
                  value={draft.damageMisc ?? 0}
                  onChange={(e) =>
                    patchDraft({
                      damageMisc: Number.parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </label>
              {showSaveFields ? (
                <>
                  <label className="pc-identity-field">
                    <span className="npc-sheet-sub">Save DC</span>
                    <input
                      type="number"
                      className="pc-sheet-input pc-sheet-input--narrow"
                      value={draft.saveDc ?? ""}
                      placeholder=""
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        patchDraft({
                          saveDc: raw === "" ? null : Number.parseInt(raw, 10) || 0,
                        });
                      }}
                    />
                  </label>
                  <label className="pc-identity-field">
                    <span className="npc-sheet-sub">Save</span>
                    <select
                      className="pc-sheet-input"
                      value={draft.saveType ?? ""}
                      onChange={(e) => {
                        const v = e.target.value as "" | PcSpecialAttackSaveType;
                        patchDraft({ saveType: v === "" ? null : v });
                      }}
                    >
                      {SAVE_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            <label className="pc-identity-field">
              <span className="npc-sheet-sub">Notes</span>
              <textarea
                className="pc-sheet-input pc-sheet-textarea"
                rows={2}
                value={draft.notes ?? ""}
                onChange={(e) => patchDraft({ notes: e.target.value })}
              />
            </label>

            <p className="pc-special-attack-dialog-preview">
              <span className="npc-sheet-sub">Preview</span>
              <span className="pc-language-chip pc-special-attack-chip">{preview}</span>
            </p>
          </>
        ) : (
          <p className="pc-sheet-empty">
            Pick a template above, or Custom, then edit fields before adding.
          </p>
        )}

        <div className="pc-special-attack-dialog-actions">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn"
            disabled={!canAdd || !selectedId}
            onClick={handleAdd}
          >
            Add
          </button>
        </div>
      </div>
    </DraggableDialog>
  );
}
