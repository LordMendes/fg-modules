import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  CLASS_DEFINITIONS,
  RACE_ORDER,
  TOWN_SIZE_TABLE,
  TRADE_RATIOS,
  type TownSizeRow,
} from "./constants";
import { communitySizeLabel, racePlural } from "./format";
import type {
  AlignmentLabel,
  BusinessRow,
  ClassLevelGrid,
  DieRoller,
  PowerCenter,
  PowerCenterKind,
  PrimaryRace,
  RacialMixLine,
  RacialMixMode,
  StaffCounts,
  TownInput,
  TownResult,
} from "./types";

export function lookupTownSize(population: number): TownSizeRow {
  const pop = Math.max(0, Math.floor(population));
  if (pop < 20) {
    return TOWN_SIZE_TABLE[0]!;
  }
  for (const row of TOWN_SIZE_TABLE) {
    if (pop >= row.minPop && pop <= row.maxPop) {
      return row;
    }
  }
  return TOWN_SIZE_TABLE[TOWN_SIZE_TABLE.length - 1]!;
}

export function computeGpLimit(population: number): number {
  return lookupTownSize(population).gpLimit;
}

export function computeReadyCash(population: number): number {
  const size = lookupTownSize(population);
  return Math.floor((size.gpLimit / 2) * (population / 10));
}

export function buildRacialMix(
  mode: RacialMixMode,
  primaryRace: PrimaryRace,
): RacialMixLine[] {
  if (mode === "isolated") {
    const percents = [96, 2, 1];
    const races: PrimaryRace[] = [primaryRace];
    for (const race of RACE_ORDER) {
      if (race !== primaryRace && races.length < 3) {
        races.push(race);
      }
    }
    return percents.map((percent, index) => {
      const race = races[index]!;
      return {
        race,
        percent,
        label: racePlural(race),
      };
    });
  }

  const percents =
    mode === "mixed"
      ? ([79, 9, 5, 3, 2, 1, 1] as const)
      : ([37, 20, 18, 10, 7, 5, 3] as const);

  return RACE_ORDER.map((race, index) => ({
    race,
    percent: percents[index]!,
    label: racePlural(race),
  }));
}

