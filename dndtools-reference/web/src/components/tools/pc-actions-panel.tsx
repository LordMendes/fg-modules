"use client";

import { useMemo, useState } from "react";
import type { PcCompendiumBundle } from "@/lib/entities";
import { PcSpellPickerDialog } from "@/components/tools/pc-spell-picker-dialog";
import { PcSpellListItem } from "@/components/tools/pc-spell-list-item";
import { castingModeLabel, getClassCastingInfo, halfCasterEffectiveLevel, isHalfCaster } from "@/lib/pc-planner/classCasting";
import {
  computeCombatStats,
  formatModifier,
} from "@/lib/pc-planner/combatStats";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import {
  computeSpellClass,
  preparedCountAtLevel,
} from "@/lib/pc-planner/spellSlots";
import type { PcPlanState } from "@/lib/pc-planner/types";

export type PcActionsPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  compendium: PcCompendiumBundle | null;
  activeSpellClassIndex: number;
  onSpellClassIndexChange: (index: number) => void;
  onAddSpell: (slug: string, name: string, level: number) => void;
  onRemoveSpell: (slug: string) => void;
  onUpdateSpellPrepared: (slug: string, prepared: number) => void;
};

function CombatSummary({
  state,
  compendium,
  patch,
}: {
  state: PcPlanState;
  compendium: PcCompendiumBundle | null;
  patch: PcActionsPanelProps["patch"];
}) {
  const stats = computeCombatStats(
    state,
    compendium?.raceFeatures ?? null,
    compendium?.classFeatures ?? null,
    compendium?.classAdvancement ?? null,
    deriveFeatEffects(state.feats),
  );

  return (
    <div className="npc-sheet-block pc-actions-combat">
      <h3>Combat</h3>
      <dl className="pc-actions-combat-grid">
        <div>
          <dt>Init</dt>
          <dd>{formatModifier(stats.initiative.total)}</dd>
        </div>
        <div>
          <dt>AC</dt>
          <dd>{stats.ac.total}</dd>
        </div>
        <div>
          <dt>Touch / FF</dt>
          <dd>
            {stats.touch.total} / {stats.flatFooted.total}
          </dd>
        </div>
        <div>
          <dt>Melee / Ranged</dt>
          <dd>
            {formatModifier(stats.melee.total)} / {formatModifier(stats.ranged.total)}
          </dd>
        </div>
        <div>
          <dt>Fort / Ref / Will</dt>
          <dd>
            {formatModifier(stats.fortitude.total)} / {formatModifier(stats.reflex.total)} /{" "}
            {formatModifier(stats.will.total)}
          </dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{stats.speed.total} ft.</dd>
        </div>
      </dl>
      <label className="pc-actions-attacks">
        <span className="npc-sheet-sub">Attacks</span>
        <textarea
          className="pc-sheet-input pc-sheet-textarea"
          rows={3}
          value={state.combat.attacks}
          placeholder="Weapon attacks, special attacks…"
          onChange={(e) =>
            patch((s) => {
              s.combat.attacks = e.target.value;
            })
          }
        />
      </label>
    </div>
  );
}

