import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { buildLayout } from "./geometry";
import { normalizeTownInput } from "./normalize";
import { rollDistrictName, rollTownName } from "./names";
import { buildTownProfile } from "./profile";
import { districtNotes, renderTownSvg } from "./svg";
import {
  BUILDING_TYPES,
  DISTRICT_COUNT_BY_SIZE,
  type BuildingType,
  type TownInput,
  type TownResult,
  type TownSize,
  type TownWallKind,
} from "./types";

function wallKindFor(size: TownSize, walled: boolean): TownWallKind {
  if (!walled) return "none";
  if (size === "thorp" || size === "hamlet") return "palisade";
  return "stone";
}

function wallDescription(kind: TownWallKind): string {
  switch (kind) {
    case "palisade":
      return "Wooden palisade with a single gate on the main road.";
    case "stone":
      return "Stone wall with a gate where the main road leaves town.";
    default:
      return "No wall or palisade.";
  }
}

export function districtCountForSize(size: TownSize): number {
  return DISTRICT_COUNT_BY_SIZE[size];
}

export function generateTown(input: TownInput, rng: SeededRng): TownResult {
  const normalized = normalizeTownInput(input);
  const districtCount = districtCountForSize(normalized.size);
  const hasMarket = districtCount >= 4;
  const townName = rollTownName(
    rng,
    normalized.race,
    normalized.culture,
    normalized.name,
  );

  const usedDistrictNames = new Set<string>();
  const buildingPool = rng.shuffle([...BUILDING_TYPES]);

  function pickBuildingType(index: number): BuildingType {
    return buildingPool[(index - 1) % buildingPool.length] ?? "homes";
  }

  const layout = buildLayout(
    districtCount,
    hasMarket,
    normalized.effectiveTopography,
    normalized.river,
    normalized.normalizeCells,
    rng,
    (index) => {
      const name = rollDistrictName(
        townName,
        normalized.race,
        rng,
        usedDistrictNames,
      );
      return { name, buildingType: pickBuildingType(index) };
    },
  );

  const wallKind = wallKindFor(normalized.size, normalized.walled);
  const { svg, draft } = renderTownSvg({
    townName,
    environment: normalized.environment,
    effectiveTopography: normalized.effectiveTopography,
    labels: normalized.labels,
    wallKind,
    layout,
  });

  const districts = layout.districtLayouts.map((row) => ({
    index: row.index,
    name: row.name,
    buildingType: row.buildingType,
    notes: districtNotes(row.buildingType),
  }));

  const profile = buildTownProfile(
    townName,
    normalized.size,
    normalized.race,
    districts,
    layout.marketBounds !== null,
    rng,
  );

  return {
    name: townName,
    culture: normalized.culture,
    environment: normalized.environment,
    topography: normalized.topography,
    effectiveTopography: normalized.effectiveTopography,
    river: normalized.river,
    size: normalized.size,
    walled: normalized.walled,
    labels: normalized.labels,
    race: normalized.race,
    wallKind,
    wallDescription: wallDescription(wallKind),
    districtCount,
    districts,
    marketName: layout.marketBounds ? "Market" : null,
    riverGeometry: layout.river,
    hasWater: draft.hasWater,
    svg,
    svgDraft: draft,
    profile,
  };
}
