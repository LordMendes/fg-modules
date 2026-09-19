"use client";

import { RollableStat } from "@/components/dice/rollable-stat";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import {
  computeCombatStats,
  type ClassAdvancementMap,
} from "@/lib/pc-planner/combatStats";
import type { ClassDerivedFeatures } from "@/lib/pc-planner/parseClassAbilityEffects";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import type { PcPlanState } from "@/lib/pc-planner/types";

export function PcMainDefenses({
  state,
  raceFeatures,
  classFeatures,
  classAdvancement,
}: {
  state: PcPlanState;
  raceFeatures: RaceDerivedFeatures | null;
  classFeatures: ClassDerivedFeatures | null;
  classAdvancement: ClassAdvancementMap | null;
}) {
  const stats = computeCombatStats(
    state,
    raceFeatures,
    classFeatures,
    classAdvancement,
    deriveFeatEffects(state.feats),
  );

  return (
    <PcSheetCard title="Defenses" className="pc-main-defenses">
      <div className="pc-main-defenses-grid">
        <div className="pc-main-defense-primary pc-main-defense-sr">
          <span className="pc-main-defense-label">SR</span>
          <span
            className="pc-main-defense-primary-total"
            aria-label={`Spell resistance ${stats.spellResistance.total}`}
          >
            {stats.spellResistance.total}
          </span>
        </div>

        <div className="pc-main-defense-primary pc-main-defense-ac">
          <span className="pc-main-defense-label">AC</span>
          <span className="pc-main-defense-primary-total" aria-label={`Armor class ${stats.ac.total}`}>
            {stats.ac.total}
          </span>
          <span className="pc-main-defense-ac-subs">
            FF {stats.flatFooted.total} · Touch {stats.touch.total}
          </span>
        </div>

        <div className="pc-main-defense-saves">
          {(
            [
              ["Fort", "Fortitude", stats.fortitude.total],
              ["Ref", "Reflex", stats.reflex.total],
              ["Will", "Will", stats.will.total],
            ] as const
          ).map(([short, label, total]) => (
            <div key={short} className="pc-main-defense-save-cell">
              <span className="pc-main-defense-save-name">{short}</span>
              <RollableStat
                className="pc-main-defense-save-mod"
                label={label}
                modifier={total}
                kind="save"
              />
            </div>
          ))}
        </div>
      </div>
    </PcSheetCard>
  );
}
