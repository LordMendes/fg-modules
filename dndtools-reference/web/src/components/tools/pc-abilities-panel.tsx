"use client";

import type { PcCompendiumBundle } from "@/lib/entities";
import type { FeatEntry, PcPlanState } from "@/lib/pc-planner/types";
import {
  featNeedsWeaponChoice,
  formatFeatDisplayName,
  weaponChoiceOptions,
} from "@/lib/pc-planner/weaponFeatBonuses";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import type { CategoryKey } from "@/lib/categories";
import {
  computeFeatBudget,
  formatFeatBudgetSummary,
} from "@/lib/pc-planner/featBudget";
import { classAbilityEffectKey } from "@/lib/pc-planner/parseClassAbilityEffects";
import { featNeedsSkillChoice } from "@/lib/pc-planner/parseFeatEffects";

const FEAT_SEARCH_CATEGORIES: CategoryKey[] = ["feats"];

export type PcAbilitiesPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  compendium: PcCompendiumBundle | null;
  loading?: boolean;
  onAddFeat: (slug: string, name: string, choice?: string) => void;
  onRemoveFeat: (slug: string) => void;
};

function AbilityList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div className="npc-sheet-block">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="pc-sheet-empty">{emptyMessage}</p>
      ) : (
        <ul className="pc-ability-list">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClassAbilityList({
  abilities,
  suppressed,
  onToggle,
}: {
  abilities: PcCompendiumBundle["classAbilities"];
  suppressed: Set<string>;
  onToggle: (key: string, apply: boolean) => void;
}) {
  return (
    <div className="npc-sheet-block">
      <h3>Class Abilities</h3>
      {abilities.length === 0 ? (
        <p className="pc-sheet-empty">Add a class on the Main tab to load class abilities.</p>
      ) : (
        <ul className="pc-ability-list pc-ability-list--toggle">
          {abilities.map((entry) => {
            const key = classAbilityEffectKey(entry);
            const applied = !suppressed.has(key);
            return (
              <li key={`${entry.classSlug}-${entry.level}-${entry.name}`}>
                <label className="pc-checkbox-label">
                  <input
                    type="checkbox"
                    checked={applied}
                    onChange={(e) => onToggle(key, e.target.checked)}
                  />
                  Apply
                </label>
                <span className="pc-ability-level">
                  {entry.className} {entry.level}:
                </span>{" "}
                {entry.name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FeatList({
  feats,
  budgetLabel,
  overBudget,
  budgetTitle,
  onAddFeat,
  onRemoveFeat,
  inventory,
  patch,
}: {
  feats: FeatEntry[];
  budgetLabel: string;
  overBudget: boolean;
  budgetTitle: string;
  onAddFeat: (slug: string, name: string, choice?: string) => void;
  onRemoveFeat: (slug: string) => void;
  inventory: PcPlanState["inventory"];
  patch: PcAbilitiesPanelProps["patch"];
}) {
  return (
    <div className="npc-sheet-block">
      <div className="pc-skills-header">
        <h3>Feats</h3>
        <span
          className={`pc-skill-points-summary${overBudget ? " pc-skill-points-summary--over" : ""}`}
          title={budgetTitle}
        >
          {budgetLabel}
        </span>
      </div>
      <EntitySearchCombobox
        categories={FEAT_SEARCH_CATEGORIES}
        placeholder="Search feats to add…"
        onSelect={(hit) => {
          const stub = { slug: hit.slug, name: hit.name };
          if (featNeedsSkillChoice(stub)) {
            const choice = window.prompt(
              `Choose a skill for ${hit.name} (e.g. stealth)`,
              "stealth",
            );
            if (choice == null) return;
            const trimmed = choice.trim();
            onAddFeat(hit.slug, hit.name, trimmed || undefined);
            return;
          }
          if (!featNeedsWeaponChoice(stub)) {
            onAddFeat(hit.slug, hit.name);
            return;
          }
          const options = weaponChoiceOptions(inventory);
          const suggestion = options[0]?.label ?? "longsword";
          const choice = window.prompt(
            `Choose a weapon type for ${hit.name} (e.g. longsword)`,
            suggestion,
          );
          if (choice == null) return;
          const trimmed = choice.trim();
          onAddFeat(hit.slug, hit.name, trimmed || undefined);
        }}
      />
      {feats.length === 0 ? (
        <p className="pc-sheet-empty">No feats added.</p>
      ) : (
        <ul className="pc-feat-list pc-feat-list--editable">
          {feats.map((feat) => (
            <li key={feat.slug} className="pc-sheet-editable-row">
              <label className="pc-checkbox-label pc-feat-apply">
                <input
                  type="checkbox"
                  checked={!feat.suppressed}
                  onChange={(e) =>
                    patch((s) => {
                      const row = s.feats.find((f) => f.slug === feat.slug);
                      if (row) row.suppressed = !e.target.checked;
                    })
                  }
                />
                Apply
              </label>
              <a
                href={`/feats/${feat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pc-feat-link"
              >
                {formatFeatDisplayName(feat)}
              </a>
              <button
                type="button"
                className="tool-btn tool-btn--ghost tool-btn--compact"
                onClick={() => onRemoveFeat(feat.slug)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PcAbilitiesPanel({
  state,
  patch,
  compendium,
  loading = false,
  onAddFeat,
  onRemoveFeat,
}: PcAbilitiesPanelProps) {
  const proficiencies = [
    ...(compendium?.proficiencies ?? []),
    ...(compendium?.racialProficiencies ?? []),
  ];
  const budget = computeFeatBudget(state, compendium?.raceFeatures ?? null);
  const suppressed = new Set(state.suppressedClassEffects ?? []);

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-abilities-panel" role="tabpanel">
      {loading ? <p className="pc-sheet-empty">Loading abilities…</p> : null}
      <FeatList
        feats={state.feats}
        budgetLabel={formatFeatBudgetSummary(budget)}
        overBudget={budget.spentNonFlaw > budget.total - budget.flaws}
        budgetTitle={`General ${budget.general}, human ${budget.human}, fighter ${budget.fighter}, wizard ${budget.wizard}, monk ${budget.monk}, ranger ${budget.ranger}, flaws ${budget.flaws}`}
        onAddFeat={onAddFeat}
        onRemoveFeat={onRemoveFeat}
        inventory={state.inventory}
        patch={patch}
      />
      <ClassAbilityList
        abilities={compendium?.classAbilities ?? []}
        suppressed={suppressed}
        onToggle={(key, apply) =>
          patch((s) => {
            const set = new Set(s.suppressedClassEffects ?? []);
            if (apply) set.delete(key);
            else set.add(key);
            s.suppressedClassEffects = [...set];
          })
        }
      />
      <AbilityList
        title="Proficiencies"
        items={proficiencies}
        emptyMessage="Select a race and classes on the Main tab to load proficiencies."
      />
      <AbilityList
        title="Racial Traits"
        items={compendium?.racialTraits ?? []}
        emptyMessage="Select a race on the Main tab to load racial traits."
      />
    </div>
  );
}
