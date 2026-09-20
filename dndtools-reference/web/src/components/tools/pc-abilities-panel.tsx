"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { classAbilityEffectKey, extractClassAbilityDescription } from "@/lib/pc-planner/parseClassAbilityEffects";
import { featNeedsSkillChoice } from "@/lib/pc-planner/parseFeatEffects";
import { PcSheetCard } from "@/components/tools/pc-main/sheet-card";
import { DraggableDialog } from "@/components/draggable-dialog";
import type { ClassAbilityEntry } from "@/lib/pc-planner/parseClassFeatures";

const FEAT_SEARCH_CATEGORIES: CategoryKey[] = ["feats"];

export type PcAbilitiesPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  compendium: PcCompendiumBundle | null;
  loading?: boolean;
  onAddFeat: (slug: string, name: string, choice?: string, isFlaw?: boolean) => void;
  onRemoveFeat: (slug: string) => void;
  readOnly?: boolean;
};

function groupClassAbilities(
  abilities: ClassAbilityEntry[],
): { className: string; classSlug: string; entries: ClassAbilityEntry[] }[] {
  const groups: {
    className: string;
    classSlug: string;
    entries: ClassAbilityEntry[];
  }[] = [];
  const indexBySlug = new Map<string, number>();

  for (const entry of abilities) {
    const existing = indexBySlug.get(entry.classSlug);
    if (existing == null) {
      indexBySlug.set(entry.classSlug, groups.length);
      groups.push({
        className: entry.className,
        classSlug: entry.classSlug,
        entries: [entry],
      });
    } else {
      groups[existing].entries.push(entry);
    }
  }

  return groups;
}

