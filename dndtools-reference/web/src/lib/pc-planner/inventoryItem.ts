import {
  ARMOR_ABILITY_BY_ID,
  GEAR_BY_ID,
  GEAR_TYPES,
  MASTERWORK_COST_GP,
  MAX_ENHANCEMENT_EQUIVALENT,
  SOURCE_LABELS,
  WEAPON_ABILITY_BY_ID,
  WEAPON_BY_ID,
  WEAPONS,
  computeArmorPrice,
  computeWeaponPrice,
  enhancementMagicCostArmor,
  enhancementMagicCostWeapon,
  formatArmorItemName,
  formatWeaponItemName,
  type PriceBreakdown,
  type SelectedArmorAbility,
  type SelectedWeaponAbility,
  type SourceAbbrev,
} from "@/lib/magic-item";
import { formatDamageType } from "@/lib/equipment-display";
import type { InventoryDamageLine, InventoryRow } from "./types";

function isWeaponKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "weapon";
}

function isArmorKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "armor";
}

function isShieldKind(kind: string | null | undefined): boolean {
  return (kind ?? "").toLowerCase() === "shield";
}

const LEGACY_PRIMARY_ID = "legacy-primary";

export const DAMAGE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "S", label: "Slashing" },
  { value: "P", label: "Piercing" },
  { value: "B", label: "Bludgeoning" },
  { value: "fire", label: "Fire" },
  { value: "cold", label: "Cold" },
  { value: "electricity", label: "Electricity" },
  { value: "acid", label: "Acid" },
  { value: "sonic", label: "Sonic" },
  { value: "force", label: "Force" },
  { value: "nonlethal", label: "Nonlethal" },
];

type AbilityDamageSpec = {
  hit: { dice: string; type: string };
  crit?: { dice: string; type: string };
};

const ABILITY_EXTRA_DAMAGE: Record<string, AbilityDamageSpec> = {
  flaming: { hit: { dice: "1d6", type: "fire" } },
  "flaming-burst": {
    hit: { dice: "1d6", type: "fire" },
    crit: { dice: "1d10", type: "fire" },
  },
  frost: { hit: { dice: "1d6", type: "cold" } },
  "icy-burst": {
    hit: { dice: "1d6", type: "cold" },
    crit: { dice: "1d10", type: "cold" },
  },
  shock: { hit: { dice: "1d6", type: "electricity" } },
  "shocking-burst": {
    hit: { dice: "1d6", type: "electricity" },
    crit: { dice: "1d10", type: "electricity" },
  },
  merciful: { hit: { dice: "1d6", type: "nonlethal" } },
};

export function newInventoryId(): string {
  return crypto.randomUUID();
}

export function createBlankInventoryRow(): InventoryRow {
  return { id: newInventoryId(), name: "", quantity: 1, weight: 0 };
}

export function ensureInventoryRowId(row: InventoryRow): string {
  if (row.id) return row.id;
  row.id = newInventoryId();
  return row.id;
}

export function markInventoryCustomized(row: InventoryRow): void {
  row.customized = true;
  ensureInventoryRowId(row);
}

export function createDamageLine(
  partial: Omit<InventoryDamageLine, "id"> & { id?: string },
): InventoryDamageLine {
  return {
    id: partial.id ?? newInventoryId(),
    dice: partial.dice,
    type: partial.type,
    diceS: partial.diceS,
    multiplyOnCrit: partial.multiplyOnCrit,
    critOnly: partial.critOnly,
    fromAbilityId: partial.fromAbilityId,
  };
}

/** Derive damage lines from cached catalog fields when none are stored. */
export function inventoryDamageLines(row: InventoryRow): InventoryDamageLine[] {
  if (row.damageLines && row.damageLines.length > 0) return row.damageLines;
  if (!row.damageM && !row.damageS) return [];
  return [
    createDamageLine({
      id: LEGACY_PRIMARY_ID,
      dice: row.damageM ?? row.damageS ?? "",
      type: row.damageType ?? "",
      diceS: row.damageS ?? null,
      multiplyOnCrit: true,
    }),
  ];
}

export function syncLegacyDamageFields(row: InventoryRow): void {
  const lines = row.damageLines;
  if (!lines || lines.length === 0) return;
  const primary = lines.find((line) => !line.critOnly) ?? lines[0];
  if (!primary) return;
  row.damageM = primary.dice || null;
  if (primary.diceS != null) row.damageS = primary.diceS;
  row.damageType = primary.type || null;
}

