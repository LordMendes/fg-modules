"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { SpellPreview } from "@/lib/entities";
import { sanitizeHtml } from "@/lib/sanitize";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

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
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    const closeButton = panel?.querySelector<HTMLElement>(".spell-modal-close");
    if (closeButton) {
      closeButton.focus();
    } else {
      panel?.focus();
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  const fields = spell
    ? Object.entries(spell.fields).filter(([, value]) => value)
    : [];

  return (
    <div className="spell-modal-overlay" role="presentation">
      <button
        type="button"
        className="spell-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="spell-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spell-modal-title"
        tabIndex={-1}
      >
        <header className="spell-modal-header">
          <div>
            {loading && !spell && <p className="spell-modal-status">Loading spell…</p>}
            {error && <p className="spell-modal-error">{error}</p>}
            {spell ? (
              <>
                <h2 id="spell-modal-title">{spell.name}</h2>
                <p className="spell-modal-source">
                  {spell.source.name}
                  {spell.source.abbrev && <> ({spell.source.abbrev})</>}
                  <span className="edition-chip">{spell.source.edition}</span>
                </p>
              </>
            ) : (
              <h2 id="spell-modal-title" className="sr-only">
                {error ? "Spell preview error" : "Spell preview"}
              </h2>
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
