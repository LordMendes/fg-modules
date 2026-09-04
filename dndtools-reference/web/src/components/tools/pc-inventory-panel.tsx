"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Backpack, Package, Plus, Shield, Shirt, Sparkles, Sword, Trash2 } from "lucide-react";
import { fetchInventoryItem } from "@/actions/data";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import { useSessionNonce } from "@/components/session-provider";
import type { CategoryKey } from "@/lib/categories";
import { formatDamageType } from "@/lib/equipment-display";
import {
  computeEquippedGear,
  equipInventoryRow,
  isArmorKind,
  isShieldKind,
} from "@/lib/pc-planner/equippedGear";
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
  if (row.damageM) parts.push(row.damageM);
  const damageType = formatDamageType(row.damageType);
  if (damageType) parts.push(damageType.toLowerCase());
  if (row.critical) parts.push(formatCrit(row.critical));
  if (row.handed) parts.push(formatHanded(row.handed));
  if (row.rangeIncrement) {
    const range = row.rangeIncrement.replace(/ft\.?$/i, "").trim();
    parts.push(`${range} ft`);
  }
  if (row.armorBonus != null && Number.isFinite(row.armorBonus)) {
    parts.push(`+${row.armorBonus} AC`);
  }
  if (row.maxDex != null && Number.isFinite(row.maxDex)) {
    parts.push(`max Dex ${row.maxDex}`);
  }
  if (row.acp != null && Number.isFinite(row.acp) && row.acp !== 0) {
    parts.push(`ACP ${row.acp}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function carriedWeight(inventory: InventoryRow[]): number {
  return inventory.reduce((sum, row) => {
    const qty = Number.isFinite(row.quantity) ? row.quantity : 0;
    const weight = Number.isFinite(row.weight) ? row.weight : 0;
    return sum + qty * weight;
  }, 0);
}

export function PcInventoryPanel({
  state,
  patch,
  onAddInventoryRow,
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

  const inventory = state.inventory ?? [];
  const equippedGear = computeEquippedGear(inventory, state.combat.speedBase);
  const totalWeight = carriedWeight(inventory);

  function addCustomItem() {
    focusNewRow.current = true;
    setPendingRemove(null);
    onAddInventoryRow();
  }

  function confirmRemove(index: number) {
    patch((s) => {
      s.inventory.splice(index, 1);
    });
    setPendingRemove(null);
  }

  return (
    <div className="npc-sheet-panel pc-sheet-section pc-inventory-panel" role="tabpanel">
      <div className="npc-sheet-block">
        <div className="pc-skills-header">
          <h3>Inventory</h3>
          <span className="pc-skill-points-summary" title="Total carried weight">
            {formatPounds(totalWeight)}
          </span>
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
              const canEquip = isArmorKind(row.kind) || isShieldKind(row.kind);
              const equipped = Boolean(row.equipped);
              const tone = kindTone(row);
              const Icon = KIND_ICONS[tone];
              const meta = inventoryRowMeta(row);
              return (
                <li
                  key={`${row.slug ?? row.name}-${i}`}
                  className={`pc-inventory-row${equipped ? " pc-inventory-row--equipped" : ""}${
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
                        {meta ? <span className="pc-inventory-stats">{meta}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="pc-inventory-row-controls">
                    <label className="pc-inventory-field">
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
                    <label className="pc-inventory-field">
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
                    {canEquip ? (
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
                      <button
                        type="button"
                        className="tool-btn-icon pc-inventory-remove"
                        title={`Remove ${row.name || "item"}`}
                        aria-label={`Remove ${row.name || "item"}`}
                        onClick={() => setPendingRemove(i)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {equippedGear.armorName || equippedGear.shieldName ? (
          <div className="pc-inventory-loadout">
            <span className="pc-inventory-loadout-label">Wearing</span>
            {equippedGear.armorName ? (
              <span className="pc-inventory-loadout-chip">{equippedGear.armorName}</span>
            ) : null}
            {equippedGear.shieldName ? (
              <span className="pc-inventory-loadout-chip">{equippedGear.shieldName}</span>
            ) : null}
            {equippedGear.acp !== 0 ? (
              <span className="pc-inventory-loadout-acp">ACP {equippedGear.acp}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
