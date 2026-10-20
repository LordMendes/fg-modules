export function formatInteger(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function racePlural(race: PrimaryRaceLike): string {
  switch (race) {
    case "Human":
      return "humans";
    case "Halfling":
      return "halflings";
    case "Elf":
      return "elves";
    case "Dwarf":
      return "dwarves";
    case "Gnome":
      return "gnomes";
    case "Half-elf":
      return "half-elves";
    case "Half-orc":
      return "half-orcs";
    default:
      return String(race).toLowerCase();
  }
}

type PrimaryRaceLike = string;

export function communitySizeLabel(population: number): string {
  if (population > 8000) return "city";
  if (population > 1000) return "town";
  return "village";
}
