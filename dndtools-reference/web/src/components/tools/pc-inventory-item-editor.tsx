"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DraggableDialog } from "@/components/draggable-dialog";
import { EntitySearchCombobox } from "@/components/entity-search-combobox";
import {
  ARMOR_ABILITIES,
  ARMOR_ABILITY_SOURCES,
  SOURCE_LABELS,
  WEAPON_ABILITY_SOURCES,
  abilitiesForWeaponKind,
  filterArmorAbilitiesBySource,
  filterWeaponAbilitiesBySource,
  formatGp,
  type ArmorAbility,
  type SelectedArmorAbility,
  type SelectedWeaponAbility,
  type SourceAbbrev,
  type WeaponAbility,
} from "@/lib/magic-item";
import {
  DAMAGE_TYPE_OPTIONS,
  createDamageLine,
  inventoryDamageLines,
  priceInventoryItem,
  sourceLabel,
  suggestedMagicItemName,
  syncAbilityDamageLines,
  syncLegacyDamageFields,
} from "@/lib/pc-planner/inventoryItem";
import { isArmorKind, isShieldKind, isWeaponKind } from "@/lib/pc-planner/equippedGear";
import type { InventoryDamageLine, InventoryRow } from "@/lib/pc-planner/types";

const ITEM_KINDS = ["weapon", "armor", "shield", "goods", "item"] as const;
const HANDED_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "one", label: "One-handed" },
  { value: "two", label: "Two-handed" },
  { value: "ranged", label: "Ranged" },
] as const;

export type PcInventoryItemEditorProps = {
  row: InventoryRow;
  patchRow: (fn: (row: InventoryRow) => void) => void;
  onClose: () => void;
  zIndex: number;
  cascadeIndex: number;
  closeOnEscape: boolean;
  onActivate: () => void;
};

function AbilityPriceHint({
  ability,
}: {
  ability: WeaponAbility | ArmorAbility;
}) {
  if (ability.pricing.kind === "equivalent") {
    return <span className="mi-ability-equiv">+{ability.pricing.bonus} equiv.</span>;
  }
  return <span className="mi-ability-equiv">{formatGp(ability.pricing.gp)} gp</span>;
}

function damageTypeValue(type: string): string {
  const match = DAMAGE_TYPE_OPTIONS.some((option) => option.value === type);
  return match ? type : type ? "__other__" : "";
}