export function formatRacialMixText(lines: RacialMixLine[]): string {
  const parts = lines.map((line) => `${line.percent}% ${line.label}`);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function rollAlignment(rng: SeededRng): AlignmentLabel {
  const roll = rng.pickInt(1, 100);
  if (roll <= 35) return "lawful good";
  if (roll <= 39) return "neutral good";
  if (roll <= 41) return "chaotic good";
  if (roll <= 61) return "lawful neutral";
  if (roll <= 63) return "true neutral";
  if (roll <= 64) return "chaotic neutral";
  if (roll <= 90) return "lawful evil";
  if (roll <= 98) return "neutral evil";
  return "chaotic evil";
}

function rollPowerCenterKind(
  rng: SeededRng,
  modifier: number,
): PowerCenterKind {
  const roll = rng.pickInt(1, 20) + modifier;
  if (roll >= 19) return "magical";
  if (roll >= 14) return "nonstandard";
  return "conventional";
}

function powerCenterSentence(
  kind: PowerCenterKind,
  alignment: AlignmentLabel,
): string {
  switch (kind) {
    case "magical":
      return `Magical center, ${alignment}.`;
    case "nonstandard":
      return `Nonstandard center, ${alignment}.`;
    case "monstrous":
      return `Monstrous center, ${alignment}.`;
    default:
      return `Conventional center, ${alignment}.`;
  }
}

export function rollPowerCenters(
  rollCount: number,
  modifier: number,
  rng: SeededRng,
): PowerCenter[] {
  const centers: PowerCenter[] = [];
  const count = Math.max(1, rollCount);
  for (let i = 0; i < count; i++) {
    const kind = rollPowerCenterKind(rng, modifier);
    const alignment = rollAlignment(rng);
    centers.push({
      kind,
      alignment,
      sentence: powerCenterSentence(kind, alignment),
    });
    if (kind === "conventional" && rng.next() < 0.05) {
      const monstrousAlignment = rollAlignment(rng);
      centers.push({
        kind: "monstrous",
        alignment: monstrousAlignment,
        sentence: powerCenterSentence("monstrous", monstrousAlignment),
      });
    }
  }
  return centers;
}

export function rollClassHighestLevel(
  numDice: number,
  sides: number,
  rollsCount: number,
  levelModifier: number,
  rollDie: DieRoller,
): number {
  let total = 0;
  const iterations = Math.max(1, rollsCount);
  for (let r = 0; r < iterations; r++) {
    for (let d = 0; d < numDice; d++) {
      total += rollDie();
    }
  }
  total += levelModifier;
  if (total < 1) total = 1;
  if (total > 20) total = 20;
  return total;
}

export function allocateClassLevels(
  population: number,
  powerCenterRolls: number,
  levelModifier: number,
  rng: SeededRng,
): ClassLevelGrid[] {
  let remaining = Math.max(0, Math.floor(population));
  const grid: ClassLevelGrid[] = [];

  const rollDie = (sides: number) => () => rng.pickInt(1, sides);

  for (const def of CLASS_DEFINITIONS) {
    if (remaining <= 0) break;

    const rollDieFn = rollDie(def.sides);
    const highest = rollClassHighestLevel(
      def.dice,
      def.sides,
      powerCenterRolls,
      levelModifier,
      rollDieFn,
    );

    const levels: Record<number, number> = {};
    let level = highest;
    let count = 1;
    let classRemaining = remaining;

    while (level > 0 && classRemaining > 0) {
      if (level <= 20) {
        const add = Math.min(count, classRemaining);
        if (add > 0) {
          levels[level] = (levels[level] ?? 0) + add;
          classRemaining -= add;
        }
      }
      level = Math.floor(level / 2);
      count *= 2;
    }

    remaining = classRemaining;

    if ("commonerRemainder" in def && def.commonerRemainder) {
      if (remaining > 0) {
        levels[1] = (levels[1] ?? 0) + remaining;
        remaining = 0;
      }
    } else if ("firstLevelPercent" in def && def.firstLevelPercent !== undefined) {
      const forced = Math.round((def.firstLevelPercent / 100) * remaining);
      if (forced > 0) {
        levels[1] = (levels[1] ?? 0) + forced;
        remaining -= forced;
      }
    }

    const hasNpc = Object.values(levels).some((n) => n > 0);
    if (hasNpc) {
      grid.push({ className: def.name, levels });
    }
  }

  return grid;
}

export function walkClassLevelsForTest(
  population: number,
  highestLevel: number,
): Record<number, number> {
  const levels: Record<number, number> = {};
  let remaining = population;
  let level = highestLevel;
  let count = 1;

  while (level > 0 && remaining > 0) {
    if (level <= 20) {
      const add = Math.min(count, remaining);
      if (add > 0) {
        levels[level] = (levels[level] ?? 0) + add;
        remaining -= add;
      }
    }
    level = Math.floor(level / 2);
    count *= 2;
  }

  return levels;
}

function businessCount(
  population: number,
  ratio: number,
  fudge: number,
  rng: SeededRng,
): number {
  const raw = (population / ratio) * fudge;
  if (raw < 1) {
    return rng.next() < raw ? 1 : 0;
  }
  return Math.floor(raw);
}

export function rollBusinessFudge(rng: SeededRng): number {
  return 0.4 + 1.2 * rng.next();
}

export function generateBusinesses(
  population: number,
  rng: SeededRng,
): { businesses: BusinessRow[]; staff: StaffCounts; fudge: number } {
  const pop = Math.max(0, Math.floor(population));
  const fudge = rollBusinessFudge(rng);

  const businesses: BusinessRow[] = TRADE_RATIOS.map(({ trade, ratio }) => ({
    trade,
    count: businessCount(pop, ratio, fudge, rng),
  }));

  const staff: StaffCounts = {
    nobles: Math.floor(pop / 200),
    guards: Math.floor(pop / 150),
    advocates: Math.floor(pop / 650),
    clergy: Math.floor(pop / 40),
    priests: Math.floor(pop / 1000),
  };

  return { businesses, staff, fudge };
}

export function rollTownPopulation(rng: SeededRng): number {
  return rng.pickInt(1, 7) * 1000 + rng.pickInt(1, 1000);
}

export function rollVillagePopulation(rng: SeededRng): number {
  if (rng.next() < 0.5) {
    return rng.pickInt(1, 5) * 50 + rng.pickInt(1, 50);
  }
  return rng.pickInt(1, 49) * 20 + rng.pickInt(1, 20);
}

export function generateTown(
  input: TownInput,
  rng: SeededRng,
): TownResult {
  const population = Math.max(0, Math.floor(input.population));
  const size = lookupTownSize(population);
  const communityLabel = communitySizeLabel(population);
  const racialLines = buildRacialMix(input.racialMix, input.primaryRace);
  const powerCenters = rollPowerCenters(
    size.powerCenterRolls,
    size.powerCenterModifier,
    rng,
  );
  const { businesses, staff } = generateBusinesses(population, rng);
  const classGrid = allocateClassLevels(
    population,
    size.powerCenterRolls,
    size.levelModifier,
    rng,
  );

  return {
    communityLabel,
    sizeKey: size.key,
    sizeLabel: size.label,
    gpLimit: size.gpLimit,
    readyCash: computeReadyCash(population),
    racialMixText: formatRacialMixText(racialLines),
    racialLines,
    powerCenters,
    businesses,
    staff,
    classGrid,
    powerCenterRollCount: size.powerCenterRolls,
    levelModifier: size.levelModifier,
  };
}
