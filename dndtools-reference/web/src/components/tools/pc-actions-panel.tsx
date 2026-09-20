"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { PcCompendiumBundle } from "@/lib/entities";
import { RollableStat } from "@/components/dice/rollable-stat";
import { PcSpellPickerDialog } from "@/components/tools/pc-spell-picker-dialog";
import { PcSpellListItem } from "@/components/tools/pc-spell-list-item";
import { PcItemSpellListItem } from "@/components/tools/pc-item-spell-list-item";
import { PcWeaponAttacksList } from "@/components/tools/pc-weapon-attacks-list";
import { PcSpecialAttacksActions } from "@/components/tools/pc-special-attacks-actions";
import { castingModeLabel, getClassCastingInfo, halfCasterEffectiveLevel, isHalfCaster } from "@/lib/pc-planner/classCasting";
import {
  computeCombatStats,
  formatModifier,
} from "@/lib/pc-planner/combatStats";
import {
  computeItemSpellActions,
  restoreItemCharge,
  spendItemCharge,
} from "@/lib/pc-planner/itemSpells";
import {
  collectPrestigeCasterContributions,
  stackedCasterLevel,
} from "@/lib/pc-planner/prestigeCasting";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import { resolveClassFeaturesForPlan } from "@/lib/pc-planner/resolveCompendium";
import { formatDerivedHint } from "@/lib/pc-planner/derivedField";
import {
  computeSpellClass,
  preparedCountAtLevel,
} from "@/lib/pc-planner/spellSlots";
import { computeNaturalAttackRows } from "@/lib/pc-planner/specialAttacks";
import { computeWeaponAttackRows } from "@/lib/pc-planner/weaponAttacks";
import { PcResourcesPanel } from "@/components/tools/pc-actions-extras";
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
  pcPlanId?: string | null;
  onGoToCombatTab?: () => void;
};

function ShortcutStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pc-actions-shortcut-stat">
      <span className="pc-actions-shortcut-stat-label">{label}</span>
      <span className="pc-actions-shortcut-stat-value">{children}</span>
    </div>
  );
}

