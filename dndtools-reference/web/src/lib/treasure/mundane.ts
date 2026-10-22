import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { treasureData, WEAPON_TYPE_TO_MUNDANE } from "./data";
import { isBlankTreasureCell, parsePriceGp, pickRowByRange } from "./parse";
import type { TreasureInput, TreasureItemEntry } from "./types";

function resolveMundaneLink(label: string, slug?: string): string | undefined {
  if (slug) return `/items/${slug}`;
  return undefined;
}

function entryFromResult(
  result: string,
  input: TreasureInput,
  equipmentSlug?: string,
): TreasureItemEntry {
  const name = result.split("(")[0]?.trim() ?? result;
  const priceGp =
    parsePriceGp(result) ??
    parsePriceGp(result.match(/\(([^)]+)\)/)?.[1] ?? null);
  const priceDisplay =
    result.match(/\(([^)]+)\)/)?.[1]?.includes("gp") ?
      result.match(/\(([^)]+)\)/)?.[1] ?? ""
    : priceGp != null ? `${priceGp} gp` : "";
  return {
    label: name,
    priceDisplay,
    priceGp,
    href: resolveMundaneLink(
      name,
      equipmentSlug ??
        input.linkContext?.itemSlugByLowerName?.[name.toLowerCase()],
    ),
  };
}

function rollMundaneArmor(rng: SeededRng, input: TreasureInput): TreasureItemEntry {
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(treasureData.mundaneArmor.main ?? [], roll);
  if (!row) {
    return { label: "Mundane armor", priceDisplay: "", priceGp: null };
  }
  if (row.subtable) {
    const subRoll = rng.pickInt(1, 100);
    const subRows = treasureData.mundaneArmor[row.subtable] ?? [];
    const subRow = pickRowByRange(subRows, subRoll);
    if (subRow) {
      return entryFromResult(subRow.result, input, subRow.equipment_slug);
    }
  }
  return entryFromResult(row.result, input, row.equipment_slug);
}

function rollMundaneWeaponCategory(
  categoryLabel: string,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry {
  const tableKey = WEAPON_TYPE_TO_MUNDANE[categoryLabel.toLowerCase()];
  if (!tableKey) {
    return { label: categoryLabel, priceDisplay: "", priceGp: null };
  }
  const rows = treasureData.mundaneWeapons[tableKey] ?? [];
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(rows, roll);
  if (!row) {
    return { label: "Masterwork weapon", priceDisplay: "", priceGp: null };
  }
  if (row.subtable === "ammunition") {
    const ammoRows = treasureData.mundaneWeapons.ammunition ?? [];
    const ammoRoll = rng.pickInt(1, 100);
    const ammoRow = pickRowByRange(ammoRows, ammoRoll);
    const label = ammoRow?.weapon ?? "Masterwork ammunition";
    const priceGp = parsePriceGp(ammoRow?.cost ?? null);
    return {
      label: `Masterwork ${label}`,
      priceDisplay: ammoRow?.cost?.replace(/^\+/, "") ?? "",
      priceGp,
      href: resolveMundaneLink(label, ammoRow?.equipment_slug),
    };
  }
  const label = `Masterwork ${row.weapon}`;
  const priceGp = parsePriceGp(row.cost);
  return {
    label,
    priceDisplay: row.cost.replace(/^\+/, ""),
    priceGp,
    href: resolveMundaneLink(row.weapon, row.equipment_slug),
  };
}

function rollMundaneSection(
  section: string,
  rng: SeededRng,
  input: TreasureInput,
): TreasureItemEntry {
  const rows = treasureData.mundane[section] ?? [];
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(rows, roll);
  if (!row) {
    return { label: "Mundane item", priceDisplay: "", priceGp: null };
  }
  if (section === "weapons" && row.result in WEAPON_TYPE_TO_MUNDANE) {
    return rollMundaneWeaponCategory(row.result, rng, input);
  }
  return entryFromResult(row.result, input);
}

export function rollMundaneItem(rng: SeededRng, input: TreasureInput): TreasureItemEntry {
  const roll = rng.pickInt(1, 100);
  const row = pickRowByRange(treasureData.mundane.root ?? [], roll);
  if (!row?.section) {
    return { label: "Mundane item", priceDisplay: "", priceGp: null };
  }
  if (row.section === "armor") {
    return rollMundaneArmor(rng, input);
  }
  return rollMundaneSection(row.section, rng, input);
}

export type SalvageCandidate = {
  label: string;
  priceGp: number;
  priceDisplay: string;
};

export function buildSalvageCandidates(): SalvageCandidate[] {
  const candidates: SalvageCandidate[] = [];

  for (const section of ["alchemical", "tools"] as const) {
    for (const row of treasureData.mundane[section] ?? []) {
      const priceGp = parsePriceGp(row.result);
      if (priceGp != null && priceGp > 0) {
        candidates.push({
          label: row.result.split("(")[0]?.trim() ?? row.result,
          priceGp,
          priceDisplay: `${priceGp} gp`,
        });
      }
    }
  }

  for (const row of treasureData.mundaneArmor.main ?? []) {
    if (row.subtable) continue;
    const priceGp = parsePriceGp(row.result);
    if (priceGp != null && priceGp > 0) {
      candidates.push({
        label: row.result.split("(")[0]?.trim() ?? row.result,
        priceGp,
        priceDisplay: `${priceGp} gp`,
      });
    }
  }

  for (const tableKey of Object.keys(treasureData.mundaneWeapons)) {
    for (const row of treasureData.mundaneWeapons[tableKey] ?? []) {
      if (row.subtable) continue;
      const priceGp = parsePriceGp(row.cost);
      if (priceGp != null && priceGp > 0) {
        candidates.push({
          label: `Masterwork ${row.weapon}`,
          priceGp,
          priceDisplay: row.cost.replace(/^\+/, ""),
        });
      }
    }
  }

  return candidates.sort((a, b) => b.priceGp - a.priceGp);
}

export function isTreasureTableCellBlank(value: string | null | undefined): boolean {
  return isBlankTreasureCell(value);
}
