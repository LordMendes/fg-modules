"use client";

import { RollableStat } from "@/components/dice/rollable-stat";
import { BonusSourcesHint } from "@/components/tools/pc-main/bonus-sources-hint";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { abilityModifier } from "@/lib/pc-planner/combatStats";
import { computeEquippedBonuses } from "@/lib/pc-planner/itemBonuses";
import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import {
  abilityRacialMod,
  clampAbilityDamage,
  emptyAbilityDamage,
  emptyAbilityDrain,
  racialModLabel,
} from "@/lib/pc-planner/syncDerived";
import type { AbilityKey, PcPlanState } from "@/lib/pc-planner/types";

type PatchFn = (fn: (draft: PcPlanState) => void) => void;

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

function clampAbilityScore(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function PcMainAbilities({
  state,
  patch,
  raceFeatures,
  updateAbility,
}: {
  state: PcPlanState;
  patch: PatchFn;
  raceFeatures: RaceDerivedFeatures | null;
  updateAbility: (key: AbilityKey, value: number) => void;
}) {
  const abilityBase = state.abilityBase ?? state.abilities;
  const hasRace = Boolean(state.identity.raceSlug);
  const equippedItemBonuses = computeEquippedBonuses(state.inventory);

  return (
    <PcSheetCard title="Ability scores" className="pc-main-abilities">
      <div className="npc-sheet-abilities">
        {ABILITY_KEYS.map((key) => {
          const racial = abilityRacialMod(key, raceFeatures);
          const itemStacked = equippedItemBonuses.abilities[key];
          const itemTotal = itemStacked?.total ?? 0;
          const damage = state.abilityDamage?.[key] ?? 0;
          const drain = state.abilityDrain?.[key] ?? 0;
          const undamaged = abilityBase[key] + racial + itemTotal;
          const current = state.abilities[key];
          const damaged = damage > 0;
          return (
            <div key={key} className="pc-ability-cell pc-ability-card">
              <div className="pc-ability-card-head">
                <span className="pc-ability-label">{key.toUpperCase()}</span>
                <div
                  className={
                    damaged || drain > 0
                      ? "pc-ability-card-mod pc-ability-card-mod--damaged"
                      : "pc-ability-card-mod"
                  }
                >
                  <RollableStat
                    className="pc-sheet-mod pc-ability-card-modifier"
                    label={`${key.toUpperCase()} check`}
                    modifier={abilityModifier(current)}
                    kind="ability"
                  />
                </div>
              </div>
              <div className="pc-ability-card-score">
                <button
                  type="button"
                  className="pc-ability-step"
                  aria-label={`Decrease ${key.toUpperCase()}`}
                  disabled={abilityBase[key] <= 1}
                  onClick={() => updateAbility(key, abilityBase[key] - 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  className="pc-sheet-input pc-sheet-input--ability pc-ability-card-score-input"
                  min={1}
                  max={99}
                  value={undamaged}
                  aria-label={`${key.toUpperCase()} score`}
                  onChange={(e) => {
                    const desired = clampAbilityScore(Number(e.target.value));
                    updateAbility(key, desired - racial - itemTotal);
                  }}
                />
                <button
                  type="button"
                  className="pc-ability-step"
                  aria-label={`Increase ${key.toUpperCase()}`}
                  disabled={abilityBase[key] >= 99}
                  onClick={() => updateAbility(key, abilityBase[key] + 1)}
                >
                  +
                </button>
                <BonusSourcesHint
                  amount={itemTotal}
                  sources={itemStacked?.sources ?? []}
                  ariaLabel={`${key.toUpperCase()} item bonus ${itemTotal}`}
                />
              </div>
              <div className="pc-ability-card-fields">
                <div
                  className={
                    damaged
                      ? "pc-ability-col pc-ability-col--dmg pc-ability-col--dmg-active"
                      : "pc-ability-col pc-ability-col--dmg"
                  }
                >
                  <span className="pc-ability-col-label">Dmg</span>
                  <input
                    type="number"
                    className="pc-sheet-input pc-sheet-input--ability pc-sheet-input--ability-dmg"
                    min={0}
                    max={99}
                    value={damage}
                    aria-label={`${key.toUpperCase()} ability damage`}
                    onChange={(e) => {
                      const next = clampAbilityDamage(Number(e.target.value));
                      patch((s) => {
                        if (!s.abilityDamage) s.abilityDamage = emptyAbilityDamage();
                        s.abilityDamage[key] = next;
                      });
                    }}
                  />
                </div>
                <div className="pc-ability-col pc-ability-col--dmg">
                  <span className="pc-ability-col-label">Drain</span>
                  <input
                    type="number"
                    className="pc-sheet-input pc-sheet-input--ability pc-sheet-input--ability-dmg"
                    min={0}
                    max={99}
                    value={drain}
                    aria-label={`${key.toUpperCase()} ability drain`}
                    onChange={(e) =>
                      patch((s) => {
                        if (!s.abilityDrain) s.abilityDrain = emptyAbilityDrain();
                        s.abilityDrain[key] = clampAbilityDamage(Number(e.target.value));
                      })
                    }
                  />
                </div>
              </div>
              {hasRace && racialModLabel(racial) ? (
                <span className="pc-sheet-racial-mod">{racialModLabel(racial)}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </PcSheetCard>
  );
}