export function PcInventoryItemEditor({
  row,
  patchRow,
  onClose,
  zIndex,
  cascadeIndex,
  closeOnEscape,
  onActivate,
}: PcInventoryItemEditorProps) {
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilitySource, setAbilitySource] = useState<SourceAbbrev | "all">("all");
  const isWeapon = isWeaponKind(row.kind);
  const isArmor = isArmorKind(row.kind) || isShieldKind(row.kind);
  const enhancement = row.enhancementBonus ?? 0;
  const masterworkLocked = enhancement > 0;
  const damageLines = inventoryDamageLines(row);
  const price = priceInventoryItem(row);
  const suggestedName = suggestedMagicItemName(row);
  const showSuggestedName =
    suggestedName &&
    suggestedName.trim().toLowerCase() !== row.name.trim().toLowerCase();

  const scopedWeaponAbilities = useMemo(() => {
    if (!isWeapon) return [];
    const kind = (row.handed ?? "").toLowerCase() === "ranged" ? "ranged" : "melee";
    return abilitiesForWeaponKind(kind);
  }, [isWeapon, row.handed]);

  const availableAbilities = useMemo(() => {
    const q = abilitySearch.trim().toLowerCase();
    if (isWeapon) {
      const filtered = filterWeaponAbilitiesBySource(scopedWeaponAbilities, abilitySource);
      return q
        ? filtered.filter(
            (ability) =>
              ability.name.toLowerCase().includes(q) ||
              ability.description.toLowerCase().includes(q),
          )
        : filtered;
    }
    if (isArmor) {
      const filtered = filterArmorAbilitiesBySource(ARMOR_ABILITIES, abilitySource);
      return q
        ? filtered.filter(
            (ability) =>
              ability.name.toLowerCase().includes(q) ||
              ability.description.toLowerCase().includes(q),
          )
        : filtered;
    }
    return [];
  }, [abilitySearch, abilitySource, isArmor, isWeapon, scopedWeaponAbilities]);

  const abilitySources = isWeapon ? WEAPON_ABILITY_SOURCES : ARMOR_ABILITY_SOURCES;

  function updateLine(lineId: string, fn: (line: InventoryDamageLine) => void) {
    patchRow((current) => {
      const lines = inventoryDamageLines(current).map((line) =>
        line.id === "legacy-primary" ? { ...line, id: line.id } : { ...line },
      );
      const target = lines.find((line) => line.id === lineId);
      if (!target) return;
      fn(target);
      current.damageLines = lines;
      syncLegacyDamageFields(current);
    });
  }

  function toggleWeaponAbility(abilityId: string) {
    patchRow((current) => {
      const selected = current.weaponAbilities ?? [];
      const exists = selected.find((ability) => ability.abilityId === abilityId);
      if (exists) {
        current.weaponAbilities = selected.filter((ability) => ability.abilityId !== abilityId);
      } else {
        const ability = scopedWeaponAbilities.find((entry) => entry.id === abilityId);
        const next: SelectedWeaponAbility = { abilityId };
        if (ability?.subtype) next.subtype = ability.subtype.options[0];
        current.weaponAbilities = [...selected, next];
      }
      syncAbilityDamageLines(current);
    });
  }

  function toggleArmorAbility(abilityId: string) {
    patchRow((current) => {
      const selected = current.armorAbilities ?? [];
      const exists = selected.some((ability) => ability.abilityId === abilityId);
      current.armorAbilities = exists
        ? selected.filter((ability) => ability.abilityId !== abilityId)
        : [...selected, { abilityId } satisfies SelectedArmorAbility];
    });
  }

  return (
    <DraggableDialog
      open
      title={row.name.trim() || "Edit item"}
      onClose={onClose}
      modal={false}
      zIndex={zIndex}
      cascadeIndex={cascadeIndex}
      closeOnEscape={closeOnEscape}
      onActivate={onActivate}
      panelClassName="pc-item-editor-dialog"
    >
      <div className="pc-item-editor">
        <section className="pc-item-editor-section">
          <h3>Identity</h3>
          <div className="pc-item-editor-grid">
            <label className="pc-item-editor-field pc-item-editor-field--wide">
              <span>Name</span>
              <input
                type="text"
                className="pc-sheet-input"
                value={row.name}
                onChange={(event) =>
                  patchRow((current) => {
                    current.name = event.target.value;
                  })
                }
              />
            </label>
            <label className="pc-item-editor-field">
              <span>Kind</span>
              <select
                className="pc-sheet-input"
                value={row.kind ?? "item"}
                onChange={(event) =>
                  patchRow((current) => {
                    current.kind = event.target.value;
                  })
                }
              >
                {ITEM_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="pc-item-editor-field">
              <span>Qty</span>
              <input
                type="number"
                min={0}
                className="pc-sheet-input"
                value={row.quantity}
                onChange={(event) =>
                  patchRow((current) => {
                    current.quantity = Number(event.target.value);
                  })
                }
              />
            </label>
            <label className="pc-item-editor-field">
              <span>Weight</span>
              <input
                type="number"
                min={0}
                step="0.1"
                className="pc-sheet-input"
                value={row.weight}
                onChange={(event) =>
                  patchRow((current) => {
                    current.weight = Number(event.target.value);
                  })
                }
              />
            </label>
            {isWeapon ? (
              <>
                <label className="pc-item-editor-field">
                  <span>Critical</span>
                  <input
                    type="text"
                    className="pc-sheet-input"
                    value={row.critical ?? ""}
                    placeholder="19-20/x2"
                    onChange={(event) =>
                      patchRow((current) => {
                        current.critical = event.target.value || null;
                      })
                    }
                  />
                </label>
                <label className="pc-item-editor-field">
                  <span>Handed</span>
                  <select
                    className="pc-sheet-input"
                    value={row.handed ?? "one"}
                    onChange={(event) =>
                      patchRow((current) => {
                        current.handed = event.target.value;
                      })
                    }
                  >
                    {HANDED_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pc-item-editor-field">
                  <span>Range</span>
                  <input
                    type="text"
                    className="pc-sheet-input"
                    value={row.rangeIncrement ?? ""}
                    placeholder="100 ft."
                    onChange={(event) =>
                      patchRow((current) => {
                        current.rangeIncrement = event.target.value || null;
                      })
                    }
                  />
                </label>
              </>
            ) : null}
            {isArmor ? (
              <>
                <label className="pc-item-editor-field">
                  <span>AC bonus</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={row.armorBonus ?? 0}
                    onChange={(event) =>
                      patchRow((current) => {
                        current.armorBonus = Number(event.target.value);
                      })
                    }
                  />
                </label>
                <label className="pc-item-editor-field">
                  <span>Max Dex</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={row.maxDex ?? ""}
                    onChange={(event) =>
                      patchRow((current) => {
                        const value = event.target.value;
                        current.maxDex = value === "" ? null : Number(value);
                      })
                    }
                  />
                </label>
                <label className="pc-item-editor-field">
                  <span>ACP</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={row.acp ?? 0}
                    onChange={(event) =>
                      patchRow((current) => {
                        current.acp = Number(event.target.value);
                      })
                    }
                  />
                </label>
                <label className="pc-item-editor-field">
                  <span>Speed 30</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={row.speed30 ?? ""}
                    onChange={(event) =>
                      patchRow((current) => {
                        const value = event.target.value;
                        current.speed30 = value === "" ? null : Number(value);
                      })
                    }
                  />
                </label>
                <label className="pc-item-editor-field">
                  <span>Speed 20</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={row.speed20 ?? ""}
                    onChange={(event) =>
                      patchRow((current) => {
                        const value = event.target.value;
                        current.speed20 = value === "" ? null : Number(value);
                      })
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
        </section>

        {isWeapon || damageLines.length > 0 ? (
          <section className="pc-item-editor-section">
            <div className="pc-item-editor-section-head">
              <h3>Damage</h3>
              <button
                type="button"
                className="tool-btn-secondary pc-item-editor-add"
                onClick={() =>
                  patchRow((current) => {
                    const lines = inventoryDamageLines(current);
                    current.damageLines = [
                      ...lines.map((line) =>
                        line.id === "legacy-primary" ? { ...line } : line,
                      ),
                      createDamageLine({
                        dice: "1d6",
                        type: "fire",
                        multiplyOnCrit: false,
                      }),
                    ];
                    syncLegacyDamageFields(current);
                  })
                }
              >
                <Plus size={14} aria-hidden />
                Add damage
              </button>
            </div>
            {damageLines.length === 0 ? (
              <p className="pc-sheet-empty">No damage rows yet.</p>
            ) : (
              <ul className="pc-item-editor-damage-list">
                {damageLines.map((line, index) => {
                  const typeSelect = damageTypeValue(line.type);
                  return (
                    <li key={line.id} className="pc-item-editor-damage-row">
                      <label className="pc-item-editor-field">
                        <span>{index === 0 ? "Dice" : "Extra"}</span>
                        <input
                          type="text"
                          className="pc-sheet-input"
                          value={line.dice}
                          placeholder="2d6"
                          disabled={Boolean(line.fromAbilityId)}
                          onChange={(event) =>
                            updateLine(line.id, (target) => {
                              target.dice = event.target.value;
                            })
                          }
                        />
                      </label>
                      {index === 0 ? (
                        <label className="pc-item-editor-field">
                          <span>Small</span>
                          <input
                            type="text"
                            className="pc-sheet-input"
                            value={line.diceS ?? ""}
                            placeholder="1d10"
                            onChange={(event) =>
                              updateLine(line.id, (target) => {
                                target.diceS = event.target.value || null;
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <label className="pc-item-editor-field">
                        <span>Type</span>
                        <select
                          className="pc-sheet-input"
                          value={typeSelect}
                          disabled={Boolean(line.fromAbilityId)}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateLine(line.id, (target) => {
                              target.type = value === "__other__" ? "" : value;
                            });
                          }}
                        >
                          <option value="">Type</option>
                          {DAMAGE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          <option value="__other__">Other</option>
                        </select>
                      </label>
                      {typeSelect === "__other__" ? (
                        <label className="pc-item-editor-field">
                          <span>Custom type</span>
                          <input
                            type="text"
                            className="pc-sheet-input"
                            value={line.type}
                            onChange={(event) =>
                              updateLine(line.id, (target) => {
                                target.type = event.target.value;
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <label className="pc-item-editor-check">
                        <input
                          type="checkbox"
                          checked={line.multiplyOnCrit !== false && !line.critOnly}
                          disabled={Boolean(line.fromAbilityId) || line.critOnly}
                          onChange={(event) =>
                            updateLine(line.id, (target) => {
                              target.multiplyOnCrit = event.target.checked;
                            })
                          }
                        />
                        <span>× crit</span>
                      </label>
                      <button
                        type="button"
                        className="tool-btn-icon pc-item-editor-remove"
                        title="Remove damage row"
                        aria-label="Remove damage row"
                        onClick={() =>
                          patchRow((current) => {
                            const lines = inventoryDamageLines(current);
                            const target = lines.find((entry) => entry.id === line.id);
                            current.damageLines = lines.filter((entry) => {
                              if (entry.id === line.id) return false;
                              if (
                                target?.fromAbilityId &&
                                entry.fromAbilityId === target.fromAbilityId
                              ) {
                                return false;
                              }
                              return true;
                            });
                            if (target?.fromAbilityId) {
                              current.weaponAbilities = (current.weaponAbilities ?? []).filter(
                                (ability) => ability.abilityId !== target.fromAbilityId,
                              );
                            }
                            syncLegacyDamageFields(current);
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <section className="pc-item-editor-section">
          <h3>Magic</h3>
          <div className="pc-item-editor-grid">
            <label className="pc-item-editor-check pc-item-editor-check--block">
              <input
                type="checkbox"
                checked={masterworkLocked || Boolean(row.masterwork)}
                disabled={masterworkLocked}
                onChange={(event) =>
                  patchRow((current) => {
                    current.masterwork = event.target.checked;
                  })
                }
              />
              <span>Masterwork{masterworkLocked ? " (from enhancement)" : ""}</span>
            </label>
            <label className="pc-item-editor-field">
              <span>Enhancement</span>
              <select
                className="pc-sheet-input"
                value={enhancement}
                onChange={(event) =>
                  patchRow((current) => {
                    const next = Number(event.target.value);
                    current.enhancementBonus = next;
                    if (next > 0) current.masterwork = true;
                  })
                }
              >
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value === 0 ? "None (+0)" : `+${value}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showSuggestedName ? (
            <p className="pc-item-editor-suggest">
              Suggested name: <strong>{suggestedName}</strong>{" "}
              <button
                type="button"
                className="pc-item-editor-suggest-btn"
                onClick={() =>
                  patchRow((current) => {
                    current.name = suggestedName;
                  })
                }
              >
                Apply
              </button>
            </p>
          ) : null}

          {price ? (
            <p className="pc-item-editor-price">
              {formatGp(price.totalGp)} gp
              {price.equivalentTotal > 0 ? ` · +${price.equivalentTotal} equivalent` : ""}
              {price.warnings.length > 0 ? (
                <span className="pc-item-editor-warning"> {price.warnings[0]}</span>
              ) : null}
            </p>
          ) : null}

          {isWeapon || isArmor ? (
            <div className="pc-item-editor-abilities">
              <div className="pc-item-editor-ability-filters">
                <label className="pc-item-editor-field">
                  <span>Source</span>
                  <select
                    className="pc-sheet-input"
                    value={abilitySource}
                    onChange={(event) =>
                      setAbilitySource(event.target.value as SourceAbbrev | "all")
                    }
                  >
                    {abilitySources.map((source) => (
                      <option key={source} value={source}>
                        {sourceLabel(source)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pc-item-editor-field pc-item-editor-field--wide">
                  <span>Search abilities</span>
                  <input
                    type="search"
                    className="pc-sheet-input"
                    value={abilitySearch}
                    placeholder="Flaming, keen, fortification…"
                    onChange={(event) => setAbilitySearch(event.target.value)}
                  />
                </label>
              </div>
              <ul className="mi-ability-list pc-item-editor-ability-list">
                {availableAbilities.length === 0 ? (
                  <li className="mi-ability-empty">No abilities match the current filters.</li>
                ) : (
                  availableAbilities.map((ability) => {
                    const weaponAbility = isWeapon ? (ability as WeaponAbility) : null;
                    const selected = isWeapon
                      ? (row.weaponAbilities ?? []).find(
                          (entry) => entry.abilityId === ability.id,
                        )
                      : (row.armorAbilities ?? []).find(
                          (entry) => entry.abilityId === ability.id,
                        );
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
                              onChange={() =>
                                isWeapon
                                  ? toggleWeaponAbility(ability.id)
                                  : toggleArmorAbility(ability.id)
                              }
                            />
                            <span className="mi-ability-name">{ability.name}</span>
                          </label>
                          <AbilityPriceHint ability={ability} />
                          <span className="mi-source-badge">
                            {SOURCE_LABELS[ability.source] ?? ability.source}
                          </span>
                        </div>
                        <p className="mi-ability-desc">{ability.description}</p>
                        {ability.notes ? (
                          <p className="mi-ability-note">{ability.notes}</p>
                        ) : null}
                        {weaponAbility?.subtype && selected ? (
                          <label className="pc-item-editor-field mi-subtype-field">
                            <span>{weaponAbility.subtype.label}</span>
                            <select
                              className="pc-sheet-input"
                              value={(selected as SelectedWeaponAbility).subtype ?? ""}
                              onChange={(event) =>
                                patchRow((current) => {
                                  current.weaponAbilities = (current.weaponAbilities ?? []).map(
                                    (entry) =>
                                      entry.abilityId === ability.id
                                        ? { ...entry, subtype: event.target.value }
                                        : entry,
                                  );
                                })
                              }
                            >
                              {weaponAbility.subtype.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="pc-item-editor-section">
          <h3>Spell effects</h3>
          <EntitySearchCombobox
            categories={["spells"]}
            placeholder="Search spells to attach…"
            label="Add spell effect"
            onSelect={(hit) =>
              patchRow((current) => {
                const effects = current.spellEffects ?? [];
                if (effects.some((effect) => effect.slug === hit.slug)) return;
                current.spellEffects = [...effects, { slug: hit.slug, name: hit.name }];
              })
            }
          />
          {(row.spellEffects ?? []).length === 0 ? (
            <p className="pc-sheet-empty">No spell effects on this item.</p>
          ) : (
            <ul className="pc-item-editor-spells">
              {(row.spellEffects ?? []).map((effect) => (
                <li key={effect.slug} className="pc-item-editor-spell">
                  <span className="pc-item-editor-spell-name">{effect.name}</span>
                  <input
                    type="text"
                    className="pc-sheet-input"
                    value={effect.notes ?? ""}
                    placeholder="1/day, CL 5…"
                    aria-label={`${effect.name} usage notes`}
                    onChange={(event) =>
                      patchRow((current) => {
                        const target = (current.spellEffects ?? []).find(
                          (entry) => entry.slug === effect.slug,
                        );
                        if (target) target.notes = event.target.value;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="tool-btn-icon"
                    title={`Remove ${effect.name}`}
                    aria-label={`Remove ${effect.name}`}
                    onClick={() =>
                      patchRow((current) => {
                        current.spellEffects = (current.spellEffects ?? []).filter(
                          (entry) => entry.slug !== effect.slug,
                        );
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DraggableDialog>
  );
}
