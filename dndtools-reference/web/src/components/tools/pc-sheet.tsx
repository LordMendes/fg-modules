"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { fetchEntityPreview } from "@/actions/data";
import type { EntityPreview, PcCompendiumBundle } from "@/lib/entities";
import { PcAbilitiesPanel } from "@/components/tools/pc-abilities-panel";
import { PcActionsPanel } from "@/components/tools/pc-actions-panel";
import { PcCombatPanel } from "@/components/tools/pc-combat-panel";
import { PcStatusPanel } from "@/components/tools/pc-status-panel";
import { PcInventoryPanel } from "@/components/tools/pc-inventory-panel";
import { PcSensesLanguagesBlock } from "@/components/tools/pc-identity-extra";
import { PcMainAbilities } from "@/components/tools/pc-main/abilities";
import { PcMainAlias } from "@/components/tools/pc-main/alias";
import { PcMainBiography } from "@/components/tools/pc-main/biography";
import { BonusSourcesHint } from "@/components/tools/pc-main/bonus-sources-hint";
import { PcMainClasses } from "@/components/tools/pc-main/classes";
import { PcMainDefenses } from "@/components/tools/pc-main/defenses";
import { PcMainDivineArcane } from "@/components/tools/pc-main/divine-arcane";
import { PcMainProfile } from "@/components/tools/pc-main/profile";
import { RollableStat } from "@/components/dice/rollable-stat";
import { EntityPreviewModal } from "@/components/entity-preview-modal";
import { FgSheetTabs } from "@/components/fg-sheet-tabs";
import { useSessionNonce } from "@/components/session-provider";
import { computeEquippedGear } from "@/lib/pc-planner/equippedGear";
import { computeEncumbrance } from "@/lib/pc-planner/encumbrance";
import { computeEquippedBonuses, skillItemBonus } from "@/lib/pc-planner/itemBonuses";
import { deriveFeatEffects, featSkillBonus } from "@/lib/pc-planner/parseFeatEffects";
import { resolveClassFeaturesForPlan } from "@/lib/pc-planner/resolveCompendium";
import {
  computeSkillPointSummary,
  computeSkillTotal,
  formatSkillModifier,
  formatSkillPointBudgetLine,
  isClassSkillRow,
  maxSkillRanks,
  totalCharacterLevel as skillHitDice,
} from "@/lib/pc-planner/skillPoints";
import {
  canRemoveSpecialtyRow,
  coerceSkillRanks,
  createSpecialtySkillRow,
  SPECIALTY_FAMILIES,
  SPECIALTY_FAMILY_LABELS,
  specialtyPreviewSlug,
  specialtyVariantOptions,
  type SpecialtyFamily,
} from "@/lib/pc-planner/skillSpecialty";
import { classSkillKeySet } from "@/lib/pc-planner/syncSkills";
import { applyRacialSkillBonuses, normalizeAbilityDrain } from "@/lib/pc-planner/syncDerived";
import {
  PC_SHEET_TABS,
  type AbilityKey,
  type PcPlanState,
  type PcSheetTab,
} from "@/lib/pc-planner/types";

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
  onAddFeat: (slug: string, name: string, choice?: string) => void;
  onRemoveFeat: (slug: string) => void;
  onAddSpell: (slug: string, name: string, level: number) => void;
  onRemoveSpell: (slug: string) => void;
  onUpdateSpellPrepared: (slug: string, prepared: number) => void;
  onAddInventoryRow: () => void;
  updateAbility: (key: AbilityKey, value: number) => void;
  /** When set, enables profile/token image upload for this plan. */
  planId?: string | null;
  /** When true, sheet fields are display-only (DM viewing another player's PC). Rolls still work. */
  readOnly?: boolean;
};

