"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fetchClassSpellsAtLevel, fetchSpellPreview } from "@/actions/data";
import { DraggableDialog } from "@/components/draggable-dialog";
import { SpellCastDetailsView } from "@/components/tools/spell-cast-details-view";
import { useSessionNonce } from "@/components/session-provider";
import type { ClassSpellRef, SpellPreview } from "@/lib/entities";
import {
  getSpellCastDetailsFromFields,
  getSpellCastDetailsFromSrd,
  hasSpellCastDetails,
  mergeSpellCastDetails,
} from "@/lib/spell-cast-details";

type SpellAccordionState = {
  open: boolean;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  preview: SpellPreview | null;
};

function SpellPickerItem({
  spell,
  level,
  added,
  state,
  onToggle,
  onAdd,
}: {
  spell: ClassSpellRef;
  level: number;
  added: boolean;
  state: SpellAccordionState | undefined;
  onToggle: () => void;
  onAdd: () => void;
}) {
  const isOpen = state?.open ?? false;
  const srdDetails = getSpellCastDetailsFromSrd(spell.name, level);
  const previewDetails = state?.preview
    ? getSpellCastDetailsFromFields(state.preview.fields, state.preview.descriptionText)
    : { save: null, damage: null, effect: null };
  const details = mergeSpellCastDetails(srdDetails, previewDetails);

  return (
    <div className={`pc-spell-picker-item${isOpen ? " is-open" : ""}`}>
      <div className="pc-spell-picker-item-header">
        <div className="pc-spell-picker-item-row">
          <a
            href={`/spells/${spell.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pc-spell-picker-item-name pc-feat-link"
          >
            {spell.name}
          </a>
          <span className="pc-spell-picker-item-meta">{spell.school ?? "—"}</span>
          <button
            type="button"
            className="pc-spell-picker-item-expand"
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${spell.name}`}
            onClick={onToggle}
          >
            <span className="pc-spell-picker-item-icon" aria-hidden="true">
              {isOpen ? "−" : "+"}
            </span>
          </button>
        </div>
        <button
          type="button"
          className="tool-btn tool-btn--compact"
          disabled={added}
          onClick={onAdd}
        >
          {added ? "Added" : "Add"}
        </button>
      </div>

      {isOpen ? (
        <div className="pc-spell-picker-item-body">
          {state?.loading ? (
            <p className="pc-spell-picker-status">Loading cast details…</p>
          ) : null}
          {state?.error ? <p className="pc-spell-picker-error">{state.error}</p> : null}
          {!state?.loading && !state?.error ? <SpellCastDetailsView details={details} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function PcSpellPickerDialog({
  open,
  onClose,
  classSlug,
  classLabel,
  level,
  addedSpellSlugs,
  onAddSpell,
}: {
  open: boolean;
  onClose: () => void;
  classSlug: string;
  classLabel: string;
  level: number;
  addedSpellSlugs: Set<string>;
  onAddSpell: (slug: string, name: string) => void;
}) {
  const nonce = useSessionNonce();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spells, setSpells] = useState<ClassSpellRef[]>([]);
  const [itemState, setItemState] = useState<Record<string, SpellAccordionState>>({});

  useEffect(() => {
    if (!open) {
      setQuery("");
      setLoadError(null);
      setItemState({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void fetchClassSpellsAtLevel({ classSlug, className: classLabel, level, nonce }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success || !result.spells) {
        setSpells([]);
        setLoadError(result.error ?? "Failed to load spells");
        return;
      }
      setSpells(result.spells);
    });

    return () => {
      cancelled = true;
    };
  }, [open, classSlug, classLabel, level, nonce]);

  const filteredSpells = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return spells;
    return spells.filter((spell) => spell.name.toLowerCase().includes(needle));
  }, [query, spells]);

  const loadPreview = useCallback(
    async (slug: string) => {
      setItemState((prev) => ({
        ...prev,
        [slug]: {
          open: true,
          loading: true,
          loaded: prev[slug]?.loaded ?? false,
          error: null,
          preview: prev[slug]?.preview ?? null,
        },
      }));

      const result = await fetchSpellPreview({ spellSlug: slug, nonce });
      setItemState((prev) => ({
        ...prev,
        [slug]: {
          open: true,
          loading: false,
          loaded: true,
          error: result.success && result.spell ? null : (result.error ?? "Failed to load spell"),
          preview: result.spell ?? null,
        },
      }));
    },
    [nonce],
  );

  const toggleSpell = useCallback(
    (slug: string, spellName: string) => {
      const current = itemState[slug];
      if (current?.open) {
        setItemState((prev) => ({
          ...prev,
          [slug]: { ...prev[slug], open: false },
        }));
        return;
      }

      if (current?.loaded) {
        setItemState((prev) => ({
          ...prev,
          [slug]: { ...prev[slug], open: true },
        }));
        return;
      }

      if (hasSpellCastDetails(getSpellCastDetailsFromSrd(spellName, level))) {
        setItemState((prev) => ({
          ...prev,
          [slug]: {
            open: true,
            loading: false,
            loaded: true,
            error: null,
            preview: null,
          },
        }));
        return;
      }

      void loadPreview(slug);
    },
    [itemState, level, loadPreview],
  );

  return (
    <DraggableDialog
      open={open}
      title={`Level ${level} ${classLabel} spells`}
      onClose={onClose}
      panelClassName="pc-spell-picker-dialog"
    >
      <div className="pc-spell-picker-toolbar">
        <Search className="pc-spell-picker-search-icon" aria-hidden />
        <input
          type="search"
          className="pc-sheet-input pc-spell-picker-search"
          value={query}
          placeholder="Filter spells…"
          aria-label="Filter spells"
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="pc-spell-picker-count">
          {filteredSpells.length} spell{filteredSpells.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? <p className="pc-spell-picker-status">Loading class spell list…</p> : null}
      {loadError ? <p className="pc-spell-picker-error">{loadError}</p> : null}

      {!loading && !loadError && filteredSpells.length === 0 ? (
        <p className="pc-spell-picker-status">No spells match this filter.</p>
      ) : null}

      {!loading && !loadError && filteredSpells.length > 0 ? (
        <div className="pc-spell-picker-list">
          {filteredSpells.map((spell) => (
            <SpellPickerItem
              key={spell.slug}
              spell={spell}
              level={level}
              added={addedSpellSlugs.has(spell.slug)}
              state={itemState[spell.slug]}
              onToggle={() => toggleSpell(spell.slug, spell.name)}
              onAdd={() => onAddSpell(spell.slug, spell.name)}
            />
          ))}
        </div>
      ) : null}
    </DraggableDialog>
  );
}
