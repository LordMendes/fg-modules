import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  refreshInnNameForKeeper,
  rollInnName,
  rollKeeperGivenName,
} from "./names";
import { rollMenuDishes, rollMenuDrinks } from "./menu";
import {
  ADVENTURER_CLASS_WORDS,
  ADVENTURER_PATRON_ACTIVITIES,
  ADVENTURER_RACE_WORDS,
  INN_DESCRIPTIONS,
  INN_KEEPER_TEMPLATES,
  INN_LOCATIONS,
  INN_RUMORS,
  TOWNSFOLK_PATRON_TEMPLATES,
} from "./tables";
import type {
  InnInput,
  InnResult,
  InnRumor,
  InnSection,
  InnPatronType,
  InnQuality,
} from "./types";
import { INN_SECTION_SALT } from "./types";

export function innSectionSeed(seed: number, section: InnSection): number {
  const salt = INN_SECTION_SALT[section];
  return (seed + salt * 1_000_003) >>> 0;
}

export function sectionRng(
  seed: number,
  section: InnSection,
  bump = 0,
): SeededRng {
  return createSeededRng((innSectionSeed(seed, section) + bump * 97) >>> 0);
}

function rollLocation(rng: SeededRng): string {
  return rng.pick([...INN_LOCATIONS]) ?? INN_LOCATIONS[0]!;
}

function rollDescription(quality: InnQuality, rng: SeededRng): string {
  const pool = INN_DESCRIPTIONS[quality];
  return rng.pick([...pool]) ?? pool[0]!;
}

function rollKeeper(rng: SeededRng): string {
  const template =
    rng.pick([...INN_KEEPER_TEMPLATES]) ?? INN_KEEPER_TEMPLATES[0]!;
  const name = rollKeeperGivenName(rng);
  return template.replace("{name}", name);
}

function rollPatrons(patrons: InnPatronType, rng: SeededRng): string[] {
  if (patrons === "townsfolk") {
    const templates = rng.sample([...TOWNSFOLK_PATRON_TEMPLATES], 4);
    return templates.map((template) => {
      const name = rollKeeperGivenName(rng);
      return template.replace("{name}", name);
    });
  }

  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const race = rng.pick([...ADVENTURER_RACE_WORDS]) ?? "human";
    const cls = rng.pick([...ADVENTURER_CLASS_WORDS]) ?? "fighter";
    const activity =
      rng.pick([...ADVENTURER_PATRON_ACTIVITIES]) ??
      ADVENTURER_PATRON_ACTIVITIES[0]!;
    lines.push(
      `A ${race} ${cls} sits near the hearth, ${activity}.`,
    );
  }
  return lines;
}

function rollRumors(rng: SeededRng): InnRumor[] {
  const picked = rng.sample([...INN_RUMORS], 3);
  const unreliableIndex = rng.pickInt(0, picked.length - 1);
  return picked.map((text, index) => ({
    text,
    unreliable: index === unreliableIndex,
  }));
}

function rollMenu(quality: InnQuality, rng: SeededRng): {
  dishes: InnResult["dishes"];
  drinks: InnResult["drinks"];
} {
  return {
    dishes: rollMenuDishes(quality, rng),
    drinks: rollMenuDrinks(quality, rng),
  };
}

export function generateInn(input: InnInput): InnResult {
  const keeperRng = sectionRng(input.seed, "keeper");
  const keeper = rollKeeper(keeperRng);

  const nameRng = sectionRng(input.seed, "name");
  const { name, namePattern } = rollInnName(keeper, nameRng);

  const locationRng = sectionRng(input.seed, "location");
  const descriptionRng = sectionRng(input.seed, "description");
  const menuRng = sectionRng(input.seed, "menu");
  const patronsRng = sectionRng(input.seed, "patrons");
  const rumorsRng = sectionRng(input.seed, "rumors");

  const menu = rollMenu(input.quality, menuRng);

  return {
    name,
    namePattern,
    location: rollLocation(locationRng),
    description: rollDescription(input.quality, descriptionRng),
    keeper,
    dishes: menu.dishes,
    drinks: menu.drinks,
    patrons: rollPatrons(input.patrons, patronsRng),
    rumors: rollRumors(rumorsRng),
  };
}

export function rerollInnSection(
  section: InnSection,
  input: InnInput,
  current: InnResult,
  bump = 0,
): InnResult {
  const rng = sectionRng(input.seed, section, bump);
  switch (section) {
    case "keeper": {
      const keeper = rollKeeper(rng);
      const name = refreshInnNameForKeeper(
        current.namePattern,
        current.name,
        keeper,
      );
      return { ...current, keeper, name };
    }
    case "name": {
      const rolled = rollInnName(current.keeper, rng, current.name);
      return {
        ...current,
        name: rolled.name,
        namePattern: rolled.namePattern,
      };
    }
    case "location":
      return { ...current, location: rollLocation(rng) };
    case "description":
      return {
        ...current,
        description: rollDescription(input.quality, rng),
      };
    case "menu": {
      const menu = rollMenu(input.quality, rng);
      return { ...current, dishes: menu.dishes, drinks: menu.drinks };
    }
    case "patrons":
      return { ...current, patrons: rollPatrons(input.patrons, rng) };
    case "rumors":
      return { ...current, rumors: rollRumors(rng) };
    default:
      return current;
  }
}

export function generateInnWithRng(input: InnInput, _rng: SeededRng): InnResult {
  return generateInn(input);
}
