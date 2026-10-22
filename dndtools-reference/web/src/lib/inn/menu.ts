import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { InnMenuEntry, InnQuality } from "./types";
import { INN_DISH_NAMES, INN_DRINK_NAMES } from "./tables";

export function priceToCp(price: string): number {
  const trimmed = price.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*(cp|sp)$/);
  if (!match) return 0;
  const amount = Number.parseInt(match[1]!, 10);
  if (match[2] === "sp") return amount * 10;
  return amount;
}

function rollPrice(quality: InnQuality, rng: SeededRng): InnMenuEntry {
  switch (quality) {
    case "poor": {
      const cp = rng.pickInt(1, 4);
      return { name: "", price: `${cp} cp`, priceCp: cp };
    }
    case "common": {
      const cp = rng.pickInt(5, 20);
      return { name: "", price: `${cp} cp`, priceCp: cp };
    }
    case "good": {
      const sp = rng.pickInt(2, 8);
      return { name: "", price: `${sp} sp`, priceCp: sp * 10 };
    }
  }
}

export function rollMenuDishes(quality: InnQuality, rng: SeededRng): InnMenuEntry[] {
  const names = rng.sample([...INN_DISH_NAMES], 6);
  return names.map((name) => {
    const priced = rollPrice(quality, rng);
    return { ...priced, name };
  });
}

export function rollMenuDrinks(quality: InnQuality, rng: SeededRng): InnMenuEntry[] {
  const names = rng.sample([...INN_DRINK_NAMES], 3);
  return names.map((name) => {
    const priced = rollPrice(quality, rng);
    return { ...priced, name };
  });
}
