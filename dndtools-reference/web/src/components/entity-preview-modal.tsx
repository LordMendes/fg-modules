"use client";

import { useEffect, useRef } from "react";
import type { EntityPreview } from "@/lib/entities";
import { sanitizeHtml } from "@/lib/sanitize";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function EntityPreviewModal({
  entity,
  loading,
  error,
  onClose,
}: {
  entity: EntityPreview | null;
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

    const closeButton = panel?.querySelector<HTMLElement>(".entity-modal-close");
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

  const fields = entity
    ? Object.entries(entity.fields).filter(([, value]) => value)
    : [];

  function openInNewTab() {
    if (!entity) return;
    window.open(`/${entity.category}/${entity.slug}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="entity-modal-overlay" role="presentation">
      <button
        type="button"
        className="entity-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="entity-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-modal-title"
        tabIndex={-1}
      >
        <header className="entity-modal-header">
          <div>
            {loading && !entity && <p className="entity-modal-status">Loading entry…</p>}
            {error && <p className="entity-modal-error">{error}</p>}
            {entity ? (
              <>
                <h2 id="entity-modal-title">{entity.name}</h2>
                {entity.statLine && <p className="entity-modal-stat-line">{entity.statLine}</p>}
                <p className="entity-modal-source">
                  {entity.source.name}
                  {entity.source.abbrev && <> ({entity.source.abbrev})</>}
                  <span className="edition-chip">{entity.source.edition}</span>
                </p>
              </>
            ) : (
              <h2 id="entity-modal-title" className="sr-only">
                {error ? "Preview error" : "Entry preview"}
              </h2>
            )}
          </div>
          <button type="button" className="entity-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {entity && (
          <div className="entity-modal-body">
            {fields.length > 0 && (
              <dl className="stat-block entity-modal-stats">
                {fields.map(([label, value]) => (
                  <div key={label} className="stat-row">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {entity.descriptionHtml && (
              <section
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.descriptionHtml) }}
              />
            )}

            {!entity.descriptionHtml && entity.descriptionText && (
              <p className="entity-modal-text">{entity.descriptionText}</p>
            )}

            <footer className="entity-modal-footer">
              <button type="button" className="btn-secondary" onClick={openInNewTab}>
                Open in new tab
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
