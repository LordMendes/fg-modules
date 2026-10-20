import { generateBuiltinNames, getNameCatalog, NAME_CATALOGS } from "@/lib/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { TownRace } from "./types";

export const FALLBACK_TOWN_NAMES = [
  "Ashford",
  "Barrowgate",
  "Clearbrook",
  "Deepmark",
  "Eastvale",
  "Fairhaven",
  "Goldwick",
  "Highcross",
  "Ironford",
  "Lakehaven",
  "Mistwall",
  "Northden",
  "Oakmere",
  "Pinehurst",
  "Quarryton",
  "Rivermark",
  "Stonebridge",
  "Thornfield",
  "Underhill",
  "Westport",
  "Yewdale",
  "Brightmoor",
  "Coppergate",
  "Dunwatch",
  "Elmshire",
  "Frostwick",
  "Greenford",
  "Harborview",
  "Kingsrest",
  "Longbarrow",
  "Millstone",
  "Nettleby",
  "Oldmarsh",
  "Redcliff",
  "Silverton",
  "Tallfen",
  "Upland",
  "Violetgate",
  "Wolfden",
  "Yellowbrook",
];

const SHORT_DISTRICT_NAMES = [
  "Low",
  "High",
  "Old",
  "New",
  "North",
  "South",
  "East",
  "West",
  "Dock",
  "Mill",
  "Temple",
  "Forge",
  "Scholar",
  "Merchant",
  "Guard",
  "River",
];

const DEFAULT_SUFFIXES = ["Quarter", "Row", "Yard", "Gate"];
const DWARF_SUFFIXES = ["Yard", "Delve", "Hall", "Forge"];
const ELF_SUFFIXES = ["Glade", "Court", "Lantern", "Reach"];

export type TownCultureOption = { id: string; label: string };

export function townCultureOptions(): TownCultureOption[] {
  const placeCatalogs = NAME_CATALOGS.filter(
    (entry) => entry.group === "places" && entry.id.endsWith("-town"),
  );
  const options: TownCultureOption[] = [{ id: "default", label: "Default" }];
  for (const catalog of placeCatalogs) {
    options.push({ id: catalog.id, label: catalog.label });
  }
  const generic = getNameCatalog("town");
  if (generic && !options.some((row) => row.id === "town")) {
    options.push({ id: "town", label: generic.label });
  }
  return options;
}

function catalogIdForRace(race: TownRace, culture: string): string {
  if (culture !== "default" && getNameCatalog(culture)) {
    return culture;
  }
  switch (race) {
    case "human":
      return "human-town";
    case "dwarf":
      return "dwarven-town";
    case "elf":
      return "elven-town";
    default:
      return "town";
  }
}

export function rollTownName(
  rng: SeededRng,
  race: TownRace,
  culture: string,
  providedName: string,
): string {
  const trimmed = providedName.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const catalogId = catalogIdForRace(race, culture);
  const generated = generateBuiltinNames(
    { catalogId, count: 1, seed: 0 },
    rng,
  );
  if (generated[0]) {
    return generated[0];
  }
  return rng.pick(FALLBACK_TOWN_NAMES) ?? "Fairhaven";
}

function districtSuffixes(race: TownRace): string[] {
  if (race === "dwarf") return DWARF_SUFFIXES;
  if (race === "elf") return ELF_SUFFIXES;
  return DEFAULT_SUFFIXES;
}

export function rollDistrictName(
  townName: string,
  race: TownRace,
  rng: SeededRng,
  used: Set<string>,
): string {
  const suffixes = districtSuffixes(race);
  for (let attempt = 0; attempt < 24; attempt++) {
    const useShort = rng.next() < 0.35;
    const candidate = useShort
      ? `${rng.pick(SHORT_DISTRICT_NAMES) ?? "Old"} ${rng.pick(suffixes) ?? "Quarter"}`
      : `${townName} ${rng.pick(suffixes) ?? "Quarter"}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `${townName} Ward ${used.size + 1}`;
  used.add(fallback);
  return fallback;
}
