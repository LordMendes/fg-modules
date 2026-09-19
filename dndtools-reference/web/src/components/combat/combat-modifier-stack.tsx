"use client";

import { useCombatContext } from "@/components/combat/combat-context";
import { useState } from "react";

const MODIFIER_PILLS = [-4, -2, -1, 1, 2, 4] as const;

export function CombatModifierStack() {
  const ctx = useCombatContext();
  const [label, setLabel] = useState("");
  const [customValue, setCustomValue] = useState("");

  if (!ctx) return null;

  const total = ctx.modifierStack.reduce((sum, m) => sum + m.value, 0);
  const active = total !== 0;

  return (
    <div
      className={`combat-modifier-stack${active ? " combat-modifier-stack--active" : ""}${ctx.stickyModifier ? " combat-modifier-stack--sticky" : ""}`}
    >
      <span className="combat-modifier-stack-label">Modifier</span>
      <div className="combat-modifier-pills">
        {MODIFIER_PILLS.map((value) => (
          <button
            key={value}
            type="button"
            className="combat-modifier-pill"
            title="Shift+click to keep sticky"
            onClick={(e) => {
              ctx.pushModifier(value, label.trim() || `Ad hoc ${value}`, e.shiftKey);
            }}
          >
            {value > 0 ? `+${value}` : value}
          </button>
        ))}
        <span className="combat-modifier-divider" aria-hidden>
          |
        </span>
        <input
          className="tool-input tool-input-sm combat-modifier-custom"
          type="number"
          placeholder="n"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = Number.parseInt(customValue, 10);
              if (Number.isFinite(n) && n !== 0) {
                ctx.pushModifier(n, label.trim() || `Ad hoc ${n}`, e.shiftKey);
                setCustomValue("");
              }
            }
          }}
        />
      </div>
      <input
        className="tool-input tool-input-sm combat-modifier-label"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      {ctx.stickyModifier ? (
        <span className="combat-modifier-sticky-badge">sticky</span>
      ) : null}
      {active ? (
        <span className="combat-modifier-total" aria-live="polite">
          {total > 0 ? `+${total}` : total}
        </span>
      ) : null}
      <button
        type="button"
        className="tool-btn tool-btn--ghost"
        disabled={!active && !ctx.stickyModifier}
        onClick={() => ctx.clearModifiers()}
      >
        Clear
      </button>
    </div>
  );
}
