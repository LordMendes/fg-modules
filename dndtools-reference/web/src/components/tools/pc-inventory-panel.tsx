"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Backpack, Package, Pencil, Plus, Shield, Shirt, Sparkles, Sword, Trash2 } from "lucide-react";
import { fetchInventoryItem } from "@/actions/data";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { PcInventoryItemEditor } from "@/components/tools/pc-inventory-item-editor";
import { useSessionNonce } from "@/components/session-provider";
import type { CategoryKey } from "@/lib/categories";
import { formatDamageType } from "@/lib/equipment-display";
import {
  computeEquippedGear,
  equipInventoryRow,
  equipWeaponHand,
  isArmorKind,
  isShieldKind,
  isWeaponKind,
  unequipWeapon,
  weaponAllowsOffHand,
  weaponOccupiesBothHands,
} from "@/lib/pc-planner/equippedGear";
import {
  computeEncumbrance,
  type LoadCategory,
  type ArmorLoadCategory,
} from "@/lib/pc-planner/encumbrance";
import type { ClassDerivedFeatures } from "@/lib/pc-planner/parseClassAbilityEffects";
import { deriveFeatEffects } from "@/lib/pc-planner/parseFeatEffects";
import type { RaceDerivedFeatures } from "@/lib/pc-planner/parseRaceFeatures";
import {
  formatInventoryDamageMeta,
  inventoryAbilityLabels,
  newInventoryId,
  prepareRowForEdit,
} from "@/lib/pc-planner/inventoryItem";
import {
  createCustomTreasureRow,
  ensureTreasure,
} from "@/lib/pc-planner/treasure";
import { needsWeaponStatBackfill } from "@/lib/pc-planner/weaponAttacks";
import type { InventoryRow, PcPlanState } from "@/lib/pc-planner/types";

const INVENTORY_SEARCH_CATEGORIES: CategoryKey[] = ["equipment", "items"];

type KindTone = "weapon" | "armor" | "shield" | "gear" | "magic" | "item";

const KIND_ICONS = {
  weapon: Sword,
  armor: Shirt,
  shield: Shield,
  gear: Backpack,
  magic: Sparkles,
  item: Package,
} as const;

export type PcInventoryPanelProps = {
  state: PcPlanState;
  patch: (fn: (draft: PcPlanState) => void) => void;
  onAddInventoryRow: () => void;
  raceFeatures?: RaceDerivedFeatures | null;
  classFeatures?: ClassDerivedFeatures | null;
};

function kindTone(row: InventoryRow): KindTone {
  const kind = (row.kind ?? "").toLowerCase();
  if (kind === "weapon") return "weapon";
  if (kind === "armor") return "armor";
  if (kind === "shield") return "shield";
  if (kind === "goods" || kind === "gear") return "gear";
  if (row.source === "item") return "magic";
  return "item";
}

function kindLabel(row: InventoryRow): string {
  if (row.kind?.trim()) return row.kind.trim();
  if (row.source === "item") return "magic";
  return "item";
}

