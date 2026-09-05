"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { fetchEntityPreview } from "@/actions/data";
import type { EntityPreview, PcCompendiumBundle } from "@/lib/entities";
import { PcAbilitiesPanel } from "@/components/tools/pc-abilities-panel";
import { PcActionsPanel } from "@/components/tools/pc-actions-panel";
import { PcCombatPanel } from "@/components/tools/pc-combat-panel";
import { PcImageSlot } from "@/components/tools/pc-image-slot";
import { PcInventoryPanel } from "@/components/tools/pc-inventory-panel";
import { RollableStat } from "@/components/dice/rollable-stat";
import { EntityPreviewModal } from "@/components/entity-preview-modal";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { FgSheetTabs } from "@/components/fg-sheet-tabs";
import { useSessionNonce } from "@/components/session-provider";
import type { CategoryKey } from "@/lib/categories";
import { getClassCastingInfo } from "@/lib/pc-planner/classCasting";
import { computeEquippedGear } from "@/lib/pc-planner/equippedGear";
import { computeEncumbrance } from "@/lib/pc-planner/encumbrance";
import {
  computeEquippedBonuses,
  formatBonusSources,
  skillItemBonus,
} from "@/lib/pc-planner/itemBonuses";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
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
import {
  abilityRacialMod,
  applyRacialSkillBonuses,
  clampAbilityDamage,
  emptyAbilityDamage,
  racialModLabel,
} from "@/lib/pc-planner/syncDerived";
import {
  PC_SHEET_TABS,
  type AbilityKey,
  type PcPlanState,
  type PcSheetTab,
} from "@/lib/pc-planner/types";
import type { BonusSource } from "@/lib/pc-planner/itemBonuses";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const RACE_SEARCH_CATEGORIES: CategoryKey[] = ["races"];
const CLASS_SEARCH_CATEGORIES: CategoryKey[] = ["classes"];
const DEITY_SEARCH_CATEGORIES: CategoryKey[] = ["deities"];
const DOMAIN_SEARCH_CATEGORIES: CategoryKey[] = ["domains"];

function abilityMod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function BonusSourcesHint({
  amount,
  sources,
  ariaLabel,
}: {
  amount: number;
  sources: BonusSource[];
  ariaLabel: string;
}) {
  if (amount === 0 || sources.length === 0) return null;
  const signed = amount >= 0 ? `+${amount}` : `${amount}`;
  const lines = formatBonusSources(sources);
  return (
    <span className="pc-bonus-sources-wrap" tabIndex={0}>
      <span className="pc-ability-item-bonus" aria-label={ariaLabel}>
        ({amount})
      </span>
      <span className="pc-skill-tooltip pc-bonus-sources-tooltip" role="tooltip">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className="pc-skill-tooltip-line">
            {line}
          </span>
        ))}
        {sources.length > 1 ? (
          <span className="pc-skill-tooltip-line pc-skill-tooltip-line--indent">
            Total {signed}
          </span>
        ) : null}
      </span>
    </span>
  );
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
  /** When set, enables profile/token image upload for this plan. */
  planId?: string | null;
  /** When true, sheet fields are display-only (DM viewing another player's PC). Rolls still work. */
  readOnly?: boolean;
};

function clampClassLevel(level: number): number {
  return Math.max(1, Math.min(20, level));
}

function clampAbilityScore(value: number): number {
  if (!Number.isFinite(value)) return 10;
  return Math.max(1, Math.min(99, Math.round(value)));
}

function totalCharacterLevel(classLevels: PcPlanState["identity"]["classLevels"]): number {
  return classLevels.reduce((sum, cl) => sum + cl.level, 0);
}

