"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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

export function HomeHeroActions({ sourcesByEdition }: HomeHeroActionsProps) {
  const [showSources, setShowSources] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!showSources || !panelRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    panelRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [showSources]);

  return (
    <>
      <div className="hero-actions">
        <Link href="/tools" className="btn-secondary">
          Browse tools
        </Link>
        <button
          type="button"
          className={`btn-ghost hero-sources-toggle${showSources ? " is-active" : ""}`}
          aria-expanded={showSources}
          aria-controls={panelId}
          onClick={() => setShowSources((open) => !open)}
        >
          {showSources ? "Hide sources" : "View sources"}
          <ChevronDown
            className={`hero-sources-chevron h-4 w-4${showSources ? " is-open" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {showSources ? (
        <section
          ref={panelRef}
          id={panelId}
          className="home-sources-panel"
          aria-label="Sources and rulebooks"
        >
          <header className="home-sources-panel-header">
            <div>
              <h2>Sources &amp; Rulebooks</h2>
              <p>Browse content by publication and edition.</p>
            </div>
            <Link href="/sources" className="home-sources-all-link">
              Full sources page
            </Link>
          </header>

          {Object.entries(sourcesByEdition).map(([edition, editionSources]) => (
            <div key={edition} className="edition-group">
              <h3>
                <span>{edition}</span>
                <span className="edition-group-count">
                  {editionSources.length.toLocaleString()}{" "}
                  {editionSources.length === 1 ? "source" : "sources"}
                </span>
              </h3>
              <div className="sources-grid">
                {editionSources.map((source) => (
                  <Link
                    key={source.id}
                    href={source.abbrev ? `/sources/${source.abbrev}` : "#"}
                    className="source-card"
                  >
                    <h4>
                      {source.name}
                      {source.abbrev ? (
                        <span className="abbrev"> ({source.abbrev})</span>
                      ) : null}
                    </h4>
                    <p className="meta">
                      {source.counts.toLocaleString()} entries
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
