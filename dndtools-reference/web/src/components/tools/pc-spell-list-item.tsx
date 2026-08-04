"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSpellPreview } from "@/actions/data";
import { SpellCastDetailsView } from "@/components/tools/spell-cast-details-view";
import { useSessionNonce } from "@/components/session-provider";
import {
  getSpellCastDetailsFromFields,
  hasSpellCastDetails,
  mergeSpellCastDetails,
  resolveSpellCastDetails,
  type SpellCastContext,
} from "@/lib/spell-cast-details";
import type { SpellEntry, SpellMode } from "@/lib/pc-planner/types";

export function PcSpellListItem({
  spell,
  mode,
  slotLimit,
  castContext,
  onRemove,
  onUpdatePrepared,
}: {
  spell: SpellEntry;
  mode: SpellMode;
  slotLimit: number;
  castContext: SpellCastContext;
  onRemove: () => void;
  onUpdatePrepared: (prepared: number) => void;
}) {
  const nonce = useSessionNonce();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const resolvedDetails = useMemo(
    () =>
      resolveSpellCastDetails(spell.name, {
        ...castContext,
        spellLevel: spell.level,
      }),
    [spell.name, spell.level, castContext],
  );

  const [details, setDetails] = useState(resolvedDetails);

  useEffect(() => {
    setDetails(resolvedDetails);
    setPreviewLoaded(false);
  }, [resolvedDetails, spell.slug]);

  useEffect(() => {
    if (!open || previewLoaded || hasSpellCastDetails(resolvedDetails)) return;

    let cancelled = false;
    setLoading(true);

    void fetchSpellPreview({ spellSlug: spell.slug, nonce }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      setPreviewLoaded(true);
      if (!result.success || !result.spell) return;
      const fallback = getSpellCastDetailsFromFields(
        result.spell.fields,
        result.spell.descriptionText,
        { ...castContext, spellLevel: spell.level },
      );
      setDetails(mergeSpellCastDetails(resolvedDetails, fallback));
    });

    return () => {
      cancelled = true;
    };
  }, [open, previewLoaded, resolvedDetails, spell.slug, spell.level, castContext, nonce]);

  return (
    <li className={`pc-spell-accordion-item${open ? " is-open" : ""}`}>
      <div
        className="pc-spell-accordion-header pc-sheet-editable-row"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        <span className="pc-spell-picker-item-icon" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
        <a
          href={`/spells/${spell.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-feat-link pc-spell-accordion-name"
          onClick={(event) => event.stopPropagation()}
        >
          {spell.name}
        </a>
        <span className="pc-spell-accordion-row-fill" aria-hidden="true" />
        {mode === "preparation" ? (
          <label className="pc-spell-prepared" onClick={(event) => event.stopPropagation()}>
            <span className="npc-sheet-sub">Prep</span>
            <input
              type="number"
              className="pc-sheet-input pc-sheet-input--narrow"
              min={0}
              max={slotLimit}
              value={spell.prepared ?? 1}
              aria-label={`${spell.name} prepared count`}
              onChange={(e) => onUpdatePrepared(Number(e.target.value))}
            />
          </label>
        ) : null}
        <button
          type="button"
          className="tool-btn tool-btn--ghost tool-btn--compact"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </button>
      </div>

      {open ? (
        <div className="pc-spell-accordion-body">
          {loading ? <p className="pc-spell-picker-status">Loading cast details…</p> : null}
          {!loading ? <SpellCastDetailsView details={details} /> : null}
        </div>
      ) : null}
    </li>
  );
}