function formatClassLine(classLevels: PcPlanState["identity"]["classLevels"]): string {
  return classLevels.map((cl) => `${cl.className} ${cl.level}`).join(" / ");
}

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
  const [racePickerOpen, setRacePickerOpen] = useState(false);
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
  const totalLevel = totalCharacterLevel(classLevels);
  const raceLabel = state.identity.race.trim();
  const alignLabel = state.identity.alignment.trim();
  const classLine = formatClassLine(classLevels);
  const identityBits = [raceLabel || null, classLine || null, alignLabel || null].filter(
    (bit): bit is string => Boolean(bit),
  );
  const abilityBase = state.abilityBase ?? state.abilities;
  const raceFeatures = compendium?.raceFeatures ?? null;
  const hasRace = Boolean(state.identity.raceSlug);
  const showRacePicker = !hasRace || racePickerOpen;

  const castingNames = new Set(
    classLevels
      .map((cl) => getClassCastingInfo(cl.classSlug, cl.className)?.fgClassName.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const showDeity = castingNames.has("cleric") || castingNames.has("paladin");
  const showDomains = castingNames.has("cleric");
  const showSpecialist = castingNames.has("wizard");
  const showDivineArcaneOptions = showDeity || showDomains || showSpecialist;

  const classSkillKeys = classSkillKeySet(compendium?.skills ?? []);
  const skillHd = skillHitDice(classLevels);
  const equippedGear = computeEquippedGear(state.inventory ?? [], state.combat.speedBase);
  const encumbrance = computeEncumbrance(state, {
    raceFeatures,
    featFeatures: deriveFeatEffects(state.feats),
    classFeatures: compendium?.classFeatures ?? null,
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
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-header pc-main-header">
              {planId ? (
                <div className="pc-main-images" aria-label="Character images">
                  <PcImageSlot
                    planId={planId}
                    kind="profile"
                    imageKey={state.identity.profileImageKey}
                    readOnly={readOnly}
                    onKeyChange={(key) =>
                      patchProp((s) => {
                        s.identity.profileImageKey = key;
                      })
                    }
                  />
                  <PcImageSlot
                    planId={planId}
                    kind="token"
                    imageKey={state.identity.tokenImageKey}
                    readOnly={readOnly}
                    onKeyChange={(key) =>
                      patchProp((s) => {
                        s.identity.tokenImageKey = key;
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="pc-main-header-text">
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
              {identityBits.length > 0 || totalLevel > 0 ? (
                <p className="pc-main-identity">
                  {identityBits.length > 0 ? (
                    <span className="pc-main-identity-core">{identityBits.join(" · ")}</span>
                  ) : null}
                  {totalLevel > 0 ? (
                    <span className="pc-main-level">Level {totalLevel}</span>
                  ) : null}
                </p>
              ) : null}
              </div>
              <dl className="pc-main-meta">
                <div className="pc-main-meta-race">
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
                        <span className="pc-main-race-name">{state.identity.race}</span>
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
                <div className="pc-main-meta-align">
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
              <div className="pc-skills-header">
                <h3>Classes</h3>
                {totalLevel > 0 ? (
                  <span className="pc-main-level-badge">Level {totalLevel}</span>
                ) : null}
              </div>
              {classLevels.length === 0 ? (
                <p className="pc-sheet-empty">Add a class below.</p>
              ) : (
                <ul className="pc-class-list">
                  {classLevels.map((cl, index) => {
                    const info = getClassCastingInfo(cl.classSlug, cl.className);
                    const isFirstClass = state.identity.firstClassSlug === cl.classSlug;
                    const showFirstSlot = classLevels.length > 1;
                    return (
                      <li
                        key={`${cl.classSlug}-${index}`}
                        className={
                          showFirstSlot ? "pc-class-row pc-class-row--multiclass" : "pc-class-row"
                        }
                      >
                        <div className="pc-class-identity">
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
                        {showFirstSlot ? (
                          isFirstClass ? (
                            <span className="pc-class-first-badge" title="Skill points ×4 at 1st level">
                              1st · ×4 skills
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="pc-class-first-btn"
                              title="Use this class for ×4 skill points at 1st level"
                              onClick={() =>
                                patch((s) => {
                                  s.identity.firstClassSlug = cl.classSlug;
                                })
                              }
                            >
                              Make 1st
                            </button>
                          )
                        ) : null}
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
                          className="pc-class-remove"
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
              <EntitySearchCombobox
                categories={CLASS_SEARCH_CATEGORIES}
                placeholder="Search classes to add…"
                label="Add class"
                onSelect={(hit) =>
                  patch((s) => {
                    if (s.identity.classLevels.some((cl) => cl.classSlug === hit.slug)) {
                      return;
                    }
                    if (s.identity.classLevels.length === 0) {
                      s.identity.firstClassSlug = hit.slug;
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

            {showDivineArcaneOptions ? (
              <div className="npc-sheet-block">
                <h3>Divine / Arcane Options</h3>
                <dl className="npc-sheet-stats pc-sheet-meta">
                  {showDeity ? (
                    <div>
                      <dt>Deity</dt>
                      <dd>
                        {state.identity.deitySlug ? (
                          <div className="pc-sheet-race-value">
                            <span>{state.identity.deity}</span>
                            <button
                              type="button"
                              className="pc-sheet-link-btn"
                              onClick={() =>
                                patch((s) => {
                                  s.identity.deity = "";
                                  s.identity.deitySlug = null;
                                })
                              }
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <EntitySearchCombobox
                            categories={DEITY_SEARCH_CATEGORIES}
                            placeholder="Search deities…"
                            label="Search deities"
                            onSelect={(hit) =>
                              patch((s) => {
                                s.identity.deity = hit.name;
                                s.identity.deitySlug = hit.slug;
                              })
                            }
                          />
                        )}
                      </dd>
                    </div>
                  ) : null}
                  {showDomains ? (
                    <div>
                      <dt>Domains</dt>
                      <dd>
                        <div className="pc-domain-list">
                          {(state.identity.domains ?? []).map((domain) => (
                            <span key={domain.slug} className="pc-domain-chip">
                              {domain.name}
                              <button
                                type="button"
                                className="pc-sheet-link-btn"
                                onClick={() =>
                                  patch((s) => {
                                    s.identity.domains = (s.identity.domains ?? []).filter(
                                      (d) => d.slug !== domain.slug,
                                    );
                                  })
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        {(state.identity.domains?.length ?? 0) < 2 ? (
                          <EntitySearchCombobox
                            categories={DOMAIN_SEARCH_CATEGORIES}
                            placeholder="Add domain…"
                            label="Add domain"
                            onSelect={(hit) =>
                              patch((s) => {
                                const current = s.identity.domains ?? [];
                                if (current.some((d) => d.slug === hit.slug) || current.length >= 2) {
                                  return;
                                }
                                s.identity.domains = [
                                  ...current,
                                  { slug: hit.slug, name: hit.name },
                                ];
                              })
                            }
                          />
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  {showSpecialist ? (
                    <div>
                      <dt>Specialist school</dt>
                      <dd>
                        <input
                          type="text"
                          className="pc-sheet-input"
                          placeholder="e.g. Evocation"
                          value={state.identity.specialistSchool ?? ""}
                          onChange={(e) =>
                            patch((s) => {
                              s.identity.specialistSchool = e.target.value.trim() || null;
                            })
                          }
                        />
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <div className="npc-sheet-block">
              <h3>Ability Scores</h3>
              <div className="npc-sheet-abilities">
                {ABILITY_KEYS.map((key) => {
                  const racial = abilityRacialMod(key, raceFeatures);
                  const itemStacked = equippedItemBonuses.abilities[key];
                  const itemTotal = itemStacked?.total ?? 0;
                  const damage = state.abilityDamage?.[key] ?? 0;
                  const undamaged = abilityBase[key] + racial + itemTotal;
                  const current = state.abilities[key];
                  const damaged = damage > 0;
                  return (
                    <div key={key} className="pc-ability-cell">
                      <span className="pc-ability-label">{key.toUpperCase()}</span>
                      <div className="pc-ability-row">
                        <div className="pc-ability-col pc-ability-col--score">
                          <span className="pc-ability-col-label">Score</span>
                          <div className="pc-ability-score-value">
                            <div className="pc-ability-stepper">
                              <button
                                type="button"
                                className="pc-ability-step"
                                aria-label={`Increase ${key.toUpperCase()}`}
                                disabled={abilityBase[key] >= 99}
                                onClick={() => updateAbility(key, abilityBase[key] + 1)}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                className="pc-ability-step"
                                aria-label={`Decrease ${key.toUpperCase()}`}
                                disabled={abilityBase[key] <= 1}
                                onClick={() => updateAbility(key, abilityBase[key] - 1)}
                              >
                                −
                              </button>
                            </div>
                            <input
                              type="number"
                              className="pc-sheet-input pc-sheet-input--ability"
                              min={1}
                              max={99}
                              value={undamaged}
                              aria-label={`${key.toUpperCase()} score`}
                              onChange={(e) => {
                                const desired = clampAbilityScore(Number(e.target.value));
                                updateAbility(key, desired - racial - itemTotal);
                              }}
                            />
                            <BonusSourcesHint
                              amount={itemTotal}
                              sources={itemStacked?.sources ?? []}
                              ariaLabel={`${key.toUpperCase()} item bonus ${itemTotal}`}
                            />
                          </div>
                        </div>
                        <span className="pc-ability-sep" aria-hidden="true">
                          |
                        </span>
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
                        <span className="pc-ability-sep" aria-hidden="true">
                          |
                        </span>
                        <div
                          className={
                            damaged
                              ? "pc-ability-col pc-ability-col--mod pc-ability-col--mod-damaged"
                              : "pc-ability-col pc-ability-col--mod"
                          }
                        >
                          <span className="pc-ability-col-label">Modifier</span>
                          <span className="pc-sheet-mod">{abilityMod(current)}</span>
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

            <details className="pc-main-shortcut">
              <summary>{shortcut.trim() ? "Alias" : "Set alias"}</summary>
              <label className="pc-main-shortcut-label">
                <span>Shortcut</span>
                <input
                  type="text"
                  className="pc-sheet-input pc-main-shortcut-input"
                  placeholder="e.g. hwizard"
                  value={shortcut}
                  aria-label="Shortcut alias"
                  onChange={(e) => onShortcutChange(e.target.value)}
                  onBlur={onShortcutBlur}
                />
              </label>
            </details>
          </div>
        )}

        {sheetTab === "combat" && (
          <PcCombatPanel
            state={state}
            patch={patch}
            raceFeatures={compendium?.raceFeatures ?? null}
            classFeatures={compendium?.classFeatures ?? null}
            classAdvancement={compendium?.classAdvancement ?? null}
            classHitDice={compendium?.classHitDice ?? null}
          />
        )}

        {sheetTab === "skills" && (
          <div className="npc-sheet-panel pc-sheet-section" role="tabpanel">
            <div className="npc-sheet-block">
              <div className="pc-skills-header">
                <h3>Skills</h3>
                <div className="pc-skills-header-actions">
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
                      const total = computeSkillTotal(
                        row,
                        state.abilities,
                        skillAcp,
                        itemSkill.total,
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
            classFeatures={compendium?.classFeatures ?? null}
          />
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
