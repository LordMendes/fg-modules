"use client";

import Link from "next/link";
import { ArrowLeftRight, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { fetchInventoryItem, listCatalogWeapons, type CatalogWeaponSummary } from "@/actions/data";
import { getPcPlan, getUserPcPlans, type PcPlanSummary } from "@/actions/pc-plans";
import { useAuthUser } from "@/components/auth-provider";
import { useSessionNonce } from "@/components/session-provider";
import { PcInventoryItemEditor } from "@/components/tools/pc-inventory-item-editor";
import {
  compareDamageStatistics,
  DEFAULT_ATTACKER,
  DEFAULT_TARGET,
  DEFAULT_WEAPON,
  DEFAULT_WEAPON_B,
  DR_BYPASS_OPTIONS,
  extractAttackerFromPcPlan,
  extractMainHandWeapons,
  formatExpectedDelta,
  formatExpectedDamage,
  formatHitChance,
  inventoryRowToAnalyzedWeapon,
  SIZE_OPTIONS,
  type AttackerInput,
  type DrEntry,
  type TargetInput,
} from "@/lib/damage-statistic";
import {
  newInventoryId,
  prepareRowForEdit,
} from "@/lib/pc-planner/inventoryItem";
import type { InventoryRow, PcPlanState } from "@/lib/pc-planner/types";

type WeaponSlot = "a" | "b";

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

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
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
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function createDrEntry(): DrEntry {
  return {
    id: newInventoryId(),
    amount: 5,
    bypass: "-",
  };
}

function numericClass(thisVal: number, otherVal: number): string {
  if (!Number.isFinite(thisVal) || Math.abs(thisVal - otherVal) < 0.005) {
    return "damage-statistic-num";
  }
  return thisVal > otherVal
    ? "damage-statistic-num damage-statistic-win"
    : "damage-statistic-num";
}

function deltaClass(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
    return "damage-statistic-num";
  }
  return value > 0
    ? "damage-statistic-num damage-statistic-delta-pos"
    : "damage-statistic-num damage-statistic-delta-neg";
}

