"use client";

import { formatGp } from "@/lib/magic-item/format-gp";
import type { CraftBreakdown, PriceBreakdown } from "@/lib/magic-item/types";

type MagicItemSummaryProps = {
  price: PriceBreakdown;
  craft: CraftBreakdown;
  emptyMessage?: string;
};

export function MagicItemSummary({
  price,
  craft,
  emptyMessage = "Select an item.",
}: MagicItemSummaryProps) {
  const hasWarnings = price.warnings.length > 0;

  return (
    <aside className="tool-summary mi-summary" aria-live="polite">
      <h2>Price Summary</h2>

      {price.itemName && (
        <p className="mi-item-name">
          <strong>{price.itemName}</strong>
        </p>
      )}

      {hasWarnings && (
        <ul className="mi-warnings" role="status">
          {price.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="tool-summary-total">
        <span className="tool-summary-label">Market price</span>
        <span className="tool-summary-amount">{formatGp(price.totalGp)} gp</span>
      </div>

      <dl className="tool-summary-stats mi-equiv-stats">
        <div>
          <dt>Total equivalent</dt>
          <dd>+{price.equivalentTotal}</dd>
        </div>
      </dl>

      {price.lines.length > 0 && (
        <section className="tool-summary-section">
          <h3>Breakdown</h3>
          <ul className="tool-line-items">
            {price.lines.map((line) => (
              <li key={line.label} className="tool-line-item">
                <span>{line.label}</span>
                <span>{formatGp(line.gp)} gp</span>
              </li>
            ))}
            <li className="tool-line-item tool-line-item-total">
              <span>Total</span>
              <span>{formatGp(price.totalGp)} gp</span>
            </li>
          </ul>
        </section>
      )}

      {price.lines.length === 0 && (
        <p className="tool-step-desc">{emptyMessage}</p>
      )}

      <section className="tool-summary-section mi-craft-section">
        <h3>Crafting</h3>
        <dl className="tool-summary-stats">
          <div>
            <dt>Materials (½ price)</dt>
            <dd>{formatGp(craft.materialsGp)} gp</dd>
          </div>
          <div>
            <dt>XP cost</dt>
            <dd>{formatGp(craft.xp)} XP</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              {craft.days} day{craft.days === 1 ? "" : "s"}
            </dd>
          </div>
          {craft.minCasterLevel > 0 && (
            <div>
              <dt>Minimum caster level</dt>
              <dd>{craft.minCasterLevel}</dd>
            </div>
          )}
        </dl>
        <p className="tool-step-desc mi-craft-note">
          Requires <em>Craft Magic Arms and Armor</em>. Materials = half market
          price; XP = price ÷ 25; time = ⌈price ÷ 1,000⌉ days (min. 1).
        </p>
      </section>
    </aside>
  );
}
