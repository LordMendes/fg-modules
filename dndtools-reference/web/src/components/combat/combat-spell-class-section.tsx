"use client";

import type { CombatSpellClass } from "@/lib/combat/types";

export function CombatSpellClassSection({
  spellClasses,
  spellUses,
}: {
  spellClasses: CombatSpellClass[];
  spellUses: Record<string, number>;
}) {
  if (spellClasses.length === 0) return null;

  return (
    <section className="combat-detail-section">
      <h3 className="combat-detail-heading">Spell Classes</h3>
      {spellClasses.map((spellClass) => (
        <div key={spellClass.key} className="combat-spell-class-block">
          <h4 className="combat-spell-class-name">
            {spellClass.label}
            <span className="combat-spell-class-meta">
              CL {spellClass.casterLevel} | DC {10 + spellClass.dcModifier}+level{spellClass.dcMisc > 0 ? `+${spellClass.dcMisc}` : ""} ({spellClass.dcAbility.toUpperCase()})
            </span>
          </h4>
          <div className="combat-spell-slots-grid">
            {Array.from({ length: spellClass.maxSpellLevel + 1 }, (_, level) => {
              const total = spellClass.totalSlots[level] ?? 0;
              if (total === 0 && level > 0) return null;
              const remaining = spellUses[`slot:${spellClass.key}:${level}`] ?? total;
              const baseSlots = spellClass.baseSlots[level] ?? 0;
              const bonusSlots = spellClass.bonusSlots[level] ?? 0;
              
              return (
                <div key={level} className="combat-spell-slot-level">
                  <span className="combat-spell-slot-label">L{level}:</span>
                  <span className={`combat-spell-slot-count ${remaining === 0 ? "exhausted" : ""}`}>
                    {remaining}/{total}
                  </span>
                  {bonusSlots > 0 && (
                    <span className="combat-spell-slot-breakdown" title={`${baseSlots} base + ${bonusSlots} bonus from ${spellClass.dcAbility.toUpperCase()}`}>
                      ({baseSlots}+{bonusSlots})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {spellClass.mode === "spontaneous" && spellClass.known.some(k => k > 0) && (
            <div className="combat-spell-known-info">
              Spells Known: {spellClass.known.map((count, level) => 
                count > 0 ? `L${level}:${count}` : null
              ).filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
