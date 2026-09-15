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
  inventoryMagicAttackBonus,
  inventoryMagicDamageBonus,
  priceInventoryItem,
  sourceLabel,
  suggestedMagicItemName,
  syncAbilityDamageLines,
  syncLegacyDamageFields,
} from "@/lib/pc-planner/inventoryItem";
import {
  buildAttackCompositionSummary,
  buildDamageCompositionSummary,
  defaultAttackAbility,
  defaultDamageAbility,
  defaultDamageAbilityMult,
  resolveAttackAbility,
  resolveDamageAbility,
} from "@/lib/pc-planner/weaponAbilityComposition";
import {
  applySpellItemKindDefaults,
  clampItemCharges,
  isScrollKind,
  isSpellItemKind,
  isWandKind,
  minItemCasterLevel,
  suggestedSpellItemName,
} from "@/lib/pc-planner/itemSpells";
import { isArmorKind, isShieldKind, isWeaponKind } from "@/lib/pc-planner/equippedGear";
import { canEquipAsWornItem } from "@/lib/pc-planner/itemBonuses";
import type {
  AbilityKey,
  CombatBonusStat,
  DamageAbilityMult,
  FeatEntry,
  InventoryDamageLine,
  InventoryRow,
  ItemBonusType,
  ItemStatBonus,
  PcPlanState,
  WeaponAbilityChoice,
} from "@/lib/pc-planner/types";
import {
  computeWeaponFeatBonuses,
  featNeedsWeaponChoice,
  formatFeatDisplayName,
  parseFeatWeaponChoice,
  stripMagicWeaponPrefix,
} from "@/lib/pc-planner/weaponFeatBonuses";

const ITEM_KINDS = [
  "weapon",
  "armor",
  "shield",
  "goods",
  "item",
  "wand",
  "scroll",
] as const;
type ItemKindOption = (typeof ITEM_KINDS)[number];

const HANDED_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "one", label: "One-handed" },
  { value: "two", label: "Two-handed" },
  { value: "ranged", label: "Ranged" },
] as const;

const ABILITY_OPTIONS: { value: AbilityKey; label: string }[] = [
  { value: "str", label: "Strength" },
  { value: "dex", label: "Dexterity" },
  { value: "con", label: "Constitution" },
  { value: "int", label: "Intelligence" },
  { value: "wis", label: "Wisdom" },
  { value: "cha", label: "Charisma" },
];

const WEAPON_ABILITY_SELECT_OPTIONS: {
  value: "" | WeaponAbilityChoice;
  label: string;
}[] = [
  { value: "", label: "Auto" },
  ...ABILITY_OPTIONS.map((option) => ({
    value: option.value as WeaponAbilityChoice,
    label: option.label,
  })),
  { value: "none", label: "None" },
];

const DAMAGE_MULT_OPTIONS: { value: "" | "1" | "1.5"; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "1", label: "×1" },
  { value: "1.5", label: "×1.5" },
];

const BONUS_TYPE_OPTIONS: { value: ItemBonusType; label: string }[] = [
  { value: "enhancement", label: "Enhancement" },
  { value: "resistance", label: "Resistance" },
  { value: "competence", label: "Competence" },
  { value: "deflection", label: "Deflection" },
  { value: "natural", label: "Natural" },
  { value: "armor", label: "Armor" },
  { value: "luck", label: "Luck" },
  { value: "insight", label: "Insight" },
  { value: "morale", label: "Morale" },
  { value: "untyped", label: "Untyped" },
];

const COMBAT_STAT_OPTIONS: { value: CombatBonusStat; label: string }[] = [
  { value: "naturalArmor", label: "Natural armor" },
  { value: "deflection", label: "Deflection AC" },
  { value: "armor", label: "Armor bonus" },
  { value: "dodge", label: "Dodge AC" },
  { value: "fort", label: "Fortitude" },
  { value: "ref", label: "Reflex" },
  { value: "will", label: "Will" },
  { value: "saves", label: "All saves" },
  { value: "melee", label: "Melee attack" },
  { value: "ranged", label: "Ranged attack" },
  { value: "initiative", label: "Initiative" },
];

