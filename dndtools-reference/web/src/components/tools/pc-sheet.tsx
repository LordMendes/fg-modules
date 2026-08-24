"use client";

import { useState } from "react";
import type { PcCompendiumBundle } from "@/lib/entities";
import { PcAbilitiesPanel } from "@/components/tools/pc-abilities-panel";
import { PcActionsPanel } from "@/components/tools/pc-actions-panel";
import { PcCombatPanel } from "@/components/tools/pc-combat-panel";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { FgSheetTabs } from "@/components/fg-sheet-tabs";
import type { CategoryKey } from "@/lib/categories";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import {
  computeSkillPointSummary,
  computeSkillTotal,
  formatSkillModifier,
  formatSkillPointBudgetLine,
} from "@/lib/pc-planner/skillPoints";
import { abilityRacialMod, racialModLabel } from "@/lib/pc-planner/syncDerived";
import {
  PC_SHEET_TABS,
  type AbilityKey,
  type PcPlanState,
  type PcSheetTab,
} from "@/lib/pc-planner/types";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const RACE_SEARCH_CATEGORIES: CategoryKey[] = ["races"];
const CLASS_SEARCH_CATEGORIES: CategoryKey[] = ["classes"];

function abilityMod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export type PcSheetProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  sheetTab: PcSheetTab;
  onTabChange: (tab: PcSheetTab) => void;
  shortcut: string;
  onShortcutChange: (value: string) => void;
  onNameBlur: () => void;
  onShortcutBlur: () => void;
  activeSpellClassIndex: number;
  onSpellClassIndexChange: (index: number) => void;
  compendium: PcCompendiumBundle | null;
  compendiumLoading?: boolean;
  onAddFeat: (slug: string, name: string) => void;
  onRemoveFeat: (slug: string) => void;
  onAddSpell: (slug: string, name: string, level: number) => void;
  onRemoveSpell: (slug: string) => void;
  onUpdateSpellPrepared: (slug: string, prepared: number) => void;
  onAddInventoryRow: () => void;
  updateAbility: (key: AbilityKey, value: number) => void;
};

function clampClassLevel(level: number): number {
  return Math.max(1, Math.min(20, level));
}

function totalCharacterLevel(classLevels: PcPlanState["identity"]["classLevels"]): number {
  return classLevels.reduce((sum, cl) => sum + cl.level, 0);
}