export function ensureEditableDamageLines(row: InventoryRow): void {
  if (row.damageLines && row.damageLines.length > 0) {
    row.damageLines = row.damageLines.map((line) =>
      line.id === LEGACY_PRIMARY_ID
        ? { ...line, id: newInventoryId() }
        : line,
    );
    return;
  }
  const derived = inventoryDamageLines(row);
  row.damageLines = derived.map((line) =>
    line.id === LEGACY_PRIMARY_ID ? { ...line, id: newInventoryId() } : line,
  );
}

export function prepareRowForEdit(row: InventoryRow): void {
  markInventoryCustomized(row);
  ensureEditableDamageLines(row);
}

export function syncAbilityDamageLines(row: InventoryRow): void {
  const abilityIds = new Set(
    (row.weaponAbilities ?? []).map((ability) => ability.abilityId),
  );
  const existing = row.damageLines ?? inventoryDamageLines(row);
  const kept = existing.filter(
    (line) => !line.fromAbilityId || abilityIds.has(line.fromAbilityId),
  );
  const next = kept.map((line) =>
    line.id === LEGACY_PRIMARY_ID ? { ...line, id: newInventoryId() } : line,
  );

  for (const abilityId of abilityIds) {
    const spec = ABILITY_EXTRA_DAMAGE[abilityId];
    if (!spec) continue;
    if (!next.some((line) => line.fromAbilityId === abilityId && !line.critOnly)) {
      next.push(
        createDamageLine({
          dice: spec.hit.dice,
          type: spec.hit.type,
          multiplyOnCrit: false,
          fromAbilityId: abilityId,
        }),
      );
    }
    if (
      spec.crit &&
      !next.some((line) => line.fromAbilityId === abilityId && line.critOnly)
    ) {
      next.push(
        createDamageLine({
          dice: spec.crit.dice,
          type: spec.crit.type,
          multiplyOnCrit: false,
          critOnly: true,
          fromAbilityId: abilityId,
        }),
      );
    }
  }

  row.damageLines = next;
  syncLegacyDamageFields(row);
}

export function inventoryAttackBonus(row: InventoryRow): number {
  const enhancement = row.enhancementBonus ?? 0;
  if (enhancement > 0) return enhancement;
  if (row.masterwork || enhancement > 0) return 1;
  return 0;
}

export function inventoryDamageBonus(row: InventoryRow): number {
  const enhancement = row.enhancementBonus ?? 0;
  return enhancement > 0 ? enhancement : 0;
}

export function isInventoryMasterwork(row: InventoryRow): boolean {
  return Boolean(row.masterwork) || (row.enhancementBonus ?? 0) > 0;
}

export function effectiveArmorBonus(row: InventoryRow): number {
  return (row.armorBonus ?? 0) + Math.max(0, row.enhancementBonus ?? 0);
}

/** Masterwork / magic armor improves ACP by 1 toward 0. */
export function effectiveArmorCheckPenalty(row: InventoryRow): number {
  const acp = row.acp ?? 0;
  if (!isInventoryMasterwork(row) || acp >= 0) return acp;
  return acp + 1;
}

export function inventoryHasKeen(row: InventoryRow): boolean {
  return (row.weaponAbilities ?? []).some((ability) => ability.abilityId === "keen");
}

/** Keen doubles the threat range: 19-20 becomes 17-20. */
export function applyKeenThreat(threatMin: number): number {
  const range = Math.max(1, 21 - threatMin);
  return Math.max(1, 21 - range * 2);
}

function normalizeMatchName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\+\d+\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchBuilderWeaponId(row: InventoryRow): string | null {
  const slug = (row.slug ?? "").toLowerCase();
  if (slug && WEAPON_BY_ID.has(slug)) return slug;
  const exactName = row.name.trim().toLowerCase();
  const normalized = normalizeMatchName(row.name);
  for (const weapon of WEAPONS) {
    if (weapon.id === slug) return weapon.id;
    if (weapon.name.toLowerCase() === exactName) return weapon.id;
    if (normalizeMatchName(weapon.name) === normalized) return weapon.id;
  }
  for (const weapon of WEAPONS) {
    const weaponName = normalizeMatchName(weapon.name);
    if (weaponName && normalized.endsWith(weaponName)) return weapon.id;
  }
  return null;
}