function coerceItemKind(kind: string | null | undefined): ItemKindOption {
  const lower = (kind ?? "").toLowerCase();
  if ((ITEM_KINDS as readonly string[]).includes(lower)) {
    return lower as ItemKindOption;
  }
  return "item";
}

function defaultStatBonus(): ItemStatBonus {
  return {
    kind: "ability",
    ability: "str",
    amount: 2,
    bonusType: "enhancement",
  };
}

export type PcInventoryItemEditorProps = {
  row: InventoryRow;
  patchRow: (fn: (row: InventoryRow) => void) => void;
  onClose: () => void;
  zIndex: number;
  cascadeIndex: number;
  closeOnEscape: boolean;
  onActivate: () => void;
  feats?: FeatEntry[];
  onSetFeatChoice?: (slug: string, choice: string) => void;
  abilities?: Record<AbilityKey, number>;
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
  feats = [],
  onSetFeatChoice,
  abilities = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  },
}: PcInventoryItemEditorProps) {
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilitySource, setAbilitySource] = useState<SourceAbbrev | "all">("all");
  const kindValue = coerceItemKind(row.kind);
  const isWeapon = isWeaponKind(kindValue);
  const isArmor = isArmorKind(kindValue) || isShieldKind(kindValue);
  const isSpellItem = isSpellItemKind(kindValue);
  const showMagicBuilder = isWeapon || isArmor;
  const canWear = canEquipAsWornItem({ ...row, kind: kindValue });
  const enhancement = row.enhancementBonus ?? 0;
  const masterworkLocked = enhancement > 0;
  const attackMisc = row.attackMisc ?? 0;
  const damageMisc = row.damageMisc ?? 0;
  const armorMisc = row.armorMisc ?? 0;
  const matchedFeatBonuses = isWeapon
    ? computeWeaponFeatBonuses(feats, row)
    : null;
  const applyableFeats = isWeapon
    ? feats.filter((feat) => {
        if (!featNeedsWeaponChoice(feat)) return false;
        return !parseFeatWeaponChoice(feat);
      })
    : [];
  const damageLines = inventoryDamageLines(row);
  const compositionCtx = useMemo(
    () => ({ abilities, feats }),
    [abilities, feats],
  );
  const miniState = useMemo(
    () => ({ abilities, feats }) as Pick<PcPlanState, "abilities" | "feats">,
    [abilities, feats],
  );
  const resolvedAttack = isWeapon ? resolveAttackAbility(row, miniState) : null;
  const resolvedDamage = isWeapon ? resolveDamageAbility(row, miniState) : null;
  const attackComposition = isWeapon
    ? buildAttackCompositionSummary(row, compositionCtx, {
        magicAttack: inventoryMagicAttackBonus(row),
        attackMisc,
        featAttackParts: matchedFeatBonuses?.attackParts ?? [],
      })
    : null;
  const primaryDice =
    damageLines[0]?.dice || row.damageM || row.damageS || "";
  const damageComposition = isWeapon
    ? buildDamageCompositionSummary(row, compositionCtx, {
        primaryDice,
        magicDamage: inventoryMagicDamageBonus(row),
        damageMisc,
        featDamageParts: matchedFeatBonuses?.damageParts ?? [],
      })
    : null;
  const autoAttackLabel = isWeapon
    ? ABILITY_OPTIONS.find((o) => o.value === defaultAttackAbility(row, feats))?.label ??
      "Auto"
    : "";
  const autoDamageLabel = isWeapon
    ? defaultDamageAbility(row) === "none"
      ? "None"
      : ABILITY_OPTIONS.find((o) => o.value === defaultDamageAbility(row))?.label ??
        "Auto"
    : "";
  const autoMultLabel = isWeapon
    ? defaultDamageAbilityMult(row) === 1.5
      ? "×1.5 (two-handed)"
      : "×1"
    : "";
  const price = showMagicBuilder || isSpellItem ? priceInventoryItem(row) : null;
  const suggestedName = showMagicBuilder ? suggestedMagicItemName(row) : null;
  const showSuggestedName =
    suggestedName &&
    suggestedName.trim().toLowerCase() !== row.name.trim().toLowerCase();
  const statBonuses = row.statBonuses ?? [];
  const primarySpell = row.spellEffects?.[0] ?? null;
  const spellLevel =
    primarySpell?.spellLevel != null && Number.isFinite(primarySpell.spellLevel)
      ? primarySpell.spellLevel
      : 1;
  const itemCasterLevel =
    row.itemCasterLevel != null && Number.isFinite(row.itemCasterLevel)
      ? row.itemCasterLevel
      : minItemCasterLevel(spellLevel);

  function maybeRetitleSpellItem(
    current: InventoryRow,
    spellName: string,
    previousSpellName?: string,
  ) {
    const kind = current.kind;
    if (!isSpellItemKind(kind)) return;
    const autoName = suggestedSpellItemName(kind, spellName);
    const previousAuto = previousSpellName
      ? suggestedSpellItemName(kind, previousSpellName)
      : null;
    const bareKindName = suggestedSpellItemName(kind, "");
    const name = current.name.trim();
    const isAuto =
      !name ||
      name.toLowerCase() === bareKindName.toLowerCase() ||
      (previousAuto != null && name.toLowerCase() === previousAuto.toLowerCase());
    if (isAuto) {
      current.name = autoName;
    }
  }

  function setSpellItemSpell(
    current: InventoryRow,
    hit: { slug: string; name: string; minLevel?: number | null },
  ) {
    const previous = current.spellEffects?.[0];
    const level =
      hit.minLevel != null && Number.isFinite(hit.minLevel)
        ? Math.max(0, Math.floor(hit.minLevel))
        : 1;
    current.spellEffects = [
      {
        slug: hit.slug,
        name: hit.name,
        spellLevel: level,
        notes: previous?.notes,
      },
    ];
    current.itemCasterLevel = minItemCasterLevel(level);
    maybeRetitleSpellItem(current, hit.name, previous?.name);
  }

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
                value={kindValue}
                onChange={(event) =>
                  patchRow((current) => {
                    const nextKind = event.target.value;
                    current.kind = nextKind;
                    if (isSpellItemKind(nextKind)) {
                      applySpellItemKindDefaults(
                        current,
                        nextKind as "wand" | "scroll",
                      );
                      const spell = current.spellEffects?.[0];
                      if (spell) {
                        maybeRetitleSpellItem(current, spell.name);
                      } else if (!current.name.trim()) {
                        current.name = suggestedSpellItemName(nextKind, "");
                      }
                    }
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
            {row.itemType?.trim() ? (
              <label className="pc-item-editor-field">
                <span>Catalog type</span>
                <input
                  type="text"
                  className="pc-sheet-input"
                  value={row.itemType}
                  readOnly
                  aria-label="Catalog item type"
                />
              </label>
            ) : null}
            {canWear ? (
              <label className="pc-item-editor-check pc-item-editor-check--block">
                <input
                  type="checkbox"
                  checked={Boolean(row.equipped)}
                  onChange={(event) =>
                    patchRow((current) => {
                      current.equipped = event.target.checked;
                    })
                  }
                />
                <span>Equipped / worn</span>
              </label>
            ) : null}
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

        {isWeapon ? (
          <section className="pc-item-editor-section">
            <h3>Attack</h3>
            <p className="pc-item-editor-hint">
              Auto uses Dex for ranged or finesse light melee, otherwise Str.
              {autoAttackLabel ? ` Current auto: ${autoAttackLabel}.` : ""}
            </p>
            <div className="pc-item-editor-grid">
              <label className="pc-item-editor-field">
                <span>Ability</span>
                <select
                  className="pc-sheet-input"
                  value={row.attackAbility ?? ""}
                  onChange={(event) =>
                    patchRow((current) => {
                      const value = event.target.value;
                      if (value === "") {
                        delete current.attackAbility;
                      } else {
                        current.attackAbility = value as WeaponAbilityChoice;
                      }
                    })
                  }
                >
                  {WEAPON_ABILITY_SELECT_OPTIONS.map((option) => (
                    <option key={option.value || "auto"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pc-item-editor-field">
                <span>Misc</span>
                <input
                  type="number"
                  className="pc-sheet-input"
                  value={attackMisc}
                  onChange={(event) =>
                    patchRow((current) => {
                      current.attackMisc = Number(event.target.value) || 0;
                    })
                  }
                />
              </label>
            </div>
            {attackComposition ? (
              <p className="pc-item-editor-composition">
                <strong>Total modifiers:</strong> {attackComposition}
                {resolvedAttack && resolvedAttack.key !== "none" ? (
                  <span className="pc-item-editor-composition-note">
                    {" "}
                    (ability {resolvedAttack.label}{" "}
                    {resolvedAttack.mod >= 0 ? "+" : ""}
                    {resolvedAttack.mod})
                  </span>
                ) : null}
              </p>
            ) : null}
          </section>
        ) : null}

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
            {isWeapon ? (
              <>
                <p className="pc-item-editor-hint">
                  Auto damage ability: {autoDamageLabel}. Auto multiplier:{" "}
                  {autoMultLabel}.
                </p>
                <div className="pc-item-editor-grid pc-item-editor-grid--damage-compose">
                  <label className="pc-item-editor-field">
                    <span>Multiplier</span>
                    <select
                      className="pc-sheet-input"
                      value={
                        row.damageAbilityMult === undefined
                          ? ""
                          : String(row.damageAbilityMult)
                      }
                      onChange={(event) =>
                        patchRow((current) => {
                          const value = event.target.value;
                          if (value === "") {
                            delete current.damageAbilityMult;
                          } else {
                            current.damageAbilityMult = Number(
                              value,
                            ) as DamageAbilityMult;
                          }
                        })
                      }
                    >
                      {DAMAGE_MULT_OPTIONS.map((option) => (
                        <option key={option.value || "auto"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Ability</span>
                    <select
                      className="pc-sheet-input"
                      value={row.damageAbility ?? ""}
                      onChange={(event) =>
                        patchRow((current) => {
                          const value = event.target.value;
                          if (value === "") {
                            delete current.damageAbility;
                          } else {
                            current.damageAbility = value as WeaponAbilityChoice;
                          }
                        })
                      }
                    >
                      {WEAPON_ABILITY_SELECT_OPTIONS.map((option) => (
                        <option key={option.value || "auto"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Misc</span>
                    <input
                      type="number"
                      className="pc-sheet-input"
                      value={damageMisc}
                      onChange={(event) =>
                        patchRow((current) => {
                          current.damageMisc = Number(event.target.value) || 0;
                        })
                      }
                    />
                  </label>
                </div>
                {damageComposition ? (
                  <p className="pc-item-editor-composition">
                    <strong>Composition:</strong> {damageComposition}
                  </p>
                ) : null}
              </>
            ) : null}
          </section>
        ) : null}

        <section className="pc-item-editor-section">
          <div className="pc-item-editor-section-head">
            <h3>Bonuses</h3>
            <button
              type="button"
              className="tool-btn-secondary pc-item-editor-add"
              onClick={() =>
                patchRow((current) => {
                  current.statBonuses = [...(current.statBonuses ?? []), defaultStatBonus()];
                })
              }
            >
              <Plus size={14} aria-hidden />
              Add bonus
            </button>
          </div>
          {statBonuses.length === 0 ? (
            <p className="pc-sheet-empty">
              No score, skill, or combat bonuses. Add one for wondrous items like Gauntlets of
              Ogre Power.
            </p>
          ) : (
            <ul className="pc-item-editor-bonus-list">
              {statBonuses.map((bonus, index) => (
                <li key={`${bonus.kind}-${index}`} className="pc-item-editor-bonus-row">
                  <label className="pc-item-editor-field">
                    <span>Target</span>
                    <select
                      className="pc-sheet-input"
                      value={bonus.kind}
                      onChange={(event) => {
                        const nextKind = event.target.value as ItemStatBonus["kind"];
                        patchRow((current) => {
                          const list = [...(current.statBonuses ?? [])];
                          if (nextKind === "ability") {
                            list[index] = {
                              kind: "ability",
                              ability: "str",
                              amount: bonus.amount,
                              bonusType: bonus.bonusType === "competence" ? "enhancement" : bonus.bonusType,
                            };
                          } else if (nextKind === "skill") {
                            list[index] = {
                              kind: "skill",
                              skill: "hide",
                              amount: bonus.amount,
                              bonusType: "competence",
                            };
                          } else {
                            list[index] = {
                              kind: "combat",
                              stat: "naturalArmor",
                              amount: bonus.amount,
                              bonusType: "natural",
                            };
                          }
                          current.statBonuses = list;
                        });
                      }}
                    >
                      <option value="ability">Ability</option>
                      <option value="skill">Skill</option>
                      <option value="combat">Combat</option>
                    </select>
                  </label>
                  {bonus.kind === "ability" ? (
                    <label className="pc-item-editor-field">
                      <span>Ability</span>
                      <select
                        className="pc-sheet-input"
                        value={bonus.ability}
                        onChange={(event) =>
                          patchRow((current) => {
                            const list = [...(current.statBonuses ?? [])];
                            const entry = list[index];
                            if (entry?.kind === "ability") {
                              entry.ability = event.target.value as AbilityKey;
                            }
                            current.statBonuses = list;
                          })
                        }
                      >
                        {ABILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {bonus.kind === "skill" ? (
                    <label className="pc-item-editor-field">
                      <span>Skill</span>
                      <input
                        type="text"
                        className="pc-sheet-input"
                        value={bonus.skill}
                        placeholder="hide"
                        onChange={(event) =>
                          patchRow((current) => {
                            const list = [...(current.statBonuses ?? [])];
                            const entry = list[index];
                            if (entry?.kind === "skill") {
                              entry.skill = event.target.value;
                            }
                            current.statBonuses = list;
                          })
                        }
                      />
                    </label>
                  ) : null}
                  {bonus.kind === "combat" ? (
                    <label className="pc-item-editor-field">
                      <span>Stat</span>
                      <select
                        className="pc-sheet-input"
                        value={bonus.stat}
                        onChange={(event) =>
                          patchRow((current) => {
                            const list = [...(current.statBonuses ?? [])];
                            const entry = list[index];
                            if (entry?.kind === "combat") {
                              entry.stat = event.target.value as CombatBonusStat;
                            }
                            current.statBonuses = list;
                          })
                        }
                      >
                        {COMBAT_STAT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="pc-item-editor-field">
                    <span>Amount</span>
                    <input
                      type="number"
                      className="pc-sheet-input"
                      value={bonus.amount}
                      onChange={(event) =>
                        patchRow((current) => {
                          const list = [...(current.statBonuses ?? [])];
                          if (list[index]) {
                            list[index] = {
                              ...list[index],
                              amount: Number(event.target.value),
                            };
                          }
                          current.statBonuses = list;
                        })
                      }
                    />
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Bonus type</span>
                    <select
                      className="pc-sheet-input"
                      value={bonus.bonusType}
                      onChange={(event) =>
                        patchRow((current) => {
                          const list = [...(current.statBonuses ?? [])];
                          if (list[index]) {
                            list[index] = {
                              ...list[index],
                              bonusType: event.target.value as ItemBonusType,
                            };
                          }
                          current.statBonuses = list;
                        })
                      }
                    >
                      {BONUS_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="tool-btn-icon pc-item-editor-remove"
                    title="Remove bonus"
                    aria-label="Remove bonus"
                    onClick={() =>
                      patchRow((current) => {
                        current.statBonuses = (current.statBonuses ?? []).filter(
                          (_entry, entryIndex) => entryIndex !== index,
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

        {isWeapon || isArmor ? (
        <section className="pc-item-editor-section">
          <h3>Combat bonuses</h3>
          {isArmor ? (
            <>
              <p className="pc-item-editor-hint">
                Extra AC for feats or class abilities. Magic enhancement is under
                Magic below.
              </p>
              <div className="pc-item-editor-grid">
                <label className="pc-item-editor-field">
                  <span>Extra AC bonus</span>
                  <input
                    type="number"
                    className="pc-sheet-input"
                    value={armorMisc}
                    onChange={(event) =>
                      patchRow((current) => {
                        current.armorMisc = Number(event.target.value) || 0;
                      })
                    }
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="pc-item-editor-hint">
              Attack and damage misc bonuses are under Attack and Damage above.
              Magic enhancement is under Magic below.
            </p>
          )}
          {isWeapon && matchedFeatBonuses ? (
            <div className="pc-item-editor-feat-bonuses">
              {matchedFeatBonuses.attackParts.length > 0 ||
              matchedFeatBonuses.damageParts.length > 0 ? (
                <ul className="pc-item-editor-feat-list">
                  {matchedFeatBonuses.attackParts.map((part) => (
                    <li key={`atk-${part.label}`}>
                      {part.label} +{part.amount} attack
                    </li>
                  ))}
                  {matchedFeatBonuses.damageParts.map((part) => (
                    <li key={`dmg-${part.label}`}>
                      {part.label} +{part.amount} damage
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pc-item-editor-hint">
                  No matching Weapon Focus / Specialization feats for this
                  weapon yet.
                </p>
              )}
              {applyableFeats.length > 0 && onSetFeatChoice ? (
                <ul className="pc-item-editor-feat-apply">
                  {applyableFeats.map((feat) => {
                    const choice =
                      stripMagicWeaponPrefix(row.name) ||
                      row.slug ||
                      row.name;
                    return (
                      <li key={feat.slug}>
                        <span>{formatFeatDisplayName(feat)} (no weapon)</span>
                        <button
                          type="button"
                          className="tool-btn tool-btn--ghost tool-btn--compact"
                          onClick={() => onSetFeatChoice(feat.slug, choice)}
                        >
                          Apply to this weapon
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
        ) : null}

        {showMagicBuilder ? (
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
                    {value === 0
                      ? "None"
                      : isWeapon
                        ? `+${value} (+${value} attack, +${value} damage)`
                        : `+${value} (+${value} AC)`}
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
        ) : null}

        <section className="pc-item-editor-section">
          <h3>
            {isWandKind(kindValue)
              ? "Wand"
              : isScrollKind(kindValue)
                ? "Scroll"
                : "Spell effects"}
          </h3>
          {isSpellItem ? (
            <>
              <EntitySearchCombobox
                categories={["spells"]}
                placeholder="Search spell…"
                label={isWandKind(kindValue) ? "Wand spell" : "Scroll spell"}
                onSelect={(hit) =>
                  patchRow((current) => {
                    setSpellItemSpell(current, hit);
                  })
                }
              />
              {primarySpell ? (
                <div className="pc-item-editor-grid">
                  <label className="pc-item-editor-field pc-item-editor-field--wide">
                    <span>Spell</span>
                    <div className="pc-item-editor-spell">
                      <a
                        href={`/spells/${primarySpell.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pc-feat-link pc-item-editor-spell-name"
                      >
                        {primarySpell.name}
                      </a>
                      <button
                        type="button"
                        className="tool-btn-icon"
                        title={`Remove ${primarySpell.name}`}
                        aria-label={`Remove ${primarySpell.name}`}
                        onClick={() =>
                          patchRow((current) => {
                            current.spellEffects = [];
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Spell level</span>
                    <input
                      type="number"
                      min={0}
                      max={9}
                      className="pc-sheet-input"
                      value={spellLevel}
                      onChange={(event) =>
                        patchRow((current) => {
                          const effect = current.spellEffects?.[0];
                          if (!effect) return;
                          const next = Math.max(
                            0,
                            Math.min(9, Number(event.target.value) || 0),
                          );
                          effect.spellLevel = next;
                          current.itemCasterLevel = minItemCasterLevel(next);
                        })
                      }
                    />
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Caster level</span>
                    <input
                      type="number"
                      min={1}
                      className="pc-sheet-input"
                      value={itemCasterLevel}
                      onChange={(event) =>
                        patchRow((current) => {
                          current.itemCasterLevel = Math.max(
                            1,
                            Number(event.target.value) || 1,
                          );
                        })
                      }
                    />
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Charges left</span>
                    <input
                      type="number"
                      min={0}
                      className="pc-sheet-input"
                      value={row.chargesCurrent ?? 0}
                      onChange={(event) =>
                        patchRow((current) => {
                          current.chargesCurrent = Number(event.target.value);
                          clampItemCharges(current);
                        })
                      }
                    />
                  </label>
                  <label className="pc-item-editor-field">
                    <span>Charges max</span>
                    <input
                      type="number"
                      min={0}
                      className="pc-sheet-input"
                      value={row.chargesMax ?? 0}
                      onChange={(event) =>
                        patchRow((current) => {
                          current.chargesMax = Number(event.target.value);
                          clampItemCharges(current);
                        })
                      }
                    />
                  </label>
                  <label className="pc-item-editor-field pc-item-editor-field--wide">
                    <span>Notes</span>
                    <input
                      type="text"
                      className="pc-sheet-input"
                      value={primarySpell.notes ?? ""}
                      placeholder="Optional notes…"
                      onChange={(event) =>
                        patchRow((current) => {
                          const effect = current.spellEffects?.[0];
                          if (effect) effect.notes = event.target.value;
                        })
                      }
                    />
                  </label>
                </div>
              ) : (
                <p className="pc-sheet-empty">
                  {isWandKind(kindValue)
                    ? "Pick a spell for this wand."
                    : "Pick a spell for this scroll."}
                </p>
              )}
              {price ? (
                <p className="pc-item-editor-price">
                  {formatGp(price.totalGp)} gp (SRD estimate)
                </p>
              ) : null}
            </>
          ) : (
            <>
              <EntitySearchCombobox
                categories={["spells"]}
                placeholder="Search spells to attach…"
                label="Add spell effect"
                onSelect={(hit) =>
                  patchRow((current) => {
                    const effects = current.spellEffects ?? [];
                    if (effects.some((effect) => effect.slug === hit.slug)) return;
                    const level =
                      hit.minLevel != null && Number.isFinite(hit.minLevel)
                        ? Math.max(0, Math.floor(hit.minLevel))
                        : undefined;
                    current.spellEffects = [
                      ...effects,
                      {
                        slug: hit.slug,
                        name: hit.name,
                        ...(level != null ? { spellLevel: level } : {}),
                      },
                    ];
                    if (
                      current.itemCasterLevel == null &&
                      level != null &&
                      Number.isFinite(level)
                    ) {
                      current.itemCasterLevel = minItemCasterLevel(level);
                    }
                  })
                }
              />
              {(row.spellEffects ?? []).length === 0 ? (
                <p className="pc-sheet-empty">No spell effects on this item.</p>
              ) : (
                <>
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
                  <div className="pc-item-editor-grid">
                    <label className="pc-item-editor-field">
                      <span>Caster level</span>
                      <input
                        type="number"
                        min={1}
                        className="pc-sheet-input"
                        value={row.itemCasterLevel ?? ""}
                        placeholder="Optional"
                        onChange={(event) =>
                          patchRow((current) => {
                            const value = event.target.value;
                            current.itemCasterLevel =
                              value === "" ? null : Math.max(1, Number(value) || 1);
                          })
                        }
                      />
                    </label>
                    <label className="pc-item-editor-field">
                      <span>Charges left</span>
                      <input
                        type="number"
                        min={0}
                        className="pc-sheet-input"
                        value={row.chargesCurrent ?? ""}
                        placeholder="—"
                        onChange={(event) =>
                          patchRow((current) => {
                            const value = event.target.value;
                            current.chargesCurrent =
                              value === "" ? null : Number(value);
                            if (current.chargesMax != null) clampItemCharges(current);
                          })
                        }
                      />
                    </label>
                    <label className="pc-item-editor-field">
                      <span>Charges max</span>
                      <input
                        type="number"
                        min={0}
                        className="pc-sheet-input"
                        value={row.chargesMax ?? ""}
                        placeholder="—"
                        onChange={(event) =>
                          patchRow((current) => {
                            const value = event.target.value;
                            current.chargesMax = value === "" ? null : Number(value);
                            if (current.chargesMax != null) clampItemCharges(current);
                          })
                        }
                      />
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </DraggableDialog>
  );
}
