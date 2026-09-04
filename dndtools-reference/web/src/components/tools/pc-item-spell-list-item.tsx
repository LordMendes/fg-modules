"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { fetchSpellPreview } from "@/actions/data";
import { SpellCastDetailsView } from "@/components/tools/spell-cast-details-view";
import { useSessionNonce } from "@/components/session-provider";
import {
  getSpellCastDetailsFromFields,
  hasSpellCastDetails,
  mergeSpellCastDetails,
  resolveSpellCastDetails,
} from "@/lib/spell-cast-details";
import {
  itemSpellDisplayLabel,
  itemSpellSaveDcMod,
  type ItemSpellAction,
} from "@/lib/pc-planner/itemSpells";

export function PcItemSpellListItem({
  action,
  onUse,
  onRestore,
}: {
  action: ItemSpellAction;
  onUse: () => void;
  onRestore: () => void;
}) {
  const nonce = useSessionNonce();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const castContext = useMemo(
    () => ({
      casterLevel: action.casterLevel,
      spellLevel: action.spellLevel,
      dcModifier: itemSpellSaveDcMod(action.spellLevel),
    }),
    [action.casterLevel, action.spellLevel],
  );

  const resolvedDetails = useMemo(
    () => resolveSpellCastDetails(action.name, castContext),
    [action.name, castContext],
  );

  const [details, setDetails] = useState(resolvedDetails);

  useEffect(() => {
    setDetails(resolvedDetails);
    setPreviewLoaded(false);
  }, [resolvedDetails, action.slug]);

  useEffect(() => {
    if (!open || previewLoaded || hasSpellCastDetails(resolvedDetails)) return;

    let cancelled = false;
    setLoading(true);

    void fetchSpellPreview({ spellSlug: action.slug, nonce }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      setPreviewLoaded(true);
      if (!result.success || !result.spell) return;
      const fallback = getSpellCastDetailsFromFields(
        result.spell.fields,
        result.spell.descriptionText,
        castContext,
      );
      setDetails(mergeSpellCastDetails(resolvedDetails, fallback));
    });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    previewLoaded,
    resolvedDetails,
    action.slug,
    castContext,
    nonce,
  ]);

  const label = itemSpellDisplayLabel(action.itemName, action.name);
  const hasCharges = action.chargesMax != null;
  const chargesLeft = action.chargesCurrent ?? 0;
  const canUse = !hasCharges || chargesLeft > 0;
  const canRestore =
    hasCharges &&
    action.chargesMax != null &&
    chargesLeft < action.chargesMax;

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
          href={`/spells/${action.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-feat-link pc-spell-accordion-name"
          onClick={(event) => event.stopPropagation()}
        >
          {label}
        </a>
        <span className="pc-item-spell-meta" aria-hidden="true">
          CL {action.casterLevel}
          {hasCharges
            ? ` · ${chargesLeft}/${action.chargesMax} ch`
            : null}
        </span>
        <span className="pc-spell-accordion-row-fill" aria-hidden="true" />
        {hasCharges ? (
          <div
            className="pc-item-spell-charges"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="tool-btn tool-btn--ghost tool-btn--compact"
              disabled={!canUse}
              title="Spend one charge"
              onClick={onUse}
            >
              Use
            </button>
            <button
              type="button"
              className="tool-btn-icon"
              disabled={!canRestore}
              title="Restore one charge"
              aria-label={`Restore charge on ${label}`}
              onClick={onRestore}
            >
              <Plus size={14} />
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="pc-spell-accordion-body">
          {action.notes?.trim() ? (
            <p className="pc-item-spell-notes">{action.notes.trim()}</p>
          ) : null}
          {loading ? <p className="pc-spell-picker-status">Loading cast details…</p> : null}
          {!loading ? <SpellCastDetailsView details={details} spellName={action.name} /> : null}
        </div>
      ) : null}
    </li>
  );
}
