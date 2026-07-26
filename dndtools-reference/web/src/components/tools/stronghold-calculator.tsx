"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { calculateStronghold } from "@/lib/stronghold/calculate";
import { STRONGHOLD_CLUSTERS } from "@/lib/stronghold/clusters";
import { STRONGHOLD_COMPONENTS } from "@/lib/stronghold/components";
import {
  CLIMATE_OPTIONS,
  DISTANCE_OPTIONS,
  NEARBY_FEATURE_OPTIONS,
  SETTLEMENT_OPTIONS,
  TERRAIN_OPTIONS,
} from "@/lib/stronghold/site-modifiers";
import { SPELL_DISCOUNTS } from "@/lib/stronghold/spell-discounts";
import { STAFF_MEMBERS } from "@/lib/stronghold/staff";
import type {
  NearbyFeature,
  StaffRoleKey,
  StrongholdInput,
  WallMaterialKey,
} from "@/lib/stronghold/types";
import { WALL_MATERIALS } from "@/lib/stronghold/walls";
import { StrongholdCostSummary } from "@/components/tools/stronghold-cost-summary";

const defaultInput: StrongholdInput = {
  components: [],
  climate: "temperate",
  terrain: "plains",
  settlement: "small-town",
  settlementDistance: "less-than-1",
  nearbyFeatures: [],
  interiorWall: "wood",
  exteriorWall: "masonry",
  storiesAboveGround: 2,
  subterraneanLayers: 1,
  spellDiscounts: {},
  staff: {},
  rushPercent: 0,
  extrasCost: 0,
};

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="tool-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        className="tool-input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function StrongholdCalculator() {
  const [input, setInput] = useState<StrongholdInput>(defaultInput);
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState(
    STRONGHOLD_COMPONENTS[0]?.id ?? "",
  );

  const result = useMemo(() => calculateStronghold(input), [input]);

  const filteredComponents = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    if (!q) return STRONGHOLD_COMPONENTS;
    return STRONGHOLD_COMPONENTS.filter((c) =>
      c.name.toLowerCase().includes(q),
    );
  }, [componentSearch]);

  function updateInput(patch: Partial<StrongholdInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function addComponent(componentId: string, quantity = 1) {
    setInput((prev) => {
      const existing = prev.components.find((c) => c.componentId === componentId);
      const components = existing
        ? prev.components.map((c) =>
            c.componentId === componentId
              ? { ...c, quantity: c.quantity + quantity }
              : c,
          )
        : [...prev.components, { componentId, quantity }];
      return { ...prev, components };
    });
  }

  function removeComponent(componentId: string) {
    setInput((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.componentId !== componentId),
    }));
  }

  function setComponentQuantity(componentId: string, quantity: number) {
    if (quantity <= 0) {
      removeComponent(componentId);
      return;
    }
    setInput((prev) => ({
      ...prev,
      components: prev.components.map((c) =>
        c.componentId === componentId ? { ...c, quantity } : c,
      ),
    }));
  }

  function addCluster(clusterId: string) {
    const cluster = STRONGHOLD_CLUSTERS.find((c) => c.id === clusterId);
    if (!cluster) return;

    setInput((prev) => {
      let components = [...prev.components];
      for (const item of cluster.components) {
        const existing = components.find(
          (c) => c.componentId === item.componentId,
        );
        if (existing) {
          components = components.map((c) =>
            c.componentId === item.componentId
              ? { ...c, quantity: c.quantity + item.quantity }
              : c,
          );
        } else {
          components.push({ ...item });
        }
      }

      const staff = { ...prev.staff };
      for (const s of cluster.staff) {
        staff[s.role] = (staff[s.role] ?? 0) + s.count;
      }

      return { ...prev, components, staff };
    });
  }

  function toggleFeature(feature: NearbyFeature) {
    setInput((prev) => {
      const has = prev.nearbyFeatures.includes(feature);
      return {
        ...prev,
        nearbyFeatures: has
          ? prev.nearbyFeatures.filter((f) => f !== feature)
          : [...prev.nearbyFeatures, feature],
      };
    });
  }

  function setStaffCount(role: StaffRoleKey, count: number) {
    setInput((prev) => ({
      ...prev,
      staff: { ...prev.staff, [role]: Math.max(0, count) },
    }));
  }

  return (
    <div className="tool-layout">
      <div className="tool-steps">
        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">1</span> Select a Site
          </h2>
          <div className="filter-row">
            <SelectField
              id="climate"
              label="Climate"
              value={input.climate ?? "temperate"}
              onChange={(v) => updateInput({ climate: v as StrongholdInput["climate"] })}
              options={CLIMATE_OPTIONS.map((c) => ({
                value: c.value,
                label: `${c.label} (${c.priceModifier > 0 ? "+" : ""}${c.priceModifier}%)`,
              }))}
            />
            <SelectField
              id="terrain"
              label="Terrain"
              value={input.terrain}
              onChange={(v) => updateInput({ terrain: v as StrongholdInput["terrain"] })}
              options={TERRAIN_OPTIONS.map((t) => ({
                value: t.value,
                label: `${t.label} (${t.priceModifier > 0 ? "+" : ""}${t.priceModifier}%)`,
              }))}
            />
            <SelectField
              id="settlement"
              label="Nearest settlement"
              value={input.settlement}
              onChange={(v) =>
                updateInput({ settlement: v as StrongholdInput["settlement"] })
              }
              options={SETTLEMENT_OPTIONS.map((s) => ({
                value: s.value,
                label: `${s.label} (${s.gpLimit.toLocaleString()} gp limit)`,
              }))}
            />
            <SelectField
              id="distance"
              label="Distance to settlement"
              value={input.settlementDistance}
              onChange={(v) =>
                updateInput({
                  settlementDistance: v as StrongholdInput["settlementDistance"],
                })
              }
              options={DISTANCE_OPTIONS.map((d) => ({
                value: d.value,
                label: d.label,
              }))}
            />
          </div>
          <fieldset className="tool-checkbox-group">
            <legend>Nearby features</legend>
            <div className="tool-checkbox-grid">
              {NEARBY_FEATURE_OPTIONS.map((feature) => (
                <label key={feature.value} className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={input.nearbyFeatures.includes(feature.value)}
                    onChange={() => toggleFeature(feature.value)}
                  />
                  <span>
                    {feature.label} ({feature.modifier > 0 ? "+" : ""}
                    {feature.modifier}%)
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">2</span> Stronghold Size
          </h2>
          <p className="tool-step-desc">
            Total stronghold spaces derived from selected components:{" "}
            <strong>{result.totalSpaces.toLocaleString()} ss</strong>
          </p>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">3</span> Components &amp; Walls
          </h2>

          <div className="tool-cluster-buttons">
            <span className="tool-label">Quick-add clusters:</span>
            <div className="tool-button-row">
              {STRONGHOLD_CLUSTERS.map((cluster) => (
                <button
                  key={cluster.id}
                  type="button"
                  className="tool-btn-secondary"
                  onClick={() => addCluster(cluster.id)}
                  title={cluster.description}
                >
                  {cluster.name}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-add-component">
            <div className="filter-search">
              <span className="tool-label">Add component</span>
              <div className="filter-search-input">
                <Search size={16} aria-hidden />
                <input
                  type="search"
                  placeholder="Search components…"
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="tool-field">
              <Label htmlFor="component-select">Component</Label>
              <select
                id="component-select"
                className="tool-select"
                value={selectedComponentId}
                onChange={(e) => setSelectedComponentId(e.target.value)}
              >
                {filteredComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.cost.toLocaleString()} gp ({c.size} ss)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="tool-btn-primary"
              onClick={() => addComponent(selectedComponentId)}
            >
              <Plus size={16} aria-hidden />
              Add
            </button>
          </div>

          {input.components.length > 0 && (
            <ul className="tool-component-list">
              {input.components.map((sel) => {
                const component = STRONGHOLD_COMPONENTS.find(
                  (c) => c.id === sel.componentId,
                );
                if (!component) return null;
                return (
                  <li key={sel.componentId} className="tool-component-item">
                    <div>
                      <strong>{component.name}</strong>
                      <span className="tool-line-detail">
                        {" "}
                        — {component.cost.toLocaleString()} gp each ({component.size}{" "}
                        ss)
                      </span>
                    </div>
                    <div className="tool-component-actions">
                      <input
                        type="number"
                        className="tool-input tool-input-sm"
                        min={1}
                        value={sel.quantity}
                        onChange={(e) =>
                          setComponentQuantity(
                            sel.componentId,
                            Number(e.target.value),
                          )
                        }
                        aria-label={`Quantity for ${component.name}`}
                      />
                      <button
                        type="button"
                        className="tool-btn-icon"
                        onClick={() => removeComponent(sel.componentId)}
                        aria-label={`Remove ${component.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="filter-row">
            <SelectField
              id="interior-wall"
              label="Interior wall material"
              value={input.interiorWall}
              onChange={(v) =>
                updateInput({ interiorWall: v as WallMaterialKey })
              }
              options={WALL_MATERIALS.map((m) => ({
                value: m.key,
                label: `${m.label} (${m.costPerSpace.toLocaleString()} gp/ss)`,
              }))}
            />
            <SelectField
              id="exterior-wall"
              label="Exterior wall material"
              value={input.exteriorWall}
              onChange={(v) =>
                updateInput({ exteriorWall: v as WallMaterialKey })
              }
              options={WALL_MATERIALS.map((m) => ({
                value: m.key,
                label: `${m.label} (${m.costPerSpace.toLocaleString()} gp/ss)`,
              }))}
            />
            <NumberField
              id="stories"
              label="Stories above ground"
              value={input.storiesAboveGround}
              min={1}
              max={20}
              onChange={(v) => updateInput({ storiesAboveGround: v })}
            />
            <NumberField
              id="subterranean"
              label="Subterranean layers"
              value={input.subterraneanLayers}
              min={1}
              max={20}
              onChange={(v) => updateInput({ subterraneanLayers: v })}
            />
          </div>
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">4</span> Staff &amp; Spellcasting
          </h2>
          <div className="tool-staff-grid">
            {STAFF_MEMBERS.map((member) => (
              <NumberField
                key={member.key}
                id={`staff-${member.key}`}
                label={`${member.label} (${member.monthlyWage} gp/mo)`}
                value={input.staff[member.key] ?? 0}
                min={0}
                onChange={(v) => setStaffCount(member.key, v)}
              />
            ))}
          </div>

          <fieldset className="tool-checkbox-group">
            <legend>Construction spell discounts (Table 1-5)</legend>
            <div className="tool-checkbox-grid">
              {SPELL_DISCOUNTS.map((spell) => (
                <label key={spell.key} className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(input.spellDiscounts[spell.key])}
                    onChange={(e) =>
                      updateInput({
                        spellDiscounts: {
                          ...input.spellDiscounts,
                          [spell.key]: e.target.checked,
                        },
                      })
                    }
                  />
                  <span>
                    <strong>{spell.label}</strong> — {spell.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <NumberField
            id="extras"
            label="Extras cost (manual, gp)"
            value={input.extrasCost}
            min={0}
            step={100}
            onChange={(v) => updateInput({ extrasCost: v })}
          />
        </section>

        <section className="tool-step entity-filters">
          <h2>
            <span className="tool-step-num">5</span> Final Price &amp; Build Time
          </h2>
          <div className="tool-field tool-field-wide">
            <Label htmlFor="rush">
              Rush construction (+{input.rushPercent}% cost, −{input.rushPercent}%
              time, max 70%)
            </Label>
            <input
              id="rush"
              type="range"
              className="tool-range"
              min={0}
              max={70}
              step={10}
              value={input.rushPercent}
              onChange={(e) =>
                updateInput({ rushPercent: Number(e.target.value) })
              }
            />
            <span className="tool-range-value">{input.rushPercent}%</span>
          </div>
        </section>
      </div>

      <StrongholdCostSummary result={result} />
    </div>
  );
}