export function PcSheet({
  state,
  patch,
  sheetTab,
  onTabChange,
  shortcut,
  onShortcutChange,
  onNameBlur,
  onShortcutBlur,
  activeSpellClassIndex,
  onSpellClassIndexChange,
  compendium,
  compendiumLoading = false,
  onAddFeat,
  onRemoveFeat,
  onAddSpell,
  onRemoveSpell,
  onUpdateSpellPrepared,
  onAddInventoryRow,
  updateAbility,
}: PcSheetProps) {
  const [racePickerOpen, setRacePickerOpen] = useState(false);

  const classLevels = state.identity.classLevels;
  const totalLevel = totalCharacterLevel(classLevels);
  const abilityBase = state.abilityBase ?? state.abilities;
  const raceFeatures = compendium?.raceFeatures ?? null;
  const hasRace = Boolean(state.identity.raceSlug);
  const showRacePicker = !hasRace || racePickerOpen;

  const skillPoints = computeSkillPointSummary(
    state,
    compendium?.classSkillPointBases ?? {},
    compendium?.raceFeatures?.skillPointBonus ?? null,
    state.identity.race || undefined,
  );

  return (
    <div className="pc-sheet-body" aria-label="Character sheet">
      <FgSheetTabs
        tabs={PC_SHEET_TABS}
        value={sheetTab}
        onChange={onTabChange}
        ariaLabel="Character sheet tabs"
      />

      <div className="pc-sheet-panel-area">
        {sheetTab === "main" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-header">
              <input
                type="text"
                className="pc-sheet-input pc-sheet-input--title npc-sheet-name"
                value={state.identity.name}
                placeholder="Character name"
                aria-label="Character name"
                onChange={(e) =>
                  patch((s) => {
                    s.identity.name = e.target.value;
                  })
                }
                onBlur={onNameBlur}
              />
              <dl className="npc-sheet-stats pc-sheet-meta">
                <div>
                  <dt>Shortcut</dt>
                  <dd>
                    <input
                      type="text"
                      className="pc-sheet-input"
                      placeholder="e.g. hwizard"
                      value={shortcut}
                      aria-label="Shortcut alias"
                      onChange={(e) => onShortcutChange(e.target.value)}
                      onBlur={onShortcutBlur}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Race</dt>
                  <dd>
                    {showRacePicker ? (
                      <EntitySearchCombobox
                        categories={RACE_SEARCH_CATEGORIES}
                        placeholder="Search races…"
                        label="Search races"
                        onSelect={(hit) => {
                          patch((s) => {
                            s.identity.race = hit.name;
                            s.identity.raceSlug = hit.slug;
                          });
                          setRacePickerOpen(false);
                        }}
                      />
                    ) : (
                      <div className="pc-sheet-race-value">
                        <span>{state.identity.race}</span>
                        <button
                          type="button"
                          className="pc-sheet-link-btn"
                          onClick={() => setRacePickerOpen(true)}
                        >
                          Change
                        </button>
                      </div>
                    )}
                    {showRacePicker && hasRace ? (
                      <button
                        type="button"
                        className="pc-sheet-link-btn pc-sheet-link-btn--cancel"
                        onClick={() => setRacePickerOpen(false)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Alignment</dt>
                  <dd>
                    <input
                      type="text"
                      className="pc-sheet-input"
                      value={state.identity.alignment}
                      onChange={(e) =>
                        patch((s) => {
                          s.identity.alignment = e.target.value;
                        })
                      }
                    />
                  </dd>
                </div>
              </dl>
            </div>

            <div className="npc-sheet-block">
              <h3>Classes</h3>
              {classLevels.length === 0 ? (
                <p className="pc-sheet-empty">Add a class below.</p>
              ) : (
                <ul className="pc-class-list">
                  {classLevels.map((cl, index) => {
                    const info = getClassCastingInfo(cl.classSlug, cl.className);
                    return (
                      <li key={`${cl.classSlug}-${index}`} className="pc-class-row">
                        <div className="pc-class-row-main">
                          <a
                            href={`/classes/${cl.classSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pc-class-name pc-feat-link"
                          >
                            {cl.className}
                          </a>
                          {info ? (
                            <span className="pc-class-casting">
                              {info.dcAbility.toUpperCase()}
                              {info.progression === "half" ? " · half caster" : ""}
                            </span>
                          ) : null}
                        </div>
                        <label className="pc-class-level">
                          <span className="npc-sheet-sub">Lvl</span>
                          <input
                            type="number"
                            className="pc-sheet-input pc-sheet-input--narrow"
                            min={1}
                            max={20}
                            value={cl.level}
                            aria-label={`${cl.className} level`}
                            onChange={(e) =>
                              patch((s) => {
                                if (!s.identity.classLevels[index]) return;
                                s.identity.classLevels[index].level = clampClassLevel(
                                  Number(e.target.value),
                                );
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="tool-btn tool-btn--ghost tool-btn--compact"
                          onClick={() =>
                            patch((s) => {
                              s.identity.classLevels.splice(index, 1);
                            })
                          }
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="npc-sheet-sub pc-class-total">
                Total character level: {totalLevel || "—"}
              </p>
              <EntitySearchCombobox
                categories={CLASS_SEARCH_CATEGORIES}
                placeholder="Search classes to add…"
                label="Add class"
                onSelect={(hit) =>
                  patch((s) => {
                    if (s.identity.classLevels.some((cl) => cl.classSlug === hit.slug)) {
                      return;
                    }
                    s.identity.classLevels.push({
                      classSlug: hit.slug,
                      className: hit.name,
                      level: 1,
                    });
                  })
                }
              />
            </div>

            <div className="npc-sheet-block">
              <h3>Ability Scores</h3>
              <div className="npc-sheet-abilities">
                {ABILITY_KEYS.map((key) => {
                  const racial = abilityRacialMod(key, raceFeatures);
                  return (
                    <div key={key} className="pc-ability-cell">
                      <span className="pc-ability-label">{key.toUpperCase()}</span>
                      <div className="pc-ability-row">
                        <div className="pc-ability-col pc-ability-col--score">
                          <span className="pc-ability-col-label">Score</span>
                          <div className="pc-ability-score-value">
                            <input
                              type="number"
                              className="pc-sheet-input pc-sheet-input--ability"
                              min={1}
                              max={99}
                              value={abilityBase[key]}
                              aria-label={`${key.toUpperCase()} score`}
                              onChange={(e) => updateAbility(key, Number(e.target.value))}
                            />
                            {hasRace && abilityBase[key] !== state.abilities[key] ? (
                              <span className="pc-ability-effective" aria-label={`Effective ${key.toUpperCase()} with racial`}>
                                ({state.abilities[key]})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="pc-ability-sep" aria-hidden="true">
                          |
                        </span>
                        <div className="pc-ability-col pc-ability-col--mod">
                          <span className="pc-ability-col-label">Modifier</span>
                          <span className="pc-sheet-mod">{abilityMod(state.abilities[key])}</span>
                        </div>
                      </div>
                      {hasRace && racialModLabel(racial) ? (
                        <span className="pc-sheet-racial-mod">{racialModLabel(racial)}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {sheetTab === "combat" && (
          <PcCombatPanel
            state={state}
            patch={patch}
            raceFeatures={compendium?.raceFeatures ?? null}
            classFeatures={compendium?.classFeatures ?? null}
          />
        )}

        {sheetTab === "skills" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-block">
              <div className="pc-skills-header">
                <h3>Skills</h3>
                {state.skills.length > 0 ? (
                  <span
                    className={`pc-skill-points-summary${
                      skillPoints.spent > skillPoints.available ? " pc-skill-points-summary--over" : ""
                    }`}
                  >
                    <span className="pc-skill-points-wrap" tabIndex={0}>
                      {skillPoints.spent} / {skillPoints.available}
                      {skillPoints.breakdown.length > 0 ? (
                        <span className="pc-skill-tooltip" role="tooltip">
                          {skillPoints.breakdown.map((line, index) => (
                            <span
                              key={`${line.label}-${index}`}
                              className={
                                line.indent
                                  ? "pc-skill-tooltip-line pc-skill-tooltip-line--indent"
                                  : "pc-skill-tooltip-line"
                              }
                            >
                              {formatSkillPointBudgetLine(line)}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </span>
                ) : null}
              </div>
              {state.skills.length === 0 ? (
                <p className="pc-sheet-empty">Add a class on the Main tab to load skills.</p>
              ) : (
                <table className="entity-table pc-sheet-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Ability</th>
                      <th>Ranks</th>
                      <th>Racial</th>
                      <th>Misc</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.skills.map((row, i) => (
                      <tr key={row.slug ?? row.name} className="pc-sheet-editable-row">
                        <td>{row.name}</td>
                        <td>{row.ability ?? "—"}</td>
                        <td>
                          <input
                            type="number"
                            className="pc-sheet-input pc-sheet-input--narrow"
                            value={row.ranks}
                            onChange={(e) =>
                              patch((s) => {
                                s.skills[i].ranks = Number(e.target.value);
                              })
                            }
                          />
                        </td>
                        <td className="pc-skill-racial">
                          {(row.racialMisc ?? 0) === 0
                            ? "—"
                            : row.racialMisc! >= 0
                              ? `+${row.racialMisc}`
                              : row.racialMisc}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pc-sheet-input pc-sheet-input--narrow"
                            value={row.misc}
                            onChange={(e) =>
                              patch((s) => {
                                s.skills[i].misc = Number(e.target.value);
                              })
                            }
                          />
                        </td>
                        <td className="pc-skill-total">
                          {formatSkillModifier(computeSkillTotal(row, state.abilities))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {sheetTab === "abilities" && (
          <PcAbilitiesPanel
            state={state}
            compendium={compendium}
            loading={compendiumLoading}
            onAddFeat={onAddFeat}
            onRemoveFeat={onRemoveFeat}
          />
        )}

        {sheetTab === "inventory" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-block">
              <h3>Inventory</h3>
              {state.inventory.length === 0 ? (
                <p className="pc-sheet-empty">No items yet.</p>
              ) : (
                <table className="entity-table pc-sheet-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Wt</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.inventory.map((row, i) => (
                      <tr key={i} className="pc-sheet-editable-row">
                        <td>
                          <input
                            type="text"
                            className="pc-sheet-input"
                            value={row.name}
                            placeholder="Item"
                            onChange={(e) =>
                              patch((s) => {
                                s.inventory[i].name = e.target.value;
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pc-sheet-input pc-sheet-input--narrow"
                            value={row.quantity}
                            onChange={(e) =>
                              patch((s) => {
                                s.inventory[i].quantity = Number(e.target.value);
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="pc-sheet-input pc-sheet-input--narrow"
                            value={row.weight}
                            onChange={(e) =>
                              patch((s) => {
                                s.inventory[i].weight = Number(e.target.value);
                              })
                            }
                          />
                        </td>
                        <td className="pc-sheet-row-actions">
                          <button
                            type="button"
                            className="tool-btn tool-btn--ghost tool-btn--compact"
                            onClick={() =>
                              patch((s) => {
                                s.inventory.splice(i, 1);
                              })
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                type="button"
                className="tool-btn pc-sheet-add-btn"
                onClick={onAddInventoryRow}
              >
                Add item
              </button>
            </div>
          </div>
        )}

        {sheetTab === "notes" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-block">
              <h3>Notes</h3>
              <textarea
                className="pc-sheet-input pc-sheet-textarea pc-sheet-notes-area"
                rows={14}
                value={state.notes}
                placeholder="Character notes, backstory, reminders…"
                onChange={(e) =>
                  patch((s) => {
                    s.notes = e.target.value;
                  })
                }
              />
            </div>
          </div>
        )}

        {sheetTab === "actions" && (
          <PcActionsPanel
            state={state}
            patch={patch}
            compendium={compendium}
            activeSpellClassIndex={activeSpellClassIndex}
            onSpellClassIndexChange={onSpellClassIndexChange}
            onAddSpell={onAddSpell}
            onRemoveSpell={onRemoveSpell}
            onUpdateSpellPrepared={onUpdateSpellPrepared}
          />
        )}
      </div>
    </div>
  );
}
