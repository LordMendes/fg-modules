"use client";

import { formatGp } from "@/lib/stronghold/calculate";
import type { StaffRoleKey, StrongholdResult } from "@/lib/stronghold/types";
import { STAFF_MAP } from "@/lib/stronghold/staff";

export function StrongholdCostSummary({ result }: { result: StrongholdResult }) {
  return (
    <aside className="tool-summary" aria-live="polite">
      <h2>Cost Summary</h2>

      <div className="tool-summary-total">
        <span className="tool-summary-label">Grand Total</span>
        <span className="tool-summary-amount">{formatGp(result.grandTotal)}</span>
      </div>

      <dl className="tool-summary-stats">
        <div>
          <dt>Stronghold spaces</dt>
          <dd>{result.totalSpaces.toLocaleString()} ss</dd>
        </div>
        <div>
          <dt>Build time</dt>
          <dd>
            {result.rushCost > 0
              ? `${result.buildWeeksRushed} weeks (rushed from ${result.buildWeeks})`
              : `${result.buildWeeks} week${result.buildWeeks === 1 ? "" : "s"}`}
          </dd>
        </div>
        <div>
          <dt>Monthly staff upkeep</dt>
          <dd>{formatGp(Math.round(result.monthlyUpkeep))}</dd>
        </div>
      </dl>

      {result.lineItems.length > 0 && (
        <section className="tool-summary-section">
          <h3>Line Items</h3>
          <ul className="tool-line-items">
            {result.lineItems.map((item) => (
              <li key={item.label} className="tool-line-item">
                <span>
                  {item.label}
                  {item.detail && (
                    <span className="tool-line-detail"> ({item.detail})</span>
                  )}
                </span>
                <span>{formatGp(item.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(result.spellDiscountAmount > 0 || result.siteModifiers.length > 0) && (
        <section className="tool-summary-section">
          <h3>Adjustments</h3>
          <ul className="tool-line-items">
            {result.spellDiscountAmount > 0 && (
              <li className="tool-line-item">
                <span>Spellcasting discounts</span>
                <span>−{formatGp(result.spellDiscountAmount)}</span>
              </li>
            )}
            {result.siteModifiers.map((mod) => (
              <li key={mod.label} className="tool-line-item">
                <span>{mod.label}</span>
                <span>
                  {mod.percent > 0 ? "+" : ""}
                  {mod.percent}%
                </span>
              </li>
            ))}
            {result.siteModifierPercent !== 0 && (
              <li className="tool-line-item tool-line-item-total">
                <span>Net site modifier</span>
                <span>
                  {result.siteModifierPercent > 0 ? "+" : ""}
                  {result.siteModifierPercent}%
                </span>
              </li>
            )}
            {result.rushCost > 0 && (
              <li className="tool-line-item">
                <span>Rush construction</span>
                <span>+{formatGp(result.rushCost)}</span>
              </li>
            )}
          </ul>
        </section>
      )}

      {Object.keys(result.staffRequired).length > 0 && (
        <section className="tool-summary-section">
          <h3>Staff</h3>
          <ul className="tool-line-items">
            {Object.entries(result.staffRequired).map(([role, count]) => {
              const staffRole = role as StaffRoleKey;
              const member = STAFF_MAP.get(staffRole);
              return (
              <li key={role} className="tool-line-item">
                <span>
                  {member?.label ?? role} × {count}
                </span>
                <span>
                  {formatGp(
                    Math.round((member?.monthlyWage ?? 0) * (count ?? 0)),
                  )}
                  /mo
                </span>
              </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.warnings.length > 0 && (
        <section className="tool-summary-section">
          <h3>Warnings</h3>
          <ul className="tool-warnings">
            {result.warnings.map((warning) => (
              <li key={warning.message} className="tool-warning">
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
