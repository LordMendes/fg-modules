"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  flattenSourcesByEdition,
  pickFeaturedSources,
  remainingSourceCount,
  sourceDisplayName,
} from "@/lib/home-sources";

export type HomeSource = {
  id: string;
  name: string;
  abbrev: string | null;
  edition: string;
  counts: number;
};

type HomeHeroActionsProps = {
  sourcesByEdition: Record<string, HomeSource[]>;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function HomeHeroActions({ sourcesByEdition }: HomeHeroActionsProps) {
  const [showSources, setShowSources] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const allSources = useMemo(
    () => flattenSourcesByEdition(sourcesByEdition),
    [sourcesByEdition],
  );
  const featuredSources = useMemo(
    () => pickFeaturedSources(allSources),
    [allSources],
  );
  const moreCount = remainingSourceCount(
    allSources.length,
    featuredSources.length,
  );

  useEffect(() => {
    if (!showSources) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSources(false);
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
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const closeButton = panel?.querySelector<HTMLElement>(
      ".home-sources-dialog-close",
    );
    if (closeButton) closeButton.focus();
    else panel?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [showSources]);

  function closeDialog() {
    setShowSources(false);
  }

  return (
    <>
      <div className="hero-actions">
        <Link href="/tools" className="btn-secondary">
          Browse tools
        </Link>
        <button
          type="button"
          className="btn-ghost hero-sources-toggle"
          aria-haspopup="dialog"
          aria-expanded={showSources}
          onClick={() => setShowSources(true)}
        >
          View sources
        </button>
      </div>

      {showSources ? (
        <div className="home-sources-dialog" role="presentation">
          <button
            type="button"
            className="home-sources-dialog-backdrop"
            aria-label="Close dialog"
            onClick={closeDialog}
          />
          <div
            ref={panelRef}
            className="home-sources-dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <header className="home-sources-dialog-header">
              <div>
                <h2 id={titleId}>Sources &amp; Rulebooks</h2>
                <p>Core books from the 3.5 catalog.</p>
              </div>
              <button
                type="button"
                className="home-sources-dialog-close"
                onClick={closeDialog}
                aria-label="Close"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </header>

            {featuredSources.length > 0 ? (
              <ul className="home-sources-dialog-list">
                {featuredSources.map((source) => {
                  const name = sourceDisplayName(source);
                  return (
                    <li key={source.id}>
                      <Link
                        href={source.abbrev ? `/sources/${source.abbrev}` : "#"}
                        className="home-source-chip"
                      >
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="home-sources-empty" role="status">
                No featured sources are available yet.
              </p>
            )}

            {moreCount > 0 ? (
              <Link href="/sources" className="home-sources-more-link">
                See {moreCount.toLocaleString()} more{" "}
                {moreCount === 1 ? "source" : "sources"}
              </Link>
            ) : (
              <Link href="/sources" className="home-sources-more-link">
                Full sources page
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