export function matchBuilderGearId(row: InventoryRow): string | null {
  const slug = (row.slug ?? "").toLowerCase();
  if (slug && GEAR_BY_ID.has(slug)) return slug;
  const exactName = row.name.trim().toLowerCase();
  const normalized = normalizeMatchName(row.name);
  for (const gear of GEAR_TYPES) {
    if (gear.id === slug) return gear.id;
    if (gear.name.toLowerCase() === exactName) return gear.id;
    if (normalizeMatchName(gear.name) === normalized) return gear.id;
  }
  for (const gear of GEAR_TYPES) {
    const gearName = normalizeMatchName(gear.name);
    if (gearName && normalized.endsWith(gearName)) return gear.id;
  }
  return null;
}

function abilityWeaponDisplayName(selected: SelectedWeaponAbility): string {
  const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
  if (!ability) return selected.abilityId;
  if (selected.subtype) return `${selected.subtype} ${ability.name.toLowerCase()}`;
  return ability.name.toLowerCase();
}

function abilityArmorDisplayName(selected: SelectedArmorAbility): string {
  const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
  return ability ? ability.name.toLowerCase() : selected.abilityId;
}

function unmatchedWeaponPrice(row: InventoryRow): PriceBreakdown {
  const enhancement = row.enhancementBonus ?? 0;
  const abilities = row.weaponAbilities ?? [];
  const warnings: string[] = [];
  const lines: PriceBreakdown["lines"] = [];

  const abilityEquivalentTotal = abilities.reduce((sum, selected) => {
    const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.pricing.kind === "equivalent") return sum + ability.pricing.bonus;
    return sum;
  }, 0);
  const flatAbilityTotal = abilities.reduce((sum, selected) => {
    const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.pricing.kind === "flat") return sum + ability.pricing.gp;
    return sum;
  }, 0);
  const equivalentTotal = enhancement + abilityEquivalentTotal;

  if (abilities.length > 0 && enhancement < 1) {
    warnings.push(
      "Weapons with special abilities require at least +1 enhancement bonus (SRD).",
    );
  }
  if (equivalentTotal > MAX_ENHANCEMENT_EQUIVALENT) {
    warnings.push(
      `Equivalent total (+${equivalentTotal}) exceeds the maximum of +${MAX_ENHANCEMENT_EQUIVALENT}.`,
    );
  }

  const isMagic = equivalentTotal > 0 || flatAbilityTotal > 0;
  if (isMagic || row.masterwork) {
    lines.push({ label: "Masterwork", gp: MASTERWORK_COST_GP });
  }
  if (equivalentTotal > 0) {
    lines.push({
      label: `Magic component (+${equivalentTotal} equivalent)`,
      gp: enhancementMagicCostWeapon(equivalentTotal),
    });
  }
  for (const selected of abilities) {
    const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.pricing.kind === "flat") {
      lines.push({
        label: abilityWeaponDisplayName(selected),
        gp: ability.pricing.gp,
      });
    }
  }

  return {
    lines,
    totalGp: lines.reduce((sum, line) => sum + line.gp, 0),
    equivalentTotal,
    warnings,
    itemName: suggestedMagicItemName(row),
  };
}

function unmatchedArmorPrice(row: InventoryRow): PriceBreakdown {
  const enhancement = row.enhancementBonus ?? 0;
  const abilities = row.armorAbilities ?? [];
  const warnings: string[] = [];
  const lines: PriceBreakdown["lines"] = [];

  const abilityEquivalentTotal = abilities.reduce((sum, selected) => {
    const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.pricing.kind === "equivalent") return sum + ability.pricing.bonus;
    return sum;
  }, 0);
  const equivalentTotal = enhancement + abilityEquivalentTotal;

  if (abilities.length > 0 && enhancement < 1) {
    warnings.push(
      "Armor and shields with special abilities require at least +1 enhancement bonus (SRD).",
    );
  }
  if (equivalentTotal > MAX_ENHANCEMENT_EQUIVALENT) {
    warnings.push(
      `Equivalent total (+${equivalentTotal}) exceeds the maximum of +${MAX_ENHANCEMENT_EQUIVALENT}.`,
    );
  }
  if (equivalentTotal > 0) {
    lines.push({
      label: `Magic component (+${equivalentTotal} equivalent)`,
      gp: enhancementMagicCostArmor(equivalentTotal),
    });
  }
  for (const selected of abilities) {
    const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
    if (ability?.pricing.kind === "flat") {
      lines.push({
        label: abilityArmorDisplayName(selected),
        gp: ability.pricing.gp,
      });
    }
  }

  return {
    lines,
    totalGp: lines.reduce((sum, line) => sum + line.gp, 0),
    equivalentTotal,
    warnings,
    itemName: suggestedMagicItemName(row),
  };
}