function formatPounds(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0 lb";
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} lb`;
}

function loadTone(
  category: LoadCategory | ArmorLoadCategory,
): "light" | "medium" | "heavy" | "overloaded" {
  if (category === "none" || category === "light") return "light";
  if (category === "medium") return "medium";
  if (category === "overloaded") return "overloaded";
  return "heavy";
}

function formatLoadLabel(category: LoadCategory | ArmorLoadCategory): string {
  if (category === "none") return "Light";
  if (category === "overloaded") return "Overloaded";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function encumbranceCaption(input: {
  carriedWeight: number;
  heavyMax: number;
  weightCategory: LoadCategory;
  armorCategory: ArmorLoadCategory;
  speedUnhindered: boolean;
  speedUnhinderedReason: string | null;
  overloaded: boolean;
}): string {
  const weightLine = `${formatPounds(input.carriedWeight)} / ${formatPounds(input.heavyMax)} · ${formatLoadLabel(input.weightCategory)}`;
  const parts = [weightLine];
  if (input.armorCategory !== "none" && input.armorCategory !== "light") {
    parts.push(`${formatLoadLabel(input.armorCategory)} armor`);
  }
  if (input.speedUnhindered && input.speedUnhinderedReason) {
    parts.push("speed unhindered");
  }
  if (input.overloaded) {
    parts.push("Overloaded");
  }
  return parts.join(" · ");
}

function formatCrit(raw: string): string {
  return raw.replace(/[x×]/gi, "×");
}

function formatHanded(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "two") return "two-handed";
  if (value === "one") return "one-handed";
  return raw.trim();
}

function inventoryRowMeta(row: InventoryRow): string | null {
  const parts: string[] = [];
  if ((row.enhancementBonus ?? 0) > 0) parts.push(`+${row.enhancementBonus}`);
  else if (row.masterwork) parts.push("masterwork");
  const damageMeta = formatInventoryDamageMeta(row);
  if (damageMeta) {
    parts.push(damageMeta);
  } else {
    if (row.damageM) parts.push(row.damageM);
    const damageType = formatDamageType(row.damageType);
    if (damageType) parts.push(damageType.toLowerCase());
  }
  if (row.critical) parts.push(formatCrit(row.critical));
  if (row.handed) parts.push(formatHanded(row.handed));
  if (row.rangeIncrement) {
    const range = row.rangeIncrement.replace(/ft\.?$/i, "").trim();
    parts.push(`${range} ft`);
  }
  if (row.armorBonus != null && Number.isFinite(row.armorBonus)) {
    const ac =
      (row.armorBonus ?? 0) + Math.max(0, row.enhancementBonus ?? 0);
    parts.push(`+${ac} AC`);
  }
  if (row.maxDex != null && Number.isFinite(row.maxDex)) {
    parts.push(`max Dex ${row.maxDex}`);
  }
  if (row.acp != null && Number.isFinite(row.acp) && row.acp !== 0) {
    parts.push(`ACP ${row.acp}`);
  }
  const abilities = inventoryAbilityLabels(row);
  if (abilities.length > 0) parts.push(abilities.join(", "));
  const spells = (row.spellEffects ?? []).map((effect) => effect.name);
  if (spells.length > 0) parts.push(spells.join(", "));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function PcInventoryPanel({
  state,
  patch,
  onAddInventoryRow,
  raceFeatures = null,
  classFeatures = null,
}: PcInventoryPanelProps) {
  const [, startInventoryTransition] = useTransition();
  const nonce = useSessionNonce();
  const router = useRouter();
  const weaponBackfillAttempted = useRef(new Set<string>());
  const focusNewRow = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  const removeConfirmRef = useRef<HTMLDivElement>(null);
  const removeConfirmBtnRef = useRef<HTMLButtonElement>(null);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const [openEditorIds, setOpenEditorIds] = useState<string[]>([]);
  const [editorZOrder, setEditorZOrder] = useState<string[]>([]);

  /** Backfill weapon damage/crit for older inventory rows that only have kind. */
  useEffect(() => {
    const missing = (state.inventory ?? [])
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (!needsWeaponStatBackfill(row) || !row.slug) return false;
        const key = `${row.source ?? "equipment"}:${row.slug}`;
        return !weaponBackfillAttempted.current.has(key);
      });
    if (missing.length === 0) return;

    for (const { row } of missing) {
      if (row.slug) {
        weaponBackfillAttempted.current.add(
          `${row.source ?? "equipment"}:${row.slug}`,
        );
      }
    }

    let cancelled = false;
    startInventoryTransition(async () => {
      for (const { row, index } of missing) {
        if (cancelled || !row.slug) continue;
        const result = await fetchInventoryItem({
          source: "equipment",
          slug: row.slug,
          nonce,
        });
        if (cancelled) return;
        if (!result.success || !result.item) continue;
        const looked = result.item.row;
        if (!looked.damageM && !looked.damageS) continue;
        patch((s) => {
          const current = s.inventory[index];
          if (!current || current.slug !== row.slug) return;
          if (current.damageM || current.damageS) return;
          current.damageM = looked.damageM;
          current.damageS = looked.damageS;
          current.critical = looked.critical;
          current.damageType = looked.damageType;
          current.handed = looked.handed;
          current.rangeIncrement = looked.rangeIncrement;
          if (!current.kind) current.kind = looked.kind;
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.inventory, nonce, patch, startInventoryTransition]);

  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    const input = listRef.current?.querySelector<HTMLInputElement>(
      "li:last-child .pc-inventory-name",
    );
    input?.focus();
  }, [state.inventory.length]);

  useEffect(() => {
    if (pendingRemove == null) {
      setConfirmReady(false);
      return;
    }
    const arm = window.setTimeout(() => {
      setConfirmReady(true);
      removeConfirmBtnRef.current?.focus();
    }, 220);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPendingRemove(null);
    }
    function onPointerDown(event: PointerEvent) {
      const root = removeConfirmRef.current;
      if (root && !root.contains(event.target as Node)) {
        setPendingRemove(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pendingRemove]);

  useEffect(() => {
    if (pendingRemove == null) return;
    if (pendingRemove >= (state.inventory?.length ?? 0)) {
      setPendingRemove(null);
    }
  }, [pendingRemove, state.inventory?.length]);

  useEffect(() => {
    const missing = (state.inventory ?? []).some((row) => !row.id);
    if (!missing) return;
    patch((s) => {
      for (const row of s.inventory) {
        if (!row.id) row.id = newInventoryId();
      }
    });
  }, [state.inventory, patch]);

  useEffect(() => {
    const ids = new Set((state.inventory ?? []).map((row) => row.id).filter(Boolean));
    setOpenEditorIds((prev) => prev.filter((id) => ids.has(id)));
    setEditorZOrder((prev) => prev.filter((id) => ids.has(id)));
  }, [state.inventory]);

  const inventory = state.inventory ?? [];
  const treasure = ensureTreasure(state.treasure);
  const builtinTreasure = treasure.filter((row) => row.builtin);
  const extraTreasure = treasure.filter((row) => !row.builtin);
  const equippedGear = computeEquippedGear(inventory, state.combat.speedBase);
  const encumbrance = computeEncumbrance(state, {
    raceFeatures,
    featFeatures: deriveFeatEffects(state.feats),
    classFeatures,
    equippedGear,
  });
  const fillTone = loadTone(
    encumbrance.overloaded ? "overloaded" : encumbrance.highlightCategory,
  );
  const fillPercent = Math.min(
    100,
    encumbrance.limits.heavy > 0
      ? (encumbrance.carriedWeight / encumbrance.limits.heavy) * 100
      : 0,
  );
  const caption = encumbranceCaption({
    carriedWeight: encumbrance.carriedWeight,
    heavyMax: encumbrance.limits.heavy,
    weightCategory: encumbrance.weightCategory,
    armorCategory: encumbrance.armorCategory,
    speedUnhindered: encumbrance.speedUnhindered,
    speedUnhinderedReason: encumbrance.speedUnhinderedReason,
    overloaded: encumbrance.overloaded,
  });

  function addCustomItem() {
    focusNewRow.current = true;
    setPendingRemove(null);
    onAddInventoryRow();
  }

  function activateEditor(id: string) {
    setEditorZOrder((prev) => [...prev.filter((entry) => entry !== id), id]);
  }

  function openEditor(index: number) {
    const existingId = inventory[index]?.id;
    const id = existingId ?? newInventoryId();
    patch((s) => {
      const row = s.inventory[index];
      if (!row) return;
      if (!row.id) row.id = id;
      prepareRowForEdit(row);
    });
    setOpenEditorIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    activateEditor(id);
  }

  function closeEditor(id: string) {
    setOpenEditorIds((prev) => prev.filter((entry) => entry !== id));
    setEditorZOrder((prev) => prev.filter((entry) => entry !== id));
  }

  function patchTreasure(fn: (rows: PcPlanState["treasure"]) => void) {
    patch((s) => {
      s.treasure = ensureTreasure(s.treasure);
      fn(s.treasure);
    });
  }

  function addTreasureRow() {
    patchTreasure((rows) => {
      rows.push(createCustomTreasureRow());
    });
  }

  function confirmRemove(index: number) {
    const removedId = inventory[index]?.id;
    patch((s) => {
      s.inventory.splice(index, 1);
    });
    if (removedId) closeEditor(removedId);
    setPendingRemove(null);
  }

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-inventory-panel" role="tabpanel">
      <div className="npc-sheet-block">
        <div className="pc-skills-header">
          <h3>Inventory</h3>
          <span className="pc-skill-points-summary" title="Total carried weight">
            {formatPounds(encumbrance.carriedWeight)}
          </span>
        </div>

        <div
          className={`pc-encumbrance pc-encumbrance--${fillTone}`}
          role="meter"
          aria-label="Encumbrance"
          aria-valuemin={0}
          aria-valuemax={encumbrance.limits.heavy}
          aria-valuenow={Math.min(encumbrance.carriedWeight, encumbrance.limits.heavy)}
          aria-valuetext={caption}
        >
          <div className="pc-encumbrance-track">
            <div
              className="pc-encumbrance-fill"
              style={{ width: `${Math.min(100, Math.max(0, fillPercent))}%` }}
            />
            <div className="pc-encumbrance-segments" aria-hidden>
              {(["light", "medium", "heavy"] as const).map((zone) => {
                const active = loadTone(encumbrance.highlightCategory) === zone
                  || (zone === "heavy" && encumbrance.overloaded);
                return (
                  <span
                    key={zone}
                    className={`pc-encumbrance-segment${active ? " is-active" : ""}`}
                  >
                    {zone.charAt(0).toUpperCase() + zone.slice(1)}
                  </span>
                );
              })}
            </div>
            <div className="pc-encumbrance-ticks" aria-hidden>
              <span className="pc-encumbrance-tick" style={{ left: "33.333%" }} />
              <span className="pc-encumbrance-tick" style={{ left: "66.666%" }} />
            </div>
          </div>
          <p className="pc-encumbrance-caption">{caption}</p>
        </div>

        <div className="pc-inventory-toolbar">
          <div className="pc-inventory-search">
            <EntitySearchCombobox
              categories={INVENTORY_SEARCH_CATEGORIES}
              placeholder="Search equipment or magic items…"
              label="Add equipment or magic item"
              onSelect={(hit) => {
                startInventoryTransition(async () => {
                  let result = await fetchInventoryItem({
                    source: "equipment",
                    slug: hit.slug,
                    nonce,
                  });
                  if (!result.success || !result.item) {
                    result = await fetchInventoryItem({
                      source: "item",
                      slug: hit.slug,
                      nonce,
                    });
                  }
                  if (!result.success || !result.item) {
                    if (result.error === "Invalid session") router.refresh();
                    patch((s) => {
                      s.inventory.push({
                        id: newInventoryId(),
                        name: hit.name,
                        quantity: 1,
                        weight: 0,
                        slug: hit.slug,
                      });
                    });
                    return;
                  }
                  const looked = result.item;
                  patch((s) => {
                    s.inventory.push({
                      ...looked.row,
                      id: newInventoryId(),
                      quantity: 1,
                      equipped: false,
                    });
                  });
                });
              }}
            />
          </div>
          <button
            type="button"
            className="tool-btn-secondary pc-inventory-add-custom"
            onClick={addCustomItem}
          >
            <Plus size={16} aria-hidden />
            Custom item
          </button>
        </div>

        {inventory.length === 0 ? (
          <p className="pc-sheet-empty">
            Search the compendium to add gear, or start with a custom item.
          </p>
        ) : (
          <ul className="pc-inventory-list" ref={listRef}>
            {inventory.map((row, i) => {
              const isWeapon = isWeaponKind(row.kind);
              const canEquipArmor = isArmorKind(row.kind) || isShieldKind(row.kind);
              const equipped = Boolean(row.equipped);
              const weaponHand = row.weaponHand ?? null;
              const allowsOff = isWeapon && weaponAllowsOffHand(row);
              const bothHands = isWeapon && weaponOccupiesBothHands(row);
              const tone = kindTone(row);
              const Icon = KIND_ICONS[tone];
              const meta = inventoryRowMeta(row);
              return (
                <li
                  key={row.id ?? `${row.slug ?? row.name}-${i}`}
                  className={`pc-inventory-row${equipped || weaponHand ? " pc-inventory-row--equipped" : ""}${
                    pendingRemove === i ? " pc-inventory-row--pending-remove" : ""
                  }`}
                >
                  <div className="pc-inventory-row-main">
                    <span
                      className={`pc-inventory-kind-icon pc-inventory-kind-icon--${tone}`}
                      title={kindLabel(row)}
                      aria-hidden
                    >
                      <Icon size={15} strokeWidth={2.25} />
                    </span>
                    <div className="pc-inventory-identity">
                      <input
                        type="text"
                        className="pc-sheet-input pc-inventory-name"
                        value={row.name}
                        placeholder="Item name"
                        aria-label="Item name"
                        onChange={(e) =>
                          patch((s) => {
                            s.inventory[i].name = e.target.value;
                          })
                        }
                      />
                      <div className="pc-inventory-meta">
                        <span className={`pc-inventory-kind-chip pc-inventory-kind-chip--${tone}`}>
                          {kindLabel(row)}
                        </span>
                        {row.customized ? (
                          <span className="pc-inventory-kind-chip pc-inventory-kind-chip--custom">
                            custom
                          </span>
                        ) : null}
                        {weaponHand === "main" ? (
                          <span className="pc-inventory-kind-chip pc-inventory-kind-chip--hand">
                            main
                          </span>
                        ) : null}
                        {weaponHand === "off" ? (
                          <span className="pc-inventory-kind-chip pc-inventory-kind-chip--hand">
                            off-hand
                          </span>
                        ) : null}
                        {meta ? <span className="pc-inventory-stats">{meta}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="pc-inventory-row-controls">
                    <label className="pc-inventory-field pc-inventory-field--qty">
                      <span>Qty</span>
                      <input
                        type="number"
                        min={0}
                        className="pc-sheet-input pc-inventory-num"
                        value={row.quantity}
                        onChange={(e) =>
                          patch((s) => {
                            s.inventory[i].quantity = Number(e.target.value);
                          })
                        }
                      />
                    </label>
                    <label className="pc-inventory-field pc-inventory-field--wt">
                      <span>Wt</span>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        className="pc-sheet-input pc-inventory-num"
                        value={row.weight}
                        aria-label="Weight in pounds"
                        onChange={(e) =>
                          patch((s) => {
                            s.inventory[i].weight = Number(e.target.value);
                          })
                        }
                      />
                    </label>
                    <div className="pc-inventory-equip-slot">
                      {allowsOff ? (
                        <div
                          className="pc-inventory-hand-btns"
                          role="group"
                          aria-label="Weapon hand"
                        >
                          <button
                            type="button"
                            className="pc-inventory-equip-btn"
                            aria-pressed={weaponHand === "main"}
                            title={
                              weaponHand === "main"
                                ? "Unequip main hand"
                                : "Equip as main hand"
                            }
                            onClick={() =>
                              patch((s) => {
                                if (s.inventory[i].weaponHand === "main") {
                                  unequipWeapon(s.inventory, i);
                                } else {
                                  equipWeaponHand(s.inventory, i, "main");
                                }
                              })
                            }
                          >
                            Main
                          </button>
                          <button
                            type="button"
                            className="pc-inventory-equip-btn"
                            aria-pressed={weaponHand === "off"}
                            title={
                              weaponHand === "off"
                                ? "Unequip off-hand"
                                : "Equip as off-hand"
                            }
                            onClick={() =>
                              patch((s) => {
                                if (s.inventory[i].weaponHand === "off") {
                                  unequipWeapon(s.inventory, i);
                                } else {
                                  equipWeaponHand(s.inventory, i, "off");
                                }
                              })
                            }
                          >
                            Off
                          </button>
                        </div>
                      ) : null}
                      {bothHands ? (
                        <button
                          type="button"
                          className="pc-inventory-equip-btn"
                          aria-pressed={weaponHand === "main"}
                          title={weaponHand === "main" ? "Unequip" : "Equip"}
                          onClick={() =>
                            patch((s) => {
                              if (s.inventory[i].weaponHand === "main") {
                                unequipWeapon(s.inventory, i);
                              } else {
                                equipWeaponHand(s.inventory, i, "main");
                              }
                            })
                          }
                        >
                          {weaponHand === "main" ? "Equipped" : "Equip"}
                        </button>
                      ) : null}
                      {canEquipArmor ? (
                        <button
                          type="button"
                          className="pc-inventory-equip-btn"
                          aria-pressed={equipped}
                          title={equipped ? "Unequip" : "Equip"}
                          onClick={() =>
                            patch((s) => {
                              if (equipped) {
                                s.inventory[i].equipped = false;
                              } else {
                                equipInventoryRow(s.inventory, i);
                              }
                            })
                          }
                        >
                          {equipped ? "Equipped" : "Equip"}
                        </button>
                      ) : null}
                    </div>
                    {pendingRemove === i ? (
                      <div
                        ref={removeConfirmRef}
                        className="pc-inventory-remove-confirm"
                        role="group"
                        aria-label={`Confirm remove ${row.name || "item"}`}
                      >
                        <button
                          type="button"
                          className="pc-inventory-keep-btn"
                          onClick={() => setPendingRemove(null)}
                        >
                          Keep
                        </button>
                        <button
                          ref={removeConfirmBtnRef}
                          type="button"
                          className="pc-inventory-remove pc-inventory-remove--confirm"
                          title={`Confirm remove ${row.name || "item"}`}
                          aria-label={`Confirm remove ${row.name || "item"}`}
                          disabled={!confirmReady}
                          onClick={() => confirmRemove(i)}
                        >
                          <Trash2 size={14} aria-hidden />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="tool-btn-icon pc-inventory-edit"
                          title={`Edit ${row.name || "item"}`}
                          aria-label={`Edit ${row.name || "item"}`}
                          onClick={() => openEditor(i)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="tool-btn-icon pc-inventory-remove"
                          title={`Remove ${row.name || "item"}`}
                          aria-label={`Remove ${row.name || "item"}`}
                          onClick={() => setPendingRemove(i)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {equippedGear.armorName ||
        equippedGear.shieldName ||
        equippedGear.mainWeaponName ||
        equippedGear.offWeaponName ? (
          <div className="pc-inventory-loadout">
            <span className="pc-inventory-loadout-label">Wearing</span>
            {equippedGear.armorName ? (
              <span className="pc-inventory-loadout-chip">{equippedGear.armorName}</span>
            ) : null}
            {equippedGear.shieldName ? (
              <span className="pc-inventory-loadout-chip">{equippedGear.shieldName}</span>
            ) : null}
            {equippedGear.mainWeaponName ? (
              <span className="pc-inventory-loadout-chip">
                {equippedGear.mainWeaponName} (main)
              </span>
            ) : null}
            {equippedGear.offWeaponName ? (
              <span className="pc-inventory-loadout-chip">
                {equippedGear.offWeaponName} (off-hand)
              </span>
            ) : null}
            {equippedGear.acp !== 0 ? (
              <span className="pc-inventory-loadout-acp">ACP {equippedGear.acp}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="npc-sheet-block pc-treasure-block">
        <div className="pc-skills-header">
          <h3>Treasure</h3>
          <button
            type="button"
            className="tool-btn-secondary pc-inventory-add-custom"
            onClick={addTreasureRow}
          >
            <Plus size={16} aria-hidden />
            Add currency
          </button>
        </div>
        <ul className="pc-treasure-coins">
          {builtinTreasure.map((row) => (
            <li key={row.id} className="pc-treasure-coin">
              <label className="pc-inventory-field">
                <span>{row.name}</span>
                <input
                  type="number"
                  min={0}
                  className="pc-sheet-input pc-inventory-num pc-treasure-amount"
                  value={row.amount}
                  aria-label={`${row.name} amount`}
                  onChange={(event) =>
                    patchTreasure((rows) => {
                      const current = rows.find((entry) => entry.id === row.id);
                      if (current) current.amount = Number(event.target.value);
                    })
                  }
                />
              </label>
            </li>
          ))}
        </ul>
        {extraTreasure.length > 0 ? (
          <ul className="pc-treasure-extras">
            {extraTreasure.map((row) => (
              <li key={row.id} className="pc-treasure-extra">
                <input
                  type="text"
                  className="pc-sheet-input pc-treasure-name"
                  value={row.name}
                  placeholder="Currency name"
                  aria-label="Currency name"
                  onChange={(event) =>
                    patchTreasure((rows) => {
                      const current = rows.find((entry) => entry.id === row.id);
                      if (current) current.name = event.target.value;
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  className="pc-sheet-input pc-inventory-num pc-treasure-amount"
                  value={row.amount}
                  aria-label={`${row.name || "Custom currency"} amount`}
                  onChange={(event) =>
                    patchTreasure((rows) => {
                      const current = rows.find((entry) => entry.id === row.id);
                      if (current) current.amount = Number(event.target.value);
                    })
                  }
                />
                <button
                  type="button"
                  className="tool-btn-icon pc-inventory-remove"
                  title={`Remove ${row.name || "currency"}`}
                  aria-label={`Remove ${row.name || "currency"}`}
                  onClick={() =>
                    patchTreasure((rows) => {
                      const index = rows.findIndex((entry) => entry.id === row.id);
                      if (index >= 0 && !rows[index].builtin) rows.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {openEditorIds.map((id) => {
        const row = inventory.find((entry) => entry.id === id);
        if (!row) return null;
        const zRank = Math.max(0, editorZOrder.indexOf(id));
        return (
          <PcInventoryItemEditor
            key={id}
            row={row}
            zIndex={120 + zRank}
            cascadeIndex={openEditorIds.indexOf(id)}
            closeOnEscape={editorZOrder[editorZOrder.length - 1] === id}
            onActivate={() => activateEditor(id)}
            onClose={() => closeEditor(id)}
            patchRow={(fn) =>
              patch((s) => {
                const current = s.inventory.find((entry) => entry.id === id);
                if (!current) return;
                fn(current);
              })
            }
          />
        );
      })}
    </div>
  );
}
