"use client";

import { formatBonusSources, type BonusSource } from "@/lib/pc-planner/itemBonuses";

function formatSignedAmount(amount: number): string {
  return amount >= 0 ? `+${amount}` : `${amount}`;
}

export function AbilityScoreLabelHint({
  label,
  racial,
  itemSources,
  itemTotal,
}: {
  label: string;
  racial: number;
  itemSources: BonusSource[];
  itemTotal: number;
}) {
  const lines: string[] = [];
  if (racial !== 0) {
    lines.push(`${formatSignedAmount(racial)} racial`);
  }
  lines.push(...formatBonusSources(itemSources));

  if (lines.length === 0) {
    return <span className="pc-ability-label">{label}</span>;
  }

  const totalAdjustment = racial + itemTotal;

  return (
    <span className="pc-bonus-sources-wrap pc-ability-label-wrap" tabIndex={0}>
      <span className="pc-ability-label">{label}</span>
      <span className="pc-skill-tooltip pc-bonus-sources-tooltip" role="tooltip">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="pc-skill-tooltip-line">
            {line}
          </span>
        ))}
        {lines.length > 1 ? (
          <span className="pc-skill-tooltip-line pc-skill-tooltip-line--indent">
            Total {formatSignedAmount(totalAdjustment)}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function BonusSourcesHint({
  amount,
  sources,
  ariaLabel,
}: {
  amount: number;
  sources: BonusSource[];
  ariaLabel: string;
}) {
  if (amount === 0 || sources.length === 0) return null;
  const signed = amount >= 0 ? `+${amount}` : `${amount}`;
  const lines = formatBonusSources(sources);
  return (
    <span className="pc-bonus-sources-wrap" tabIndex={0}>
      <span className="pc-ability-item-bonus" aria-label={ariaLabel}>
        ({amount})
      </span>
      <span className="pc-skill-tooltip pc-bonus-sources-tooltip" role="tooltip">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="pc-skill-tooltip-line">
            {line}
          </span>
        ))}
        {sources.length > 1 ? (
          <span className="pc-skill-tooltip-line pc-skill-tooltip-line--indent">
            Total {signed}
          </span>
        ) : null}
      </span>
    </span>
  );
}