export function priceInventoryItem(row: InventoryRow): PriceBreakdown | null {
  if (isWeaponKind(row.kind)) {
    const weaponId = matchBuilderWeaponId(row);
    if (weaponId) {
      return computeWeaponPrice({
        weaponId,
        enhancementBonus: row.enhancementBonus ?? 0,
        abilities: row.weaponAbilities ?? [],
      });
    }
    if (
      (row.enhancementBonus ?? 0) > 0 ||
      (row.weaponAbilities ?? []).length > 0 ||
      row.masterwork
    ) {
      return unmatchedWeaponPrice(row);
    }
    return null;
  }
  if (isArmorKind(row.kind) || isShieldKind(row.kind)) {
    const gearId = matchBuilderGearId(row);
    if (gearId) {
      return computeArmorPrice({
        gearId,
        enhancementBonus: row.enhancementBonus ?? 0,
        abilities: row.armorAbilities ?? [],
      });
    }
    if ((row.enhancementBonus ?? 0) > 0 || (row.armorAbilities ?? []).length > 0) {
      return unmatchedArmorPrice(row);
    }
    return null;
  }
  return null;
}

export function suggestedMagicItemName(row: InventoryRow): string {
  if (isWeaponKind(row.kind)) {
    const weaponId = matchBuilderWeaponId(row);
    if (weaponId) {
      return formatWeaponItemName({
        weaponId,
        enhancementBonus: row.enhancementBonus ?? 0,
        abilities: row.weaponAbilities ?? [],
      });
    }
  }
  if (isArmorKind(row.kind) || isShieldKind(row.kind)) {
    const gearId = matchBuilderGearId(row);
    if (gearId) {
      return formatArmorItemName({
        gearId,
        enhancementBonus: row.enhancementBonus ?? 0,
        abilities: row.armorAbilities ?? [],
      });
    }
  }

  const abilityNames = isWeaponKind(row.kind)
    ? (row.weaponAbilities ?? []).map(abilityWeaponDisplayName)
    : (row.armorAbilities ?? []).map(abilityArmorDisplayName);
  const prefix: string[] = [];
  if ((row.enhancementBonus ?? 0) > 0) prefix.push(`+${row.enhancementBonus}`);
  prefix.push(...abilityNames);
  const base = row.name.trim() || "item";
  return prefix.length > 0 ? `${prefix.join(" ")} ${base}` : base;
}

export function inventoryAbilityLabels(row: InventoryRow): string[] {
  if (isWeaponKind(row.kind)) {
    return (row.weaponAbilities ?? []).map((selected) => {
      const ability = WEAPON_ABILITY_BY_ID.get(selected.abilityId);
      const name = ability?.name ?? selected.abilityId;
      return selected.subtype ? `${name} (${selected.subtype})` : name;
    });
  }
  return (row.armorAbilities ?? []).map((selected) => {
    const ability = ARMOR_ABILITY_BY_ID.get(selected.abilityId);
    return ability?.name ?? selected.abilityId;
  });
}

export function formatInventoryDamageMeta(row: InventoryRow): string | null {
  const lines = inventoryDamageLines(row).filter((line) => !line.critOnly);
  if (lines.length === 0) return null;
  return lines
    .map((line) => {
      const type = formatDamageType(line.type);
      return type ? `${line.dice} ${type.toLowerCase()}` : line.dice;
    })
    .filter((part) => part.trim())
    .join(" plus ");
}

export function sourceLabel(source: SourceAbbrev | "all"): string {
  if (source === "all") return "All sources";
  return SOURCE_LABELS[source] ?? source;
}
