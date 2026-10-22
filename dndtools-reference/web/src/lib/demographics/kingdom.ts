import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { DENSITY_VALUES } from "./constants";
import { communitySizeLabel } from "./format";
import type { DensityKey, KingdomInput, KingdomResult } from "./types";

function roll2d4(rng: SeededRng): number {
  return rng.pickInt(1, 4) + rng.pickInt(1, 4);
}

function roll2d8(rng: SeededRng): number {
  return rng.pickInt(1, 8) + rng.pickInt(1, 8);
}

export function computeKingdomPopulation(
  areaSqMi: number,
  density: DensityKey,
): number {
  return Math.floor(areaSqMi * DENSITY_VALUES[density]);
}

export function splitCastleWilderness(
  total: number,
  rng: SeededRng,
): { wilderness: number; settled: number } {
  if (total <= 0) {
    return { wilderness: 0, settled: 0 };
  }
  const wilderness = Math.floor((total / 100) * (roll2d4(rng) * 5));
  const clampedWilderness = Math.min(Math.max(0, wilderness), total);
  return {
    wilderness: clampedWilderness,
    settled: total - clampedWilderness,
  };
}

export function generateKingdom(
  input: KingdomInput,
  rng: SeededRng,
): KingdomResult {
  const areaSqMi = Math.max(0, input.areaSqMi);
  const population = computeKingdomPopulation(areaSqMi, input.density);
  const densityValue = DENSITY_VALUES[input.density];

  let cultivatedFraction = densityValue / 180 + 0.1 * rng.next();
  if (cultivatedFraction > 0.95) cultivatedFraction = 0.95;
  const wildernessFraction = 1 - cultivatedFraction;
  const cultivatedSqMi = Math.floor(areaSqMi * cultivatedFraction);
  const wildernessSqMi = Math.max(0, areaSqMi - cultivatedSqMi);

  const largestSettlementPop = Math.floor(
    Math.sqrt(Math.max(0, population)) * (roll2d4(rng) + 10),
  );
  let secondSettlementPop = Math.floor(
    (largestSettlementPop / 100) * (roll2d4(rng) * 10),
  );

  let extraCityCount = 0;
  let townsOfNote = 0;
  let townsOfNoteNote: string;

  if (largestSettlementPop > 8000) {
    let second = secondSettlementPop;
    while (second > 8000) {
      extraCityCount += 1;
      second = Math.floor((second / 100) * (100 - roll2d4(rng) * 5));
    }
    secondSettlementPop = second;
    townsOfNote = (2 + extraCityCount) * roll2d8(rng);
    townsOfNoteNote = `${townsOfNote} towns of note beyond the major cities.`;
  } else {
    townsOfNoteNote = "There are no other towns of note in the kingdom.";
  }

  const largestSettlementLabel = communitySizeLabel(largestSettlementPop);

  const castlesActive = Math.floor(population / 50000);
  const age = Math.max(0, input.ageYears);
  const castlesRuined = Math.floor(
    (population / 5000000) * Math.sqrt(age),
  );

  const activeSplit = splitCastleWilderness(castlesActive, rng);
  const ruinedSplit = splitCastleWilderness(castlesRuined, rng);

  return {
    population,
    cultivatedFraction,
    cultivatedSqMi,
    wildernessFraction,
    wildernessSqMi,
    largestSettlementPop,
    largestSettlementLabel,
    secondSettlementPop,
    extraCityCount,
    townsOfNote,
    townsOfNoteNote,
    castlesActive,
    castlesActiveWilderness: activeSplit.wilderness,
    castlesActiveSettled: activeSplit.settled,
    castlesRuined,
    castlesRuinedWilderness: ruinedSplit.wilderness,
    castlesRuinedSettled: ruinedSplit.settled,
  };
}
