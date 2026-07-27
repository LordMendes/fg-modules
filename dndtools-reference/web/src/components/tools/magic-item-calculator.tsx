"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MagicItemSummary } from "@/components/tools/magic-item-summary";
import {
  abilitiesForWeaponKind,
  ARMOR_ABILITIES,
  ARMOR_ABILITY_SOURCES,
  computeArmorCrafting,
  computeArmorPrice,
  computeWeaponCrafting,
  computeWeaponPrice,
  filterArmorAbilitiesBySource,
  filterWeaponAbilitiesBySource,
  formatGp,
  gearForKind,
  GEAR_BY_ID,
  SOURCE_LABELS,
  WEAPON_BY_ID,
  WEAPON_CATEGORY_LABELS,
  WEAPONS,
  WEAPON_ABILITY_SOURCES,
  type ArmorGearKind,
  type SelectedArmorAbility,
  type SelectedWeaponAbility,
  type SourceAbbrev,
  type WeaponAbility,
  type WeaponCategory,
} from "@/lib/magic-item";

type Tab = "weapons" | "armor";

function AbilityPriceHint({ ability }: { ability: WeaponAbility | (typeof ARMOR_ABILITIES)[number] }) {
  if (ability.pricing.kind === "equivalent") {
    return <span className="mi-ability-equiv">+{ability.pricing.bonus} equiv.</span>;
  }
  return <span className="mi-ability-equiv">{formatGp(ability.pricing.gp)} gp</span>;
}

function SourceBadge({ source }: { source: SourceAbbrev }) {
  return <span className="mi-source-badge">{SOURCE_LABELS[source] ?? source}</span>;
}