function WeaponPanel({
  slot,
  title,
  weapon,
  query,
  summary,
  catalogWeapons,
  catalogError,
  pcWeapons,
  pending,
  onQueryChange,
  onSelectCatalog,
  onSelectPcWeapon,
  onEdit,
}: {
  slot: WeaponSlot;
  title: string;
  weapon: InventoryRow;
  query: string;
  summary: string | null;
  catalogWeapons: CatalogWeaponSummary[];
  catalogError: string | null;
  pcWeapons: InventoryRow[];
  pending: boolean;
  onQueryChange: (value: string) => void;
  onSelectCatalog: (slug: string) => void;
  onSelectPcWeapon: (row: InventoryRow) => void;
  onEdit: () => void;
}) {
  const searchId = `ds-weapon-search-${slot}`;
  const listId = `ds-weapon-options-${slot}`;
  const filteredWeapons = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return catalogWeapons
      .filter((entry) => entry.name.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [catalogWeapons, query]);

  return (
    <section className="category-card damage-statistic-panel">
      <h2 className="damage-statistic-panel-title">{title}</h2>

      {pcWeapons.length > 0 ? (
        <div className="damage-statistic-equipped">
          <span className="tool-label">Equipped on PC</span>
          <div className="damage-statistic-chip-row">
            {pcWeapons.map((row) => (
              <button
                key={`${slot}-${row.id ?? row.slug ?? row.name}`}
                type="button"
                className="tool-btn-secondary damage-statistic-chip"
                onClick={() => onSelectPcWeapon(row)}
              >
                {row.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="tool-field tool-field-wide">
        <Label htmlFor={searchId}>Catalog weapon</Label>
        <input
          id={searchId}
          type="search"
          className="tool-input"
          value={query}
          placeholder="Search weapons…"
          onChange={(event) => onQueryChange(event.target.value)}
          list={listId}
        />
        <datalist id={listId}>
          {filteredWeapons.map((entry) => (
            <option key={entry.slug} value={entry.name} />
          ))}
        </datalist>
        <div className="damage-statistic-weapon-list">
          {query.trim() ? (
            filteredWeapons.map((entry) => (
              <button
                key={entry.slug}
                type="button"
                className="damage-statistic-weapon-option"
                onClick={() => onSelectCatalog(entry.slug)}
                disabled={pending}
              >
                <span>{entry.name}</span>
                {entry.category ? (
                  <span className="damage-statistic-weapon-meta">{entry.category}</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="damage-statistic-note damage-statistic-weapon-hint">
              Type to search catalog weapons.
            </p>
          )}
        </div>
        {catalogError ? (
          <p className="damage-statistic-error">{catalogError}</p>
        ) : null}
      </div>

      <div className="damage-statistic-weapon-summary">
        <div>
          <p className="damage-statistic-weapon-name">{weapon.name || "Weapon"}</p>
          {summary ? (
            <p className="damage-statistic-weapon-line">{summary}</p>
          ) : (
            <p className="damage-statistic-weapon-line">
              No valid weapon damage configured.
            </p>
          )}
        </div>
        <button type="button" className="tool-btn-secondary" onClick={onEdit}>
          <Pencil size={15} aria-hidden />
          Edit
        </button>
      </div>
    </section>
  );
}

export function DamageStatisticCalculator() {
  const user = useAuthUser();
  const nonce = useSessionNonce();
  const [pending, startTransition] = useTransition();

  const [attacker, setAttacker] = useState<AttackerInput>(DEFAULT_ATTACKER);
  const [weaponA, setWeaponA] = useState<InventoryRow>(() => ({
    ...DEFAULT_WEAPON(),
    id: "damage-statistic-weapon-a",
  }));
  const [weaponB, setWeaponB] = useState<InventoryRow>(() => ({
    ...DEFAULT_WEAPON_B(),
    id: "damage-statistic-weapon-b",
  }));
  const [target, setTarget] = useState<TargetInput>(DEFAULT_TARGET);
  const [catalogWeapons, setCatalogWeapons] = useState<CatalogWeaponSummary[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [plans, setPlans] = useState<PcPlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [pcWeapons, setPcWeapons] = useState<InventoryRow[]>([]);
  const [pcSource, setPcSource] = useState<PcPlanState | null>(null);
  const [editingSlot, setEditingSlot] = useState<WeaponSlot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const result = await listCatalogWeapons(nonce);
      if (!result.success || !result.weapons) {
        setCatalogError(result.error ?? "Could not load weapons");
        return;
      }
      setCatalogWeapons(result.weapons);
      setCatalogError(null);
    });
  }, [nonce]);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      return;
    }
    startTransition(async () => {
      try {
        const userPlans = await getUserPcPlans();
        setPlans(userPlans);
      } catch {
        setPlans([]);
      }
    });
  }, [user]);

  const comparison = useMemo(
    () =>
      compareDamageStatistics(
        {
          attacker,
          weapon: inventoryRowToAnalyzedWeapon(weaponA),
          target,
          pcSource,
        },
        {
          attacker,
          weapon: inventoryRowToAnalyzedWeapon(weaponB),
          target,
          pcSource,
        },
      ),
    [attacker, weaponA, weaponB, target, pcSource],
  );

  const patchAttacker = useCallback((patch: Partial<AttackerInput>) => {
    setAttacker((current) => ({ ...current, ...patch }));
  }, []);

  const setWeaponForSlot = useCallback((slot: WeaponSlot, row: InventoryRow) => {
    if (slot === "a") {
      setWeaponA(row);
      setQueryA(row.name);
      return;
    }
    setWeaponB(row);
    setQueryB(row.name);
  }, []);

  const loadCatalogWeapon = useCallback(
    (slot: WeaponSlot, slug: string) => {
      startTransition(async () => {
        const fetched = await fetchInventoryItem({
          source: "equipment",
          slug,
          nonce,
        });
        if (!fetched.success || !fetched.item) {
          setLoadError(fetched.error ?? "Weapon not found");
          return;
        }
        setLoadError(null);
        setWeaponForSlot(slot, {
          ...fetched.item.row,
          id: newInventoryId(),
          quantity: 1,
          weaponHand: "main",
          equipped: true,
        });
      });
    },
    [nonce, setWeaponForSlot],
  );

  const loadPcPlan = useCallback(
    (planId: string) => {
      if (!planId) {
        setSelectedPlanId("");
        setPcWeapons([]);
        setPcSource(null);
        return;
      }
      startTransition(async () => {
        const plan = await getPcPlan(planId);
        if (!plan) {
          setLoadError("PC plan not found");
          return;
        }
        setLoadError(null);
        setSelectedPlanId(planId);
        setPcSource(plan.state);
        const nextAttacker = extractAttackerFromPcPlan(plan.state);
        setAttacker(nextAttacker);
        const equipped = extractMainHandWeapons(plan.state.inventory ?? []);
        setPcWeapons(equipped);
        if (equipped[0]) {
          setWeaponForSlot("a", {
            ...equipped[0],
            id: equipped[0].id ?? newInventoryId(),
          });
        }
        if (equipped[1]) {
          setWeaponForSlot("b", {
            ...equipped[1],
            id: equipped[1].id ?? newInventoryId(),
          });
        }
      });
    },
    [setWeaponForSlot],
  );

  function openWeaponEditor(slot: WeaponSlot) {
    const setter = slot === "a" ? setWeaponA : setWeaponB;
    setter((current) => {
      const next = structuredClone(current);
      prepareRowForEdit(next);
      return next;
    });
    setEditingSlot(slot);
  }

  function swapWeapons() {
    setWeaponA(weaponB);
    setWeaponB(weaponA);
    setQueryA(queryB);
    setQueryB(queryA);
    if (editingSlot === "a") setEditingSlot("b");
    else if (editingSlot === "b") setEditingSlot("a");
  }

  function copyAToB() {
    setWeaponForSlot("b", {
      ...structuredClone(weaponA),
      id: newInventoryId(),
    });
  }

  const editingWeapon = editingSlot === "b" ? weaponB : weaponA;
  const patchEditingWeapon = editingSlot === "b" ? setWeaponB : setWeaponA;

  return (
    <div className="damage-statistic-calculator">
      <div className="damage-statistic-grid">
        <section className="category-card damage-statistic-panel">
          <h2 className="damage-statistic-panel-title">Attacker</h2>

          {user ? (
            <div className="tool-field tool-field-wide">
              <Label htmlFor="ds-pc-plan">Saved PC</Label>
              <select
                id="ds-pc-plan"
                className="tool-input"
                value={selectedPlanId}
                onChange={(event) => loadPcPlan(event.target.value)}
                disabled={pending}
              >
                <option value="">Manual stats</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.classSummary})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="damage-statistic-note">
              <Link href="/login">Sign in</Link> to load a saved PC Planner character.
            </p>
          )}

          <div className="damage-statistic-fields">
            <NumberField
              id="ds-bab"
              label="BAB"
              value={attacker.bab}
              min={0}
              max={30}
              onChange={(value) => patchAttacker({ bab: value })}
            />
            <NumberField
              id="ds-str"
              label="Strength"
              value={attacker.str}
              min={1}
              max={50}
              onChange={(value) => patchAttacker({ str: value })}
            />
            <NumberField
              id="ds-dex"
              label="Dexterity"
              value={attacker.dex}
              min={1}
              max={50}
              onChange={(value) => patchAttacker({ dex: value })}
            />
            <div className="tool-field">
              <Label htmlFor="ds-size">Size</Label>
              <select
                id="ds-size"
                className="tool-input"
                value={attacker.sizeMod}
                onChange={(event) =>
                  patchAttacker({ sizeMod: Number(event.target.value) })
                }
              >
                {SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <NumberField
              id="ds-pa"
              label="Power Attack"
              value={attacker.powerAttack}
              min={0}
              max={attacker.bab}
              onChange={(value) => patchAttacker({ powerAttack: value })}
            />
            <NumberField
              id="ds-melee-misc"
              label="Melee misc"
              value={attacker.meleeMisc}
              min={-20}
              max={20}
              onChange={(value) => patchAttacker({ meleeMisc: value })}
            />
            <NumberField
              id="ds-ranged-misc"
              label="Ranged misc"
              value={attacker.rangedMisc}
              min={-20}
              max={20}
              onChange={(value) => patchAttacker({ rangedMisc: value })}
            />
          </div>
        </section>

        <section className="category-card damage-statistic-panel">
          <h2 className="damage-statistic-panel-title">Target</h2>
          <div className="damage-statistic-fields">
            <NumberField
              id="ds-ac-min"
              label="AC from"
              value={target.acMin}
              min={1}
              max={60}
              onChange={(value) =>
                setTarget((current) => ({ ...current, acMin: value }))
              }
            />
            <NumberField
              id="ds-ac-max"
              label="AC to"
              value={target.acMax}
              min={1}
              max={60}
              onChange={(value) =>
                setTarget((current) => ({ ...current, acMax: value }))
              }
            />
          </div>

          <div className="damage-statistic-dr">
            <div className="damage-statistic-dr-header">
              <span className="tool-label">Damage reduction</span>
              <button
                type="button"
                className="tool-btn-secondary"
                onClick={() =>
                  setTarget((current) => ({
                    ...current,
                    dr: [...current.dr, createDrEntry()],
                  }))
                }
              >
                <Plus size={15} aria-hidden />
                Add DR
              </button>
            </div>
            {target.dr.length === 0 ? (
              <p className="damage-statistic-note">No DR applied.</p>
            ) : (
              <ul className="damage-statistic-dr-list">
                {target.dr.map((entry) => (
                  <li key={entry.id} className="damage-statistic-dr-row">
                    <div className="tool-field">
                      <Label htmlFor={`dr-amount-${entry.id}`}>Amount</Label>
                      <input
                        id={`dr-amount-${entry.id}`}
                        type="number"
                        className="tool-input"
                        min={0}
                        value={entry.amount}
                        onChange={(event) =>
                          setTarget((current) => ({
                            ...current,
                            dr: current.dr.map((row) =>
                              row.id === entry.id
                                ? {
                                    ...row,
                                    amount: Number(event.target.value),
                                  }
                                : row,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="tool-field">
                      <Label htmlFor={`dr-bypass-${entry.id}`}>Bypassed by</Label>
                      <select
                        id={`dr-bypass-${entry.id}`}
                        className="tool-input"
                        value={entry.bypass}
                        onChange={(event) =>
                          setTarget((current) => ({
                            ...current,
                            dr: current.dr.map((row) =>
                              row.id === entry.id
                                ? {
                                    ...row,
                                    bypass: event.target
                                      .value as DrEntry["bypass"],
                                  }
                                : row,
                            ),
                          }))
                        }
                      >
                        {DR_BYPASS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="tool-btn-icon"
                      aria-label="Remove DR"
                      onClick={() =>
                        setTarget((current) => ({
                          ...current,
                          dr: current.dr.filter((row) => row.id !== entry.id),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="damage-statistic-weapons-toolbar">
        <button type="button" className="tool-btn-secondary" onClick={swapWeapons}>
          <ArrowLeftRight size={15} aria-hidden />
          Swap weapons
        </button>
        <button type="button" className="tool-btn-secondary" onClick={copyAToB}>
          <Copy size={15} aria-hidden />
          Copy A to B
        </button>
      </div>

      <div className="damage-statistic-weapons">
        <WeaponPanel
          slot="a"
          title="Weapon A"
          weapon={weaponA}
          query={queryA}
          summary={comparison?.a.weaponSummary ?? null}
          catalogWeapons={catalogWeapons}
          catalogError={catalogError}
          pcWeapons={pcWeapons}
          pending={pending}
          onQueryChange={setQueryA}
          onSelectCatalog={(slug) => loadCatalogWeapon("a", slug)}
          onSelectPcWeapon={(row) =>
            setWeaponForSlot("a", { ...row, id: row.id ?? newInventoryId() })
          }
          onEdit={() => openWeaponEditor("a")}
        />
        <WeaponPanel
          slot="b"
          title="Weapon B"
          weapon={weaponB}
          query={queryB}
          summary={comparison?.b.weaponSummary ?? null}
          catalogWeapons={catalogWeapons}
          catalogError={catalogError}
          pcWeapons={pcWeapons}
          pending={pending}
          onQueryChange={setQueryB}
          onSelectCatalog={(slug) => loadCatalogWeapon("b", slug)}
          onSelectPcWeapon={(row) =>
            setWeaponForSlot("b", { ...row, id: row.id ?? newInventoryId() })
          }
          onEdit={() => openWeaponEditor("b")}
        />
      </div>

      {loadError ? <p className="damage-statistic-error">{loadError}</p> : null}

      <section className="category-card damage-statistic-results">
        <h2 className="damage-statistic-panel-title">Expected damage by AC</h2>
        {!comparison || comparison.rows.length === 0 ? (
          <p className="damage-statistic-note">
            Configure both weapons with valid damage dice to compare them.
          </p>
        ) : (
          <>
            <p className="damage-statistic-note">
              Difference is Weapon B minus Weapon A for one round.
            </p>
            <div className="damage-statistic-table-wrap">
              <table className="damage-statistic-table damage-statistic-compare-table">
                <thead>
                  <tr>
                    <th scope="col" rowSpan={2}>
                      AC
                    </th>
                    <th scope="colgroup" colSpan={3}>
                      {weaponA.name || "Weapon A"}
                    </th>
                    <th scope="colgroup" colSpan={3}>
                      {weaponB.name || "Weapon B"}
                    </th>
                    <th scope="colgroup" colSpan={2}>
                      Difference
                    </th>
                  </tr>
                  <tr>
                    <th scope="col">Hit</th>
                    <th scope="col">Standard</th>
                    <th scope="col">Full attack</th>
                    <th scope="col">Hit</th>
                    <th scope="col">Standard</th>
                    <th scope="col">Full attack</th>
                    <th scope="col">Standard</th>
                    <th scope="col">Full attack</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.ac}>
                      <td>{row.ac}</td>
                      <td className="damage-statistic-num">
                        {formatHitChance(row.a.hitChance)}
                      </td>
                      <td className={numericClass(row.a.standardDamage, row.b.standardDamage)}>
                        {formatExpectedDamage(row.a.standardDamage)}
                      </td>
                      <td
                        className={numericClass(
                          row.a.fullAttackDamage,
                          row.b.fullAttackDamage,
                        )}
                      >
                        {formatExpectedDamage(row.a.fullAttackDamage)}
                      </td>
                      <td className="damage-statistic-num">
                        {formatHitChance(row.b.hitChance)}
                      </td>
                      <td className={numericClass(row.b.standardDamage, row.a.standardDamage)}>
                        {formatExpectedDamage(row.b.standardDamage)}
                      </td>
                      <td
                        className={numericClass(
                          row.b.fullAttackDamage,
                          row.a.fullAttackDamage,
                        )}
                      >
                        {formatExpectedDamage(row.b.fullAttackDamage)}
                      </td>
                      <td className={deltaClass(row.standardDelta)}>
                        {formatExpectedDelta(row.standardDelta)}
                      </td>
                      <td className={deltaClass(row.fullAttackDelta)}>
                        {formatExpectedDelta(row.fullAttackDelta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {editingSlot ? (
        <PcInventoryItemEditor
          row={editingWeapon}
          zIndex={120}
          cascadeIndex={0}
          closeOnEscape
          onActivate={() => {}}
          onClose={() => setEditingSlot(null)}
          patchRow={(fn) =>
            patchEditingWeapon((current) => {
              const next = structuredClone(current);
              fn(next);
              return next;
            })
          }
          feats={attacker.feats}
          abilities={{
            str: attacker.str,
            dex: attacker.dex,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
          }}
        />
      ) : null}
    </div>
  );
}