export function PcActionsPanel({
  state,
  patch,
  compendium,
  activeSpellClassIndex,
  onSpellClassIndexChange,
  onAddSpell,
  onRemoveSpell,
  onUpdateSpellPrepared,
}: PcActionsPanelProps) {
  const [pendingSpellLevel, setPendingSpellLevel] = useState(1);
  const [spellPickerOpen, setSpellPickerOpen] = useState(false);
  const spellClass = state.spellClasses[activeSpellClassIndex];
  const computed = spellClass
    ? computeSpellClass(
        spellClass.classSlug,
        spellClass.label,
        spellClass.casterLevel,
        state.abilities,
        compendium?.classSpellTables?.[spellClass.classSlug],
        {
          hasDomains: (state.identity.domains?.length ?? 0) > 0,
          specialistSchool: state.identity.specialistSchool,
        },
      )
    : null;

  const addedSpellSlugs = useMemo(
    () => new Set(spellClass?.spells.map((spell) => spell.slug) ?? []),
    [spellClass?.spells],
  );

  const castContext = useMemo(() => {
    if (!computed || !spellClass) return null;
    const info = getClassCastingInfo(spellClass.classSlug, spellClass.label);
    const casterLevel = isHalfCaster(info)
      ? halfCasterEffectiveLevel(spellClass.casterLevel)
      : spellClass.casterLevel;
    return {
      casterLevel,
      spellLevel: pendingSpellLevel,
      dcModifier: computed.dcModifier,
    };
  }, [computed, spellClass, pendingSpellLevel]);

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-actions-panel" role="tabpanel">
      <CombatSummary state={state} compendium={compendium} patch={patch} />

      {!spellClass || !computed ? (
        <p className="pc-sheet-empty">
          Select a spellcasting class on the Main tab to configure spells.
        </p>
      ) : (
        <>
          <div className="npc-sheet-block">
            <h3>Spellcasting</h3>
            {state.spellClasses.length > 1 ? (
              <label className="pc-spell-class-picker">
                <span className="npc-sheet-sub">Spell class</span>
                <select
                  className="pc-sheet-input pc-sheet-select"
                  value={activeSpellClassIndex}
                  onChange={(e) => onSpellClassIndexChange(Number(e.target.value))}
                >
                  {state.spellClasses.map((sc, i) => (
                    <option key={sc.classSlug} value={i}>
                      {sc.label} (CL {sc.casterLevel})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="npc-sheet-sub">
                {spellClass.label} · CL {spellClass.casterLevel}
              </p>
            )}

            <dl className="pc-actions-casting-meta">
              <div>
                <dt>Mode</dt>
                <dd>{castingModeLabel(computed.mode)}</dd>
              </div>
              <div>
                <dt>DC ability</dt>
                <dd>
                  {computed.dcAbility.toUpperCase()} {formatModifier(computed.dcModifier)}
                </dd>
              </div>
            </dl>

            <p className="npc-sheet-sub pc-sheet-slots-label">Spells per day</p>
            <div className="pc-slot-grid" title="Computed from class level and casting ability">
              {Array.from({ length: 10 }, (_, lvl) => (
                <div
                  key={lvl}
                  className={
                    computed.slots[lvl] > 0
                      ? "pc-slot-cell pc-slot-cell--active"
                      : "pc-slot-cell"
                  }
                >
                  <span className="pc-slot-label">L{lvl}</span>
                  <span className="pc-slot-count">{computed.slots[lvl]}</span>
                  {computed.bonusSlots[lvl] > 0 ? (
                    <span className="pc-slot-bonus" title="Ability bonus slots">
                      +{computed.bonusSlots[lvl]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="npc-sheet-block">
            <h3>{computed.mode === "spontaneous" ? "Spells known" : "Preparation"}</h3>
            <div className="pc-spell-add-row">
              <label className="pc-spell-level-pick">
                <span className="npc-sheet-sub">Level</span>
                <select
                  className="pc-sheet-input pc-sheet-select pc-sheet-input--narrow"
                  value={pendingSpellLevel}
                  onChange={(e) => setPendingSpellLevel(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, lvl) => (
                    <option key={lvl} value={lvl}>
                      L{lvl}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setSpellPickerOpen(true)}
              >
                Add spell
              </button>
            </div>

            <PcSpellPickerDialog
              open={spellPickerOpen}
              onClose={() => setSpellPickerOpen(false)}
              classSlug={spellClass.classSlug}
              classLabel={spellClass.label}
              level={pendingSpellLevel}
              castContext={castContext!}
              addedSpellSlugs={addedSpellSlugs}
              onAddSpell={(slug, name) => onAddSpell(slug, name, pendingSpellLevel)}
            />

            {spellClass.spells.length === 0 ? (
              <p className="pc-sheet-empty">No spells added.</p>
            ) : (
              <ul className="pc-spell-by-level">
                {Array.from({ length: 10 }, (_, lvl) => {
                  const atLevel = spellClass.spells.filter((s) => s.level === lvl);
                  if (atLevel.length === 0) return null;
                  const slotLimit = computed.slots[lvl] ?? 0;
                  const preparedTotal = preparedCountAtLevel(spellClass.spells, lvl);
                  const knownLimit = computed.known[lvl] ?? 0;
                  return (
                    <li key={lvl}>
                      <strong>
                        Level {lvl}
                        {computed.mode === "preparation"
                          ? ` (${preparedTotal}/${slotLimit} prepared)`
                          : ` (${atLevel.length}/${knownLimit || "—"} known · ${slotLimit}/day)`}
                      </strong>
                      <ul className="pc-feat-list pc-feat-list--editable pc-spell-accordion-list">
                        {atLevel.map((sp) => (
                          <PcSpellListItem
                            key={sp.slug}
                            spell={sp}
                            mode={computed.mode}
                            slotLimit={slotLimit}
                            castContext={{
                              casterLevel: spellClass.casterLevel,
                              spellLevel: sp.level,
                              dcModifier: computed.dcModifier,
                            }}
                            onRemove={() => onRemoveSpell(sp.slug)}
                            onUpdatePrepared={(prepared) =>
                              onUpdateSpellPrepared(sp.slug, prepared)
                            }
                          />
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
