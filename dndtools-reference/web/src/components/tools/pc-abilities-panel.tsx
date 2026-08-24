"use client";

import type { PcCompendiumBundle } from "@/lib/entities";
import type { FeatEntry, PcPlanState } from "@/lib/pc-planner/types";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import type { CategoryKey } from "@/lib/categories";

const FEAT_SEARCH_CATEGORIES: CategoryKey[] = ["feats"];

export type PcAbilitiesPanelProps = {
  state: PcPlanState;
  compendium: PcCompendiumBundle | null;
  loading?: boolean;
  onAddFeat: (slug: string, name: string) => void;
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
}: {
  abilities: PcCompendiumBundle["classAbilities"];
}) {
  return (
    <div className="npc-sheet-block">
      <h3>Class Abilities</h3>
      {abilities.length === 0 ? (
        <p className="pc-sheet-empty">Add a class on the Main tab to load class abilities.</p>
      ) : (
        <ul className="pc-ability-list">
          {abilities.map((entry) => (
            <li key={`${entry.classSlug}-${entry.level}-${entry.name}`}>
              <span className="pc-ability-level">
                {entry.className} {entry.level}:
              </span>{" "}
              {entry.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeatList({
  feats,
  onAddFeat,
  onRemoveFeat,
}: {
  feats: FeatEntry[];
  onAddFeat: (slug: string, name: string) => void;
  onRemoveFeat: (slug: string) => void;
}) {
  return (
    <div className="npc-sheet-block">
      <h3>Feats</h3>
      <EntitySearchCombobox
        categories={FEAT_SEARCH_CATEGORIES}
        placeholder="Search feats to add…"
        onSelect={(hit) => onAddFeat(hit.slug, hit.name)}
      />
      {feats.length === 0 ? (
        <p className="pc-sheet-empty">No feats added.</p>
      ) : (
        <ul className="pc-feat-list pc-feat-list--editable">
          {feats.map((feat) => (
            <li key={feat.slug} className="pc-sheet-editable-row">
              <a
                href={`/feats/${feat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pc-feat-link"
              >
                {feat.name}
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
  compendium,
  loading = false,
  onAddFeat,
  onRemoveFeat,
}: PcAbilitiesPanelProps) {
  const proficiencies = [
    ...(compendium?.proficiencies ?? []),
    ...(compendium?.racialProficiencies ?? []),
  ];

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-abilities-panel" role="tabpanel">
      {loading ? <p className="pc-sheet-empty">Loading abilities…</p> : null}
      <FeatList feats={state.feats} onAddFeat={onAddFeat} onRemoveFeat={onRemoveFeat} />
      <ClassAbilityList abilities={compendium?.classAbilities ?? []} />
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
