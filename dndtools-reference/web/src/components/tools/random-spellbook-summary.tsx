"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Star } from "lucide-react";
import { FieldTooltip } from "@/components/field-tooltip";
import type { SpellbookResult } from "@/lib/random-spellbook";
import { STANDARD_BLANK_SPELLBOOK_PAGES, spellsOfInterestCount } from "@/lib/random-spellbook";
import { RANDOM_SPELLBOOK_TOOLTIPS } from "@/lib/random-spellbook/tooltips";

function StatLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <dt className="random-spellbook-stat-label">
      {label}
      <FieldTooltip text={tooltip} />
    </dt>
  );
}

function SpellLevelGroup({
  level,
  spells,
  emptyLabel,
}: {
  level: number;
  spells: { slug: string; name: string; schools: string[]; sourceAbbrev: string | null }[];
  emptyLabel?: string;
}) {
  const levelLabel = level === 0 ? "Cantrips" : `Level ${level}`;

  return (
    <div className="random-spellbook-level-group">
      <h4>
        {levelLabel}
        <span className="random-spellbook-level-count">{spells.length}</span>
      </h4>
      {spells.length === 0 ? (
        <p className="tool-step-desc">{emptyLabel ?? "None."}</p>
      ) : (
        <ul className="random-spellbook-spell-list">
          {spells.map((spell) => (
            <li key={spell.slug}>
              <Link href={`/spells/${spell.slug}`}>{spell.name}</Link>
              {spell.sourceAbbrev ? (
                <span className="random-spellbook-spell-meta">{spell.sourceAbbrev}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RandomSpellbookSummary({
  result,
  error,
  loading,
  wizardLevel,
}: {
  result: SpellbookResult | null;
  error: string | null;
  loading: boolean;
  wizardLevel: number;
}) {
  const [activeTab, setActiveTab] = useState<"book" | "interest">("book");

  if (loading) {
    return (
      <section className="tool-summary random-spellbook-summary" aria-live="polite">
        <h2>Results</h2>
        <p className="random-spellbook-loading">Building spellbook…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tool-summary random-spellbook-summary" aria-live="polite">
        <h2>Results</h2>
        <p className="random-spellbook-error">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="tool-summary random-spellbook-summary" aria-live="polite">
        <h2>
          Results
          <FieldTooltip text={RANDOM_SPELLBOOK_TOOLTIPS.resultsEmpty} />
        </h2>
        <p className="tool-step-desc">Generate a spellbook to see results here.</p>
      </section>
    );
  }

  const pageNote =
    result.pageCount > STANDARD_BLANK_SPELLBOOK_PAGES
      ? `Exceeds a standard blank book (${STANDARD_BLANK_SPELLBOOK_PAGES} pages).`
      : `Fits in a standard blank book (${STANDARD_BLANK_SPELLBOOK_PAGES} pages).`;

  const interestPerLevel = result?.interestPerLevel ?? spellsOfInterestCount(wizardLevel);
  const activeGroups = activeTab === "book" ? result.spellbook : result.spellsOfInterest;
  const activeTabTooltip =
    activeTab === "book"
      ? RANDOM_SPELLBOOK_TOOLTIPS.spellbookTab
      : RANDOM_SPELLBOOK_TOOLTIPS.interestTab;

  return (
    <section className="tool-summary random-spellbook-summary" aria-live="polite">
      <h2>Results</h2>

      <div className="tool-summary-total">
        <span className="tool-summary-label random-spellbook-stat-label">
          Spellbook pages
          <FieldTooltip text={RANDOM_SPELLBOOK_TOOLTIPS.spellbookPages} />
        </span>
        <span className="tool-summary-amount">{result.pageCount}</span>
      </div>

      <dl className="tool-summary-stats random-spellbook-results-stats">
        <div>
          <StatLabel label="Total spells" tooltip={RANDOM_SPELLBOOK_TOOLTIPS.totalSpells} />
          <dd>{result.totalSpells}</dd>
        </div>
        <div>
          <StatLabel label="Cantrips" tooltip={RANDOM_SPELLBOOK_TOOLTIPS.cantrips} />
          <dd>{result.cantripCount}</dd>
        </div>
        <div>
          <StatLabel label="Max spell level" tooltip={RANDOM_SPELLBOOK_TOOLTIPS.maxSpellLevel} />
          <dd>{result.maxSpellLevel}</dd>
        </div>
        <div>
          <StatLabel label="Seed" tooltip={RANDOM_SPELLBOOK_TOOLTIPS.resultSeed} />
          <dd className="random-spellbook-seed-value">{result.seed}</dd>
        </div>
      </dl>

      <p className="random-spellbook-page-note">{pageNote}</p>

      <div className="random-spellbook-tabs" role="tablist" aria-label="Spell lists">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "book"}
          className={`random-spellbook-tab${activeTab === "book" ? " random-spellbook-tab--active" : ""}`}
          onClick={() => setActiveTab("book")}
        >
          <BookOpen size={15} aria-hidden="true" />
          Spellbook
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "interest"}
          className={`random-spellbook-tab${activeTab === "interest" ? " random-spellbook-tab--active" : ""}`}
          onClick={() => setActiveTab("interest")}
        >
          <Star size={15} aria-hidden="true" />
          Spells of interest
        </button>
      </div>

      <div className="random-spellbook-tab-panel" role="tabpanel">
        <div className="random-spellbook-tab-heading">
          <h3>{activeTab === "book" ? "Spellbook" : "Spells of interest"}</h3>
          <FieldTooltip text={activeTabTooltip} />
        </div>
        {activeTab === "interest" ? (
          <p className="tool-step-desc random-spellbook-tab-desc">
            Up to {interestPerLevel} spells per circle.
          </p>
        ) : null}

        <div className="random-spellbook-results-body">
          {activeGroups.map((group) => (
            <SpellLevelGroup
              key={`${activeTab}-${group.level}`}
              level={group.level}
              spells={group.spells}
              emptyLabel={
                activeTab === "interest" ? "No remaining picks at this level." : undefined
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