function CombatSummary({
  state,
  compendium,
  patch,
  pcPlanId,
  onGoToCombatTab,
}: {
  state: PcPlanState;
  compendium: PcCompendiumBundle | null;
  patch: PcActionsPanelProps["patch"];
  pcPlanId?: string | null;
  onGoToCombatTab?: () => void;
}) {
  const classFeatures = resolveClassFeaturesForPlan(compendium, state);
  const stats = computeCombatStats(
    state,
    compendium?.raceFeatures ?? null,
    classFeatures,
    compendium?.classAdvancement ?? null,
    deriveFeatEffects(state.feats),
  );
  const weapons = computeWeaponAttackRows(state, stats);
  const naturalWeapons = computeNaturalAttackRows(state, stats);
  const [shortcutOpen, setShortcutOpen] = useState(false);

  return (
    <div className="npc-sheet-block pc-actions-combat">
      <details
        className="pc-actions-combat-shortcut"
        open={shortcutOpen}
        onToggle={(event) => setShortcutOpen(event.currentTarget.open)}
      >
        <summary className="pc-actions-combat-shortcut-summary">
          <span className="pc-actions-combat-shortcut-summary-main">
            <span className="pc-actions-combat-shortcut-title">Combat shortcut</span>
            <span className="npc-sheet-sub pc-actions-combat-shortcut-desc">
              Quick reference for play. Edit HP, AC breakdown, and misc on the Combat tab.
            </span>
            <span className="pc-actions-combat-shortcut-preview" aria-hidden="true">
              AC {stats.ac.total} · Init {formatModifier(stats.initiative.total)} · Melee{" "}
              {formatModifier(stats.melee.total)} · Fort {formatModifier(stats.fortitude.total)}
            </span>
          </span>
          {onGoToCombatTab ? (
            <button
              type="button"
              className="tool-btn tool-btn--ghost tool-btn--compact pc-actions-combat-shortcut-link"
              onClick={(event) => {
                event.stopPropagation();
                onGoToCombatTab();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              Open Combat tab
            </button>
          ) : null}
        </summary>

        <div className="pc-actions-combat-groups">
          <div className="pc-actions-combat-group">
            <h4>Defense</h4>
            <div className="pc-actions-combat-group-stats">
              <ShortcutStat label="AC">{stats.ac.total}</ShortcutStat>
              <ShortcutStat label="Touch">{stats.touch.total}</ShortcutStat>
              <ShortcutStat label="Flat-footed">{stats.flatFooted.total}</ShortcutStat>
            </div>
          </div>

          <div className="pc-actions-combat-group">
            <h4>Attacks</h4>
            <div className="pc-actions-combat-group-stats">
              <ShortcutStat label="Init">
                <RollableStat label="Initiative" modifier={stats.initiative.total} kind="initiative" />
              </ShortcutStat>
              <ShortcutStat label="Melee">
                <RollableStat label="Melee" modifier={stats.melee.total} kind="attack" />
              </ShortcutStat>
              <ShortcutStat label="Ranged">
                <RollableStat label="Ranged" modifier={stats.ranged.total} kind="attack" />
              </ShortcutStat>
            </div>
          </div>

          <div className="pc-actions-combat-group">
            <h4>Saves</h4>
            <div className="pc-actions-combat-group-stats">
              <ShortcutStat label="Fort">
                <RollableStat label="Fortitude" modifier={stats.fortitude.total} kind="save" />
              </ShortcutStat>
              <ShortcutStat label="Ref">
                <RollableStat label="Reflex" modifier={stats.reflex.total} kind="save" />
              </ShortcutStat>
              <ShortcutStat label="Will">
                <RollableStat label="Will" modifier={stats.will.total} kind="save" />
              </ShortcutStat>
            </div>
          </div>

          <div className="pc-actions-combat-group">
            <h4>Movement</h4>
            <div className="pc-actions-combat-group-stats">
              <ShortcutStat label="Speed">{stats.speed.total} ft.</ShortcutStat>
            </div>
          </div>
        </div>
      </details>

      <div className="pc-actions-weapons">
        <h4 className="pc-actions-weapons-heading">Weapons</h4>
        <PcWeaponAttacksList weapons={weapons} pcPlanId={pcPlanId} />
      </div>

      {naturalWeapons.length > 0 ? (
        <div className="pc-actions-weapons pc-actions-natural-weapons">
          <h4 className="pc-actions-weapons-heading">Natural weapons</h4>
          <PcWeaponAttacksList weapons={naturalWeapons} pcPlanId={pcPlanId} />
        </div>
      ) : null}

      <PcSpecialAttacksActions state={state} />
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
  pcPlanId = null,
  onGoToCombatTab,
}: PcActionsPanelProps) {
  const [pendingSpellLevel, setPendingSpellLevel] = useState(1);
  const [spellPickerOpen, setSpellPickerOpen] = useState(false);
  const spellClass = state.spellClasses[activeSpellClassIndex];
  const classDescriptions = compendium?.classDescriptions ?? {};
  const prestigeContribs = useMemo(
    () => collectPrestigeCasterContributions(state.identity.classLevels, new Map(Object.entries(classDescriptions))),
    [state.identity.classLevels, classDescriptions],
  );
  const autoCasterLevel = spellClass
    ? stackedCasterLevel(spellClass, state.identity.classLevels, prestigeContribs)
    : 0;
  const showSpecialist =
    Boolean(state.identity.specialistSchool) ||
    spellClass?.classSlug === "wizard" ||
    spellClass?.label.toLowerCase().includes("wizard");
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

  const itemSpellActions = useMemo(
    () => computeItemSpellActions(state),
    [state.inventory],
  );

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-actions-panel" role="tabpanel">
      <CombatSummary
        state={state}
        compendium={compendium}
        patch={patch}
        pcPlanId={pcPlanId}
        onGoToCombatTab={onGoToCombatTab}
      />
      <PcResourcesPanel state={state} patch={patch} />

      {itemSpellActions.length > 0 ? (
        <div className="npc-sheet-block pc-actions-item-spells">
          <h3>Item spells</h3>
          <ul className="pc-spell-by-level">
            {itemSpellActions.map((action) => (
              <PcItemSpellListItem
                key={`${action.inventoryIndex}-${action.slug}`}
                action={action}
                onUse={() =>
                  patch((s) => {
                    const row = s.inventory[action.inventoryIndex];
                    if (row) spendItemCharge(row);
                  })
                }
                onRestore={() =>
                  patch((s) => {
                    const row = s.inventory[action.inventoryIndex];
                    if (row) restoreItemCharge(row);
                  })
                }
              />
            ))}
          </ul>
        </div>
      ) : null}

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

            <label className="pc-caster-level-override">
              <span className="npc-sheet-sub">
                Caster level{" "}
                <span className="pc-derived-hint">
                  {formatDerivedHint(
                    spellClass.casterLevelOverride != null,
                    spellClass.casterLevelOverride != null,
                  )}
                </span>
              </span>
              <input
                type="number"
                className="pc-sheet-input pc-sheet-input--narrow"
                min={1}
                placeholder={String(autoCasterLevel)}
                value={spellClass.casterLevelOverride ?? ""}
                onChange={(e) =>
                  patch((s) => {
                    const row = s.spellClasses[activeSpellClassIndex];
                    if (!row) return;
                    row.casterLevelOverride =
                      e.target.value === "" ? null : Number(e.target.value);
                  })
                }
              />
            </label>

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

            <p className="npc-sheet-sub pc-sheet-slots-label">
              {computed.mode === "spontaneous" ? "Slots used / per day" : "Spells per day"}
            </p>
            <div className="pc-slot-grid" title="Computed from class level and casting ability">
              {Array.from({ length: 10 }, (_, lvl) => {
                const maxSlots = computed.slots[lvl] ?? 0;
                const used = spellClass.slotsUsed?.[lvl] ?? 0;
                return (
                  <div
                    key={lvl}
                    className={
                      maxSlots > 0 ? "pc-slot-cell pc-slot-cell--active" : "pc-slot-cell"
                    }
                  >
                    <span className="pc-slot-label">L{lvl}</span>
                    {computed.mode === "spontaneous" && maxSlots > 0 ? (
                      <span className="pc-slot-used-row">
                        <input
                          type="number"
                          className="pc-sheet-input pc-sheet-input--narrow"
                          min={0}
                          max={maxSlots}
                          value={used}
                          onChange={(e) =>
                            patch((s) => {
                              const row = s.spellClasses[activeSpellClassIndex];
                              if (!row) return;
                              if (!row.slotsUsed) {
                                row.slotsUsed = Array.from({ length: 10 }, () => 0);
                              }
                              row.slotsUsed[lvl] = Math.max(
                                0,
                                Math.min(maxSlots, Number(e.target.value) || 0),
                              );
                            })
                          }
                        />
                        <span>/ {maxSlots}</span>
                      </span>
                    ) : (
                      <span className="pc-slot-count">{maxSlots}</span>
                    )}
                    {computed.bonusSlots[lvl] > 0 ? (
                      <span className="pc-slot-bonus" title="Ability bonus slots">
                        +{computed.bonusSlots[lvl]}
                      </span>
                    ) : null}
                  </div>
                );
              })}
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
              opposedSchools={state.identity.opposedSchools ?? []}
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