export function PcSheet({
  state,
  patch: patchProp,
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
  planId = null,
  readOnly = false,
}: PcSheetProps) {
  const patch = useCallback(
    (fn: (draft: PcPlanState) => void) => {
      if (readOnly) return;
      patchProp(fn);
    },
    [patchProp, readOnly],
  );
  const nonce = useSessionNonce();
  const [skillPreview, setSkillPreview] = useState<EntityPreview | null>(null);
  const [skillPreviewLoading, setSkillPreviewLoading] = useState(false);
  const [skillPreviewError, setSkillPreviewError] = useState<string | null>(null);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addSkillFamily, setAddSkillFamily] = useState<SpecialtyFamily>("craft");
  const [addSkillVariant, setAddSkillVariant] = useState("");
  const addSkillListId = useId();

  const openSkillPreview = useCallback(
    async (slug: string | null | undefined) => {
      setSkillPreview(null);
      setSkillPreviewError(null);
      setSkillPreviewLoading(true);

      if (!slug) {
        setSkillPreviewLoading(false);
        setSkillPreviewError("Could not load entry");
        return;
      }

      const result = await fetchEntityPreview({
        category: "skills",
        slug,
        nonce,
      });

      setSkillPreviewLoading(false);
      if (!result.success || !result.entity) {
        setSkillPreviewError(result.error ?? "Could not load entry");
        return;
      }
      setSkillPreview(result.entity);
    },
    [nonce],
  );

  const closeSkillPreview = useCallback(() => {
    setSkillPreview(null);
    setSkillPreviewError(null);
    setSkillPreviewLoading(false);
  }, []);

  const classLevels = state.identity.classLevels;
  const raceFeatures = compendium?.raceFeatures ?? null;

  const classSkillKeys = classSkillKeySet(compendium?.skills ?? []);
  const skillHd = skillHitDice(classLevels);
  const equippedGear = computeEquippedGear(state.inventory ?? [], state.combat.speedBase);
  const featEffects = deriveFeatEffects(state.feats);
  const resolvedClassFeatures = resolveClassFeaturesForPlan(compendium, state);
  const encumbrance = computeEncumbrance(state, {
    raceFeatures,
    featFeatures: featEffects,
    classFeatures: resolvedClassFeatures,
    equippedGear,
  });
  const skillAcp = encumbrance.totalAcp;
  const equippedItemBonuses = computeEquippedBonuses(state.inventory);
  const skillPoints = computeSkillPointSummary(
    state,
    compendium?.classSkillPointBases ?? {},
    compendium?.raceFeatures?.skillPointBonus ?? null,
    state.identity.race || undefined,
    classSkillKeys,
  );
  const skillCatalog = compendium?.allSkills ?? [];
  const addSkillOptions = useMemo(
    () => specialtyVariantOptions(addSkillFamily, skillCatalog),
    [addSkillFamily, skillCatalog],
  );

  function addSpecialtySkill() {
    const created = createSpecialtySkillRow(
      addSkillFamily,
      addSkillVariant,
      skillCatalog,
      state.skills,
    );
    if (!created) return;
    const row = raceFeatures
      ? applyRacialSkillBonuses([created], raceFeatures.skillBonuses)[0]
      : created;
    patch((s) => {
      s.skills.push(row);
    });
    setAddSkillVariant("");
    setAddSkillOpen(false);
  }

  function removeSkillAt(index: number) {
    patch((s) => {
      s.skills.splice(index, 1);
    });
  }

  return (
    <div
      className={`pc-sheet-body${readOnly ? " pc-sheet-body--readonly" : ""}`}
      aria-label="Character sheet"
      aria-readonly={readOnly || undefined}
    >
      <FgSheetTabs
        tabs={PC_SHEET_TABS}
        value={sheetTab}
        onChange={onTabChange}
        ariaLabel="Character sheet tabs"
      />

      <div className="pc-sheet-panel-area">
        {sheetTab === "main" && (
          <div className="npc-sheet-panel pc-sheet-section pc-main-layout" role="tabpanel">
            <div className="pc-main-col-identity">
              <PcMainProfile
                state={state}
                patch={patch}
                planId={planId}
                readOnly={readOnly}
                onNameBlur={onNameBlur}
              />
              <PcMainClasses state={state} patch={patch} />
              <PcMainDivineArcane state={state} patch={patch} />
            </div>
            <div className="pc-main-stats">
              <PcMainAbilities
                state={state}
                patch={patch}
                raceFeatures={raceFeatures}
                updateAbility={updateAbility}
              />
              <PcMainDefenses
                state={state}
                raceFeatures={raceFeatures}
                classFeatures={resolvedClassFeatures}
                classAdvancement={compendium?.classAdvancement ?? null}
              />
            </div>
            <PcSensesLanguagesBlock state={state} patch={patch} readOnly={readOnly} />
            <PcMainBiography state={state} patch={patch} readOnly={readOnly} />
            <PcMainAlias
              shortcut={shortcut}
              onShortcutChange={onShortcutChange}
              onShortcutBlur={onShortcutBlur}
            />
          </div>
        )}

        {sheetTab === "combat" && (
          <PcCombatPanel
            state={state}
            patch={patch}
            raceFeatures={compendium?.raceFeatures ?? null}
            classFeatures={resolvedClassFeatures}
            classAdvancement={compendium?.classAdvancement ?? null}
            classHitDice={compendium?.classHitDice ?? null}
          />
        )}

        {sheetTab === "status" && <PcStatusPanel state={state} patch={patch} />}

        {sheetTab === "skills" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-block">
              <div className="pc-skills-header">
                <h3>Skills</h3>
                <div className="pc-skills-header-actions">
                  <label className="pc-checkbox-label pc-skills-synergy-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(state.combat.suppressSynergies)}
                      onChange={(e) =>
                        patch((s) => {
                          s.combat.suppressSynergies = e.target.checked;
                        })
                      }
                    />
                    Suppress synergies
                  </label>
                  {skillCatalog.length > 0 || state.skills.length > 0 ? (
                    <button
                      type="button"
                      className="tool-btn-secondary pc-skill-add-toggle"
                      aria-expanded={addSkillOpen}
                      onClick={() => setAddSkillOpen((open) => !open)}
                    >
                      Add skill
                    </button>
                  ) : null}
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
              </div>
              {addSkillOpen ? (
                <form
                  className="pc-skill-add-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addSpecialtySkill();
                  }}
                >
                  <label className="pc-skill-add-field">
                    <span className="npc-sheet-sub">Skill</span>
                    <select
                      className="pc-sheet-input pc-sheet-select"
                      value={addSkillFamily}
                      onChange={(event) => {
                        setAddSkillFamily(event.target.value as SpecialtyFamily);
                        setAddSkillVariant("");
                      }}
                    >
                      {SPECIALTY_FAMILIES.map((family) => (
                        <option key={family} value={family}>
                          {SPECIALTY_FAMILY_LABELS[family]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pc-skill-add-field pc-skill-add-field--variant">
                    <span className="npc-sheet-sub">Variant</span>
                    <input
                      className="pc-sheet-input"
                      list={addSkillListId}
                      value={addSkillVariant}
                      placeholder="weaponsmithing"
                      onChange={(event) => setAddSkillVariant(event.target.value)}
                    />
                    <datalist id={addSkillListId}>
                      {addSkillOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </label>
                  <button
                    type="submit"
                    className="tool-btn-primary"
                    disabled={!addSkillVariant.trim()}
                  >
                    Add
                  </button>
                </form>
              ) : null}
              {state.skills.length === 0 ? (
                <p className="pc-sheet-empty">Skills load from the compendium when you open a character.</p>
              ) : (
                <>
                  <p className="pc-skill-legend">
                    <span className="pc-skill-legend-item">
                      <span className="pc-skill-trained" aria-hidden="true">
                        *
                      </span>{" "}
                      Trained only
                    </span>
                    <span className="pc-skill-legend-item">
                      <span className="pc-skill-acp-mark" aria-hidden="true">
                        †
                      </span>{" "}
                      Armor check penalty
                    </span>
                  </p>
                  <table className="entity-table pc-sheet-table">
                  <thead>
                    <tr>
                      <th title="Class skill">C</th>
                      <th>Skill</th>
                      <th>Ability</th>
                      <th>Ranks</th>
                      <th>Racial</th>
                      <th>Syn</th>
                      <th>Misc</th>
                      <th>ACP</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.skills.map((row, i) => {
                      const isClass = isClassSkillRow(row, classSkillKeys);
                      const maxRanks = maxSkillRanks(skillHd, isClass);
                      const overMax = row.ranks > maxRanks;
                      const acpValue = row.armorCheckPenalty ? skillAcp : 0;
                      const itemSkill = skillItemBonus(equippedItemBonuses, row);
                      const featSkill = featSkillBonus(featEffects, row.name, row.slug);
                      const total = computeSkillTotal(
                        row,
                        state.abilities,
                        skillAcp,
                        itemSkill.total + featSkill,
                      );
                      const canRemove = canRemoveSpecialtyRow(row, classSkillKeys);
                      return (
                        <tr
                          key={row.slug ?? row.name}
                          className={`pc-sheet-editable-row${overMax ? " pc-skill-row--over" : ""}`}
                        >
                          <td className="pc-skill-class-mark" title={isClass ? "Class skill" : "Cross-class"}>
                            {isClass ? "•" : ""}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="pc-skill-name-btn"
                              onClick={() => void openSkillPreview(specialtyPreviewSlug(row, skillCatalog))}
                            >
                              {row.name}
                            </button>
                            {row.trainedOnly ? (
                              <span className="pc-skill-trained" title="Trained only">
                                *
                              </span>
                            ) : null}
                            {row.armorCheckPenalty ? (
                              <span className="pc-skill-acp-mark" title="Armor check penalty">
                                †
                              </span>
                            ) : null}
                            {canRemove ? (
                              <button
                                type="button"
                                className="pc-skill-remove"
                                aria-label={`Remove ${row.name}`}
                                onClick={() => removeSkillAt(i)}
                              >
                                ×
                              </button>
                            ) : null}
                          </td>
                          <td>{row.ability ?? "—"}</td>
                          <td>
                            <input
                              type="number"
                              className={`pc-sheet-input pc-sheet-input--narrow${
                                overMax ? " pc-sheet-input--warn" : ""
                              }`}
                              step={1}
                              min={0}
                              value={row.ranks}
                              title={overMax ? `Max ranks ${maxRanks}` : `Max ${maxRanks}`}
                              onChange={(e) =>
                                patch((s) => {
                                  s.skills[i].ranks = coerceSkillRanks(Number(e.target.value));
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
                          <td className="pc-skill-synergy">
                            {(row.synergyMisc ?? 0) === 0
                              ? "—"
                              : row.synergyMisc! >= 0
                                ? `+${row.synergyMisc}`
                                : row.synergyMisc}
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
                          <td className="pc-skill-acp">
                            {row.armorCheckPenalty
                              ? acpValue === 0
                                ? "—"
                                : formatSkillModifier(acpValue)
                              : "—"}
                          </td>
                          <td className="pc-skill-total">
                            {total == null ? (
                              "—"
                            ) : (
                              <span className="pc-skill-total-wrap">
                                <RollableStat label={row.name} modifier={total} kind="skill" />
                                <BonusSourcesHint
                                  amount={itemSkill.total}
                                  sources={itemSkill.sources}
                                  ariaLabel={`${row.name} item bonus ${itemSkill.total}`}
                                />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </div>
        )}

        {sheetTab === "abilities" && (
          <PcAbilitiesPanel
            state={state}
            patch={patch}
            compendium={compendium}
            loading={compendiumLoading}
            onAddFeat={onAddFeat}
            onRemoveFeat={onRemoveFeat}
          />
        )}

        {sheetTab === "inventory" && (
          <PcInventoryPanel
            state={state}
            patch={patch}
            onAddInventoryRow={onAddInventoryRow}
            raceFeatures={raceFeatures}
            classFeatures={resolvedClassFeatures}
          />
        )}

        {sheetTab === "notes" && (
          <div className="npc-sheet-panel pc-sheet-section pc-sheet-section--notes" role="tabpanel">
            <div className="npc-sheet-block">
              <h3>Notes</h3>
              <textarea
                className="pc-sheet-input pc-sheet-textarea pc-sheet-notes-area"
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
            pcPlanId={planId ?? null}
            onGoToCombatTab={() => onTabChange("combat")}
          />
        )}
      </div>

      {(skillPreviewLoading || skillPreview || skillPreviewError) && (
        <EntityPreviewModal
          entity={skillPreview}
          loading={skillPreviewLoading}
          error={skillPreviewError}
          onClose={closeSkillPreview}
        />
      )}
    </div>
  );
}
