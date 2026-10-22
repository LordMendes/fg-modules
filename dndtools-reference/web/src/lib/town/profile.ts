import { rollRandomCharacterName } from "@/lib/names/ancestry";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { TownDistrict, TownRace, TownSize } from "./types";

export type TownProfile = {
  population: string;
  government: string;
  notable: string[];
};

const POPULATION: Record<TownSize, [number, number]> = {
  thorp: [20, 80],
  hamlet: [80, 400],
  village: [400, 900],
  "small-town": [900, 2000],
  "large-town": [2000, 5000],
  "small-city": [5000, 12000],
  "large-city": [12000, 25000],
  metropolis: [25000, 80000],
};

const GOVERNMENTS = [
  "a council of elders",
  "a hereditary lord of the manor",
  "an elected reeve",
  "a circle of temple wardens",
  "a syndicate of merchants",
  "the captain of the watch",
];

function populationCount(size: TownSize, rng: SeededRng): number {
  const [min, max] = POPULATION[size];
  const rolled = min + Math.floor(rng.next() * (max - min + 1));
  const step = max >= 5000 ? 100 : max >= 400 ? 10 : 1;
  return Math.max(min, Math.round(rolled / step) * step);
}

function folkWord(race: TownRace, rng: SeededRng): string {
  if (race === "dwarf") return "dwarf";
  if (race === "elf") return "elf";
  if (race === "human") return "human";
  return rng.pick(["human", "dwarf", "elf"]) ?? "human";
}

function mixLine(race: TownRace): string {
  switch (race) {
    case "dwarf":
      return "mostly dwarf, with a few human traders";
    case "elf":
      return "mostly elf, with a scattering of human guests";
    case "human":
      return "mostly human";
    default:
      return "mostly human, with dwarf and elf households among them";
  }
}

function notableLine(district: TownDistrict): string {
  const place = district.name;
  switch (district.buildingType) {
    case "smith":
      return `The smithy in ${place} stamps its iron with a broken-crown mark.`;
    case "shrine":
      return `A shrine in ${place} keeps a lamp burning above the lintel.`;
    case "inn":
      return `Travelers ask for the inn in ${place} by the tankard carved over the door.`;
    case "warehouse":
      return `A warehouse in ${place} smells of tar, grain, and last season's wool.`;
    case "homes":
      return `The houses of ${place} share a well and a bench worn smooth at the edge.`;
    case "mill":
      return `The mill in ${place} creaks when the wind turns, even on still nights.`;
    case "barracks":
      return `The barracks in ${place} posts a sentry who knows every face in town.`;
    case "well":
      return `The well in ${place} is capped with an iron grate and a saint's token.`;
    default:
      return `${place} is a quiet block of ordinary buildings.`;
  }
}

export function buildTownProfile(
  name: string,
  size: TownSize,
  race: TownRace,
  districts: TownDistrict[],
  hasMarket: boolean,
  rng: SeededRng,
): TownProfile {
  const count = populationCount(size, rng);
  const folk = folkWord(race, rng);
  const gender = rng.next() < 0.5 ? "male" : "female";
  const leader = rollRandomCharacterName({
    raceHint: folk,
    genderHint: gender,
    rng,
  });
  const body = rng.pick(GOVERNMENTS) ?? GOVERNMENTS[0]!;
  const picked = rng.shuffle([...districts]).slice(0, 2);
  const notable = picked.map((district) => notableLine(district));
  if (hasMarket) {
    notable.unshift(
      "The market square is swept at dawn and empty by the second bell.",
    );
  }

  return {
    population: `Approximately ${count.toLocaleString("en-US")}, ${mixLine(race)}.`,
    government: `${name} is governed by ${body}, led by a ${gender} ${folk} named ${leader}.`,
    notable: notable.slice(0, 3),
  };
}
