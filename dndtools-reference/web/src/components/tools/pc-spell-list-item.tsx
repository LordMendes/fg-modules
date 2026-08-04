"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSpellPreview } from "@/actions/data";
import { SpellCastDetailsView } from "@/components/tools/spell-cast-details-view";
import { useSessionNonce } from "@/components/session-provider";
import {
  getSpellCastDetailsFromFields,
  getSpellCastDetailsFromSrd,
  hasSpellCastDetails,
  mergeSpellCastDetails,
} from "@/lib/spell-cast-details";
import type { SpellEntry, SpellMode } from "@/lib/pc-planner/types";

export function PcSpellListItem({
  spell,
  mode,
  slotLimit,
  onRemove,
  onUpdatePrepared,
}: {
  spell: SpellEntry;
  mode: SpellMode;
  slotLimit: number;
  onRemove: () => void;
  onUpdatePrepared: (prepared: number) => void;
}) {
  const nonce = useSessionNonce();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const srdDetails = useMemo(
    () => getSpellCastDetailsFromSrd(spell.name, spell.level),
    [spell.name, spell.level],
  );

  const [details, setDetails] = useState(srdDetails);

  useEffect(() => {
    setDetails(srdDetails);
    setPreviewLoaded(false);
  }, [srdDetails, spell.slug]);

  useEffect(() => {
    if (!open || previewLoaded || hasSpellCastDetails(srdDetails)) return;

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
      );
      setDetails(mergeSpellCastDetails(srdDetails, fallback));
    });

    return () => {
      cancelled = true;
    };
  }, [open, previewLoaded, srdDetails, spell.slug, nonce]);

  return (
    <li className={`pc-spell-accordion-item${open ? " is-open" : ""}`}>
      <div className="pc-spell-accordion-header pc-sheet-editable-row">
        <button
          type="button"
          className="pc-spell-accordion-expand"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${spell.name}`}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="pc-spell-picker-item-icon" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        </button>
        <a
          href={`/spells/${spell.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-feat-link pc-spell-accordion-name"
        >
          {spell.name}
        </a>
        {mode === "preparation" ? (
          <label className="pc-spell-prepared">
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
          onClick={onRemove}
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