function AbilityListCard({
  title,
  className,
  items,
  emptyMessage,
}: {
  title: string;
  className: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <PcSheetCard title={title} className={className}>
      {items.length === 0 ? (
        <p className="pc-sheet-empty">{emptyMessage}</p>
      ) : (
        <ul className="pc-abilities-text-list">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </PcSheetCard>
  );
}

function ClassAbilityList({
  abilities,
  classDescriptions,
  suppressed,
  onToggle,
  readOnly,
}: {
  abilities: PcCompendiumBundle["classAbilities"];
  classDescriptions: Record<string, string>;
  suppressed: Set<string>;
  onToggle: (key: string, apply: boolean) => void;
  readOnly: boolean;
}) {
  const groups = groupClassAbilities(abilities);
  const [selected, setSelected] = useState<ClassAbilityEntry | null>(null);

  const description = selected
    ? extractClassAbilityDescription(
        classDescriptions[selected.classSlug] ?? "",
        selected.name,
      )
    : null;

  return (
    <>
      <PcSheetCard title="Class abilities" className="pc-abilities-class-card">
        {abilities.length === 0 ? (
          <p className="pc-sheet-empty">
            Add a class on the Main tab to load class abilities.
          </p>
        ) : (
          <div className="pc-abilities-class-scroll">
            {groups.map((group) => (
              <div key={group.classSlug} className="pc-abilities-class-group">
                <h4 className="pc-abilities-class-group-title">{group.className}</h4>
                <ul className="pc-abilities-row-list">
                  {group.entries.map((entry) => {
                    const key = classAbilityEffectKey(entry);
                    const applied = !suppressed.has(key);
                    return (
                      <li
                        key={`${entry.classSlug}-${entry.level}-${entry.name}`}
                        className="pc-abilities-row"
                      >
                        <label className="pc-abilities-row-check">
                          <input
                            type="checkbox"
                            checked={applied}
                            disabled={readOnly}
                            aria-label={`Apply ${entry.name}`}
                            onChange={(e) => onToggle(key, e.target.checked)}
                          />
                        </label>
                        <button
                          type="button"
                          className="pc-abilities-row-name pc-abilities-row-name-btn"
                          onClick={() => setSelected(entry)}
                        >
                          {entry.name}
                        </button>
                        <span className="pc-abilities-row-meta">L{entry.level}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </PcSheetCard>
      <DraggableDialog
        open={selected != null}
        title={selected?.name ?? "Class ability"}
        onClose={() => setSelected(null)}
        panelClassName="pc-ability-detail-dialog"
      >
        {selected ? (
          <div className="pc-ability-detail-body">
            <p className="pc-ability-detail-meta">
              {selected.className} · Level {selected.level}
            </p>
            {description ? (
              <p className="pc-ability-detail-text">{description}</p>
            ) : (
              <p className="pc-sheet-empty">
                No description found for this ability in the class entry.
              </p>
            )}
            <div className="pc-ability-detail-actions">
              <a
                href={`/classes/${selected.classSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pc-feat-link"
              >
                Open class page
              </a>
              <button
                type="button"
                className="tool-btn tool-btn--ghost tool-btn--compact"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </DraggableDialog>
    </>
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
  readOnly,
}: {
  feats: FeatEntry[];
  budgetLabel: string;
  overBudget: boolean;
  budgetTitle: string;
  onAddFeat: (slug: string, name: string, choice?: string, isFlaw?: boolean) => void;
  onRemoveFeat: (slug: string) => void;
  inventory: PcPlanState["inventory"];
  patch: PcAbilitiesPanelProps["patch"];
  readOnly: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const addPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (addPanelRef.current?.contains(target)) return;
      if ((event.target as Element).closest?.(".pc-abilities-feat-add-toggle")) return;
      setAddOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [addOpen]);

  function handleSelectFeat(hit: {
    slug: string;
    name: string;
    type?: string | null;
  }) {
    const isFlaw = (hit.type ?? "").toLowerCase() === "flaw";
    const stub = { slug: hit.slug, name: hit.name };
    if (featNeedsSkillChoice(stub)) {
      const choice = window.prompt(
        `Choose a skill for ${hit.name} (e.g. stealth)`,
        "stealth",
      );
      if (choice == null) return;
      const trimmed = choice.trim();
      onAddFeat(hit.slug, hit.name, trimmed || undefined, isFlaw);
      setAddOpen(false);
      return;
    }
    if (!featNeedsWeaponChoice(stub)) {
      onAddFeat(hit.slug, hit.name, undefined, isFlaw);
      setAddOpen(false);
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
    onAddFeat(hit.slug, hit.name, trimmed || undefined, isFlaw);
    setAddOpen(false);
  }

  return (
    <PcSheetCard
      title="Feats"
      className="pc-abilities-feats-card"
      actions={
        <>
          <span
            className={`pc-skill-points-summary${overBudget ? " pc-skill-points-summary--over" : ""}`}
            title={budgetTitle}
          >
            {budgetLabel}
          </span>
          {!readOnly ? (
            <button
              type="button"
              className="pc-class-add-toggle pc-abilities-feat-add-toggle"
              aria-expanded={addOpen}
              aria-label={addOpen ? "Close feat search" : "Add feat"}
              onClick={() => setAddOpen((open) => !open)}
            >
              <Plus aria-hidden className="pc-class-add-toggle-icon" />
            </button>
          ) : null}
        </>
      }
    >
      {addOpen && !readOnly ? (
        <div className="pc-abilities-feat-add-panel" ref={addPanelRef}>
          <EntitySearchCombobox
            categories={FEAT_SEARCH_CATEGORIES}
            placeholder="Search feats to add…"
            onSelect={handleSelectFeat}
          />
        </div>
      ) : null}
      {feats.length === 0 ? (
        <p className="pc-sheet-empty">
          {readOnly ? "No feats added." : "Add a feat with + above."}
        </p>
      ) : (
        <ul className="pc-abilities-row-list pc-abilities-feat-list">
          {feats.map((feat) => (
            <li key={feat.slug} className="pc-abilities-row">
              <label className="pc-abilities-row-check">
                <input
                  type="checkbox"
                  checked={!feat.suppressed}
                  disabled={readOnly}
                  aria-label={`Apply ${formatFeatDisplayName(feat)}`}
                  onChange={(e) =>
                    patch((s) => {
                      const row = s.feats.find((f) => f.slug === feat.slug);
                      if (row) row.suppressed = !e.target.checked;
                    })
                  }
                />
              </label>
              <a
                href={`/feats/${feat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pc-feat-link pc-abilities-row-name"
              >
                {formatFeatDisplayName(feat)}
              </a>
              {!readOnly ? (
                <button
                  type="button"
                  className="pc-class-remove"
                  aria-label={`Remove ${formatFeatDisplayName(feat)}`}
                  onClick={() => onRemoveFeat(feat.slug)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PcSheetCard>
  );
}

export function PcAbilitiesPanel({
  state,
  patch,
  compendium,
  loading = false,
  onAddFeat,
  onRemoveFeat,
  readOnly = false,
}: PcAbilitiesPanelProps) {
  const proficiencies = [
    ...(compendium?.proficiencies ?? []),
    ...(compendium?.racialProficiencies ?? []),
  ];
  const budget = computeFeatBudget(state, compendium?.raceFeatures ?? null);
  const suppressed = new Set(state.suppressedClassEffects ?? []);

  return (
    <div
      className="npc-sheet-panel pc-sheet-section pc-abilities-layout"
      role="tabpanel"
    >
      {loading ? <p className="pc-sheet-empty">Loading abilities…</p> : null}
      <FeatList
        feats={state.feats}
        budgetLabel={formatFeatBudgetSummary(budget)}
        overBudget={budget.spentNonFlaw > budget.total}
        budgetTitle={`General ${budget.general}, human ${budget.human}, fighter ${budget.fighter}, wizard ${budget.wizard}, monk ${budget.monk}, ranger ${budget.ranger}, flaws ${budget.flaws}`}
        onAddFeat={onAddFeat}
        onRemoveFeat={onRemoveFeat}
        inventory={state.inventory}
        patch={patch}
        readOnly={readOnly}
      />
      <ClassAbilityList
        abilities={compendium?.classAbilities ?? []}
        classDescriptions={compendium?.classDescriptions ?? {}}
        suppressed={suppressed}
        readOnly={readOnly}
        onToggle={(key, apply) =>
          patch((s) => {
            const set = new Set(s.suppressedClassEffects ?? []);
            if (apply) set.delete(key);
            else set.add(key);
            s.suppressedClassEffects = [...set];
          })
        }
      />
      <AbilityListCard
        title="Proficiencies"
        className="pc-abilities-profs-card"
        items={proficiencies}
        emptyMessage="Select a race and classes on the Main tab to load proficiencies."
      />
      <AbilityListCard
        title="Racial traits"
        className="pc-abilities-traits-card"
        items={compendium?.racialTraits ?? []}
        emptyMessage="Select a race on the Main tab to load racial traits."
      />
    </div>
  );
}
