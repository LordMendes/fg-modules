"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { SpellPreview } from "@/lib/entities";
import { sanitizeHtml } from "@/lib/sanitize";

export function SpellPreviewModal({
  spell,
  loading,
  error,
  onClose,
}: {
  spell: SpellPreview | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fields = spell
    ? Object.entries(spell.fields).filter(([, value]) => value)
    : [];

  return (
    <div className="spell-modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="spell-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spell-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="spell-modal-header">
          <div>
            {loading && <p className="spell-modal-status">Loading spell…</p>}
            {error && <p className="spell-modal-error">{error}</p>}
            {spell && (
              <>
                <h2 id="spell-modal-title">{spell.name}</h2>
                <p className="spell-modal-source">
                  {spell.source.name}
                  {spell.source.abbrev && <> ({spell.source.abbrev})</>}
                  <span className="edition-chip">{spell.source.edition}</span>
                </p>
              </>
            )}
          </div>
          <button type="button" className="spell-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {spell && (
          <div className="spell-modal-body">
            {fields.length > 0 && (
              <dl className="stat-block spell-modal-stats">
                {fields.map(([label, value]) => (
                  <div key={label} className="stat-row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {spell.descriptionHtml && (
              <section
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(spell.descriptionHtml) }}
              />
            )}

            {!spell.descriptionHtml && spell.descriptionText && (
              <p className="spell-modal-text">{spell.descriptionText}</p>
            )}

            <footer className="spell-modal-footer">
              <Link href={`/spells/${spell.slug}`} className="btn-secondary">
                Open full entry
              </Link>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