function WeaponBuilder() {
  const [weaponId, setWeaponId] = useState("longsword");
  const [enhancementBonus, setEnhancementBonus] = useState(1);
  const [selectedAbilities, setSelectedAbilities] = useState<SelectedWeaponAbility[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceAbbrev | "all">("all");
  const [search, setSearch] = useState("");

  const weapon = WEAPON_BY_ID.get(weaponId);
  const scopedAbilities = useMemo(() => {
    if (!weapon) return [];
    return abilitiesForWeaponKind(weapon.kind);
  }, [weapon]);

  const availableAbilities = useMemo(() => {
    const filtered = filterWeaponAbilitiesBySource(scopedAbilities, sourceFilter);
    const q = search.trim().toLowerCase();
    const searched = q
      ? filtered.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            SOURCE_LABELS[a.source].toLowerCase().includes(q),
        )
      : filtered;

    const selectedIds = new Set(selectedAbilities.map((a) => a.abilityId));
    const pinned = scopedAbilities.filter(
      (a) => selectedIds.has(a.id) && !searched.some((s) => s.id === a.id),
    );

    return [...pinned, ...searched];
  }, [scopedAbilities, sourceFilter, search, selectedAbilities]);

  const selectedAbilityDetails = useMemo(
    () =>
      selectedAbilities
        .map((sel) => {
          const ability = scopedAbilities.find((a) => a.id === sel.abilityId);
          return ability ? { sel, ability } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [selectedAbilities, scopedAbilities],
  );

  const buildState = useMemo(
    () => ({ weaponId, enhancementBonus, abilities: selectedAbilities }),
    [weaponId, enhancementBonus, selectedAbilities],
  );

  const price = useMemo(() => computeWeaponPrice(buildState), [buildState]);
  const craft = useMemo(
    () => computeWeaponCrafting(price.totalGp, enhancementBonus, selectedAbilities),
    [price.totalGp, enhancementBonus, selectedAbilities],
  );

  const weaponsByCategory = useMemo(() => {
    const groups: Record<WeaponCategory, typeof WEAPONS> = {
      simple: [],
      martial: [],
      exotic: [],
    };
    for (const w of WEAPONS) {
      groups[w.category].push(w);
    }
    return groups;
  }, []);

  function toggleAbility(abilityId: string) {
    setSelectedAbilities((prev) => {
      const exists = prev.find((a) => a.abilityId === abilityId);
      if (exists) return prev.filter((a) => a.abilityId !== abilityId);
      const ability = scopedAbilities.find((a) => a.id === abilityId);
      const entry: SelectedWeaponAbility = { abilityId };
      if (ability?.subtype) {
        entry.subtype = ability.subtype.options[0];
      }
      return [...prev, entry];
    });
  }

  function setAbilitySubtype(abilityId: string, subtype: string) {
    setSelectedAbilities((prev) =>
      prev.map((a) => (a.abilityId === abilityId ? { ...a, subtype } : a)),
    );
  }

  function handleWeaponChange(nextId: string) {
    setWeaponId(nextId);
    const nextWeapon = WEAPON_BY_ID.get(nextId);
    if (!nextWeapon) return;
    const nextAbilities = abilitiesForWeaponKind(nextWeapon.kind);
    setSelectedAbilities((prev) =>
      prev.filter((sel) => nextAbilities.some((a) => a.id === sel.abilityId)),
    );
  }

  function resetBuild() {
    setWeaponId("longsword");
    setEnhancementBonus(1);
    setSelectedAbilities([]);
    setSourceFilter("all");
    setSearch("");
  }

  return (
    <div className="tool-layout">
      <div className="tool-steps">
        <section className="tool-step">
          <h2>
            <span className="tool-step-num">1</span>
            Base weapon
          </h2>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mi-weapon-select">
              Weapon type
            </label>
            <select
              id="mi-weapon-select"
              className="tool-select"
              value={weaponId}
              onChange={(e) => handleWeaponChange(e.target.value)}
            >
              {(Object.keys(WEAPON_CATEGORY_LABELS) as WeaponCategory[]).map((cat) => (
                <optgroup key={cat} label={WEAPON_CATEGORY_LABELS[cat]}>
                  {weaponsByCategory[cat].map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatGp(w.costGp)} gp)
                      {w.source && w.source !== "PHB" ? ` [${w.source}]` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mi-weapon-enhancement">
              Enhancement bonus
            </label>
            <select
              id="mi-weapon-enhancement"
              className="tool-select"
              value={enhancementBonus}
              onChange={(e) => setEnhancementBonus(Number.parseInt(e.target.value, 10))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "None (+0)" : `+${n}`}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">2</span>
            Special abilities
          </h2>
          <p className="tool-step-desc">
            DMG Tables 7-10 / 7-11 plus Complete-series weapon properties.
            {weapon && (
              <>
                {" "}
                Filtered for {weapon.kind} weapons.
              </>
            )}
          </p>

          <div className="entity-filters mi-filters">
            <div className="filter-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="mi-weapon-source">
                  Source
                </label>
                <select
                  id="mi-weapon-source"
                  className="tool-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceAbbrev | "all")}
                >
                  {WEAPON_ABILITY_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src === "all" ? "All sources" : SOURCE_LABELS[src]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-search mi-filter-search">
                <label className="tool-label" htmlFor="mi-weapon-search">
                  Search
                </label>
                <div className="filter-search-input">
                  <Search size={16} aria-hidden="true" />
                  <input
                    id="mi-weapon-search"
                    type="search"
                    placeholder="Search abilities…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search weapon abilities"
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedAbilityDetails.length > 0 && (
            <section className="mi-selected-section" aria-label="Selected abilities">
              <h3 className="mi-selected-heading">Selected ({selectedAbilityDetails.length})</h3>
              <ul className="mi-selected-list">
                {selectedAbilityDetails.map(({ sel, ability }) => (
                  <li key={ability.id} className="mi-selected-chip">
                    <span>
                      {ability.name}
                      {sel.subtype ? ` (${sel.subtype})` : ""}
                    </span>
                    <button
                      type="button"
                      className="mi-selected-remove"
                      onClick={() => toggleAbility(ability.id)}
                      aria-label={`Remove ${ability.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mi-toolbar">
            <button type="button" className="tool-btn-secondary" onClick={resetBuild}>
              Clear build
            </button>
          </div>

          <div className="mi-ability-panel">
            <ul className="mi-ability-list">
              {availableAbilities.length === 0 ? (
                <li className="mi-ability-empty">No abilities match the current filters.</li>
              ) : (
                availableAbilities.map((ability) => {
                  const selected = selectedAbilities.find((a) => a.abilityId === ability.id);
                  return (
                    <li
                      key={ability.id}
                      className={`mi-ability-row${selected ? " selected" : ""}`}
                    >
                  <div className="mi-ability-header">
                    <label className="mi-ability-label">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleAbility(ability.id)}
                      />
                      <span className="mi-ability-name">{ability.name}</span>
                    </label>
                    <AbilityPriceHint ability={ability} />
                    <SourceBadge source={ability.source} />
                  </div>
                  <p className="mi-ability-desc">{ability.description}</p>
                  {ability.notes && (
                    <p className="mi-ability-note">{ability.notes}</p>
                  )}
                  {selected && ability.subtype && (
                    <div className="tool-field mi-subtype-field">
                      <label className="tool-label" htmlFor={`mi-subtype-${ability.id}`}>
                        {ability.subtype.label}
                      </label>
                      <select
                        id={`mi-subtype-${ability.id}`}
                        className="tool-select"
                        value={selected.subtype ?? ""}
                        onChange={(e) => setAbilitySubtype(ability.id, e.target.value)}
                      >
                        {ability.subtype.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>
      </div>

      <MagicItemSummary price={price} craft={craft} emptyMessage="Select a weapon." />
    </div>
  );
}

function ArmorBuilder() {
  const [gearKind, setGearKind] = useState<ArmorGearKind>("armor");
  const [gearId, setGearId] = useState("full-plate");
  const [enhancementBonus, setEnhancementBonus] = useState(1);
  const [selectedAbilities, setSelectedAbilities] = useState<SelectedArmorAbility[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceAbbrev | "all">("all");
  const [search, setSearch] = useState("");

  const availableGear = useMemo(() => gearForKind(gearKind), [gearKind]);

  const filteredAbilities = useMemo(() => {
    const filtered = filterArmorAbilitiesBySource(ARMOR_ABILITIES, sourceFilter);
    const q = search.trim().toLowerCase();
    const searched = q
      ? filtered.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            SOURCE_LABELS[a.source].toLowerCase().includes(q),
        )
      : filtered;

    const selectedIds = new Set(selectedAbilities.map((a) => a.abilityId));
    const pinned = ARMOR_ABILITIES.filter(
      (a) => selectedIds.has(a.id) && !searched.some((s) => s.id === a.id),
    );

    return [...pinned, ...searched];
  }, [sourceFilter, search, selectedAbilities]);

  const selectedAbilityDetails = useMemo(
    () =>
      selectedAbilities
        .map((sel) => {
          const ability = ARMOR_ABILITIES.find((a) => a.id === sel.abilityId);
          return ability ? { sel, ability } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [selectedAbilities],
  );

  const buildState = useMemo(
    () => ({ gearId, enhancementBonus, abilities: selectedAbilities }),
    [gearId, enhancementBonus, selectedAbilities],
  );

  const price = useMemo(() => computeArmorPrice(buildState), [buildState]);
  const craft = useMemo(
    () => computeArmorCrafting(price.totalGp, enhancementBonus, selectedAbilities),
    [price.totalGp, enhancementBonus, selectedAbilities],
  );

  function handleGearKindChange(nextKind: ArmorGearKind) {
    setGearKind(nextKind);
    const options = gearForKind(nextKind);
    if (options.length > 0) {
      setGearId(options[0].id);
    }
  }

  function toggleAbility(abilityId: string) {
    setSelectedAbilities((prev) => {
      const exists = prev.find((a) => a.abilityId === abilityId);
      if (exists) return prev.filter((a) => a.abilityId !== abilityId);
      return [...prev, { abilityId }];
    });
  }

  function resetBuild() {
    setGearKind("armor");
    setGearId("full-plate");
    setEnhancementBonus(1);
    setSelectedAbilities([]);
    setSourceFilter("all");
    setSearch("");
  }

  return (
    <div className="tool-layout">
      <div className="tool-steps">
        <section className="tool-step">
          <h2>
            <span className="tool-step-num">1</span>
            Base armor or shield
          </h2>
          <div className="tool-field">
            <span className="tool-label">Type</span>
            <div className="mi-kind-toggle" role="group" aria-label="Armor or shield">
              <button
                type="button"
                className={`mi-kind-btn${gearKind === "armor" ? " active" : ""}`}
                onClick={() => handleGearKindChange("armor")}
              >
                Armor
              </button>
              <button
                type="button"
                className={`mi-kind-btn${gearKind === "shield" ? " active" : ""}`}
                onClick={() => handleGearKindChange("shield")}
              >
                Shield
              </button>
            </div>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mi-gear-select">
              {gearKind === "armor" ? "Armor type" : "Shield type"}
            </label>
            <select
              id="mi-gear-select"
              className="tool-select"
              value={gearId}
              onChange={(e) => setGearId(e.target.value)}
            >
              {availableGear.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({formatGp(g.costGp)} gp)
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="mi-armor-enhancement">
              Enhancement bonus
            </label>
            <select
              id="mi-armor-enhancement"
              className="tool-select"
              value={enhancementBonus}
              onChange={(e) => setEnhancementBonus(Number.parseInt(e.target.value, 10))}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "None (+0)" : `+${n}`}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">2</span>
            Special abilities
          </h2>
          <p className="tool-step-desc">
            DMG Tables 7-5 / 7-6 / 7-7 plus Complete-series armor properties.
            Magic price: equivalent² × 1,000 gp + flat costs.
          </p>

          <div className="entity-filters mi-filters">
            <div className="filter-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="mi-armor-source">
                  Source
                </label>
                <select
                  id="mi-armor-source"
                  className="tool-select"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceAbbrev | "all")}
                >
                  {ARMOR_ABILITY_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src === "all" ? "All sources" : SOURCE_LABELS[src]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-search mi-filter-search">
                <label className="tool-label" htmlFor="mi-armor-search">
                  Search
                </label>
                <div className="filter-search-input">
                  <Search size={16} aria-hidden="true" />
                  <input
                    id="mi-armor-search"
                    type="search"
                    placeholder="Search abilities…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search armor abilities"
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedAbilityDetails.length > 0 && (
            <section className="mi-selected-section" aria-label="Selected abilities">
              <h3 className="mi-selected-heading">Selected ({selectedAbilityDetails.length})</h3>
              <ul className="mi-selected-list">
                {selectedAbilityDetails.map(({ sel, ability }) => (
                  <li key={ability.id} className="mi-selected-chip">
                    <span>{ability.name}</span>
                    <button
                      type="button"
                      className="mi-selected-remove"
                      onClick={() => toggleAbility(ability.id)}
                      aria-label={`Remove ${ability.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mi-toolbar">
            <button type="button" className="tool-btn-secondary" onClick={resetBuild}>
              Clear build
            </button>
          </div>

          <div className="mi-ability-panel">
            <ul className="mi-ability-list">
              {filteredAbilities.length === 0 ? (
                <li className="mi-ability-empty">No abilities match the current filters.</li>
              ) : (
                filteredAbilities.map((ability) => {
                  const selected = selectedAbilities.find((a) => a.abilityId === ability.id);
                  return (
                    <li
                      key={ability.id}
                      className={`mi-ability-row${selected ? " selected" : ""}`}
                    >
                      <div className="mi-ability-header">
                        <label className="mi-ability-label">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => toggleAbility(ability.id)}
                          />
                          <span className="mi-ability-name">{ability.name}</span>
                        </label>
                        <AbilityPriceHint ability={ability} />
                        <SourceBadge source={ability.source} />
                      </div>
                      <p className="mi-ability-desc">{ability.description}</p>
                      {ability.notes && (
                        <p className="mi-ability-note">{ability.notes}</p>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>
      </div>

      <MagicItemSummary price={price} craft={craft} />
    </div>
  );
}

export function MagicItemCalculator() {
  const [tab, setTab] = useState<Tab>("weapons");

  return (
    <div className="mi-calculator">
      <div className="mi-tabs" role="tablist" aria-label="Magic item type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "weapons"}
          className={`mi-tab${tab === "weapons" ? " active" : ""}`}
          onClick={() => setTab("weapons")}
        >
          Weapons
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "armor"}
          className={`mi-tab${tab === "armor" ? " active" : ""}`}
          onClick={() => setTab("armor")}
        >
          Armor &amp; Shields
        </button>
      </div>

      {tab === "weapons" ? <WeaponBuilder /> : <ArmorBuilder />}
    </div>
  );
}
