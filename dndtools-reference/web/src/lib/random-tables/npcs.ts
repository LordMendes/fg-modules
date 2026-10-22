import { catalogIdForAncestry, generateBuiltinNames } from "@/lib/names";
import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type {
  NpcClassOrder,
  NpcGender,
  NpcRace,
  NpcResult,
} from "./types";

const MANNERISMS = [
  "speaks in short, careful sentences",
  "fidgets with a coin whenever nervous",
  "keeps one hand near an old scar",
  "laughs too loudly at small jokes",
  "never sits with their back to a door",
  "quotes proverbs from a battered chapbook",
  "squints as if the light is always too bright",
  "hums a tuneless fragment under their breath",
  "addresses strangers with formal titles",
  "collects odd trinkets in a belt pouch",
  "answers questions with another question",
  "stares at maps when thinking",
  "taps a rhythm on the table while waiting",
  "refuses to discuss the last war",
  "offers food before asking names",
  "polishes spectacles that are already clean",
  "marks tally scratches on a leather bracer",
  "bows slightly to anyone in armor",
  "smells faintly of smoke and herbs",
  "whispers when discussing magic",
] as const;

const CLASS_GROUPS: Record<
  Exclude<NpcClassOrder, "any">,
  readonly string[]
> = {
  adventurer: [
    "barbarian",
    "bard",
    "cleric",
    "druid",
    "fighter",
    "monk",
    "paladin",
    "ranger",
    "rogue",
    "sorcerer",
    "wizard",
  ],
  "npc-class": ["adept", "aristocrat", "commoner", "expert", "warrior"],
  arcane: ["bard", "sorcerer", "wizard"],
  divine: ["cleric", "druid", "paladin"],
  martial: ["barbarian", "fighter", "monk", "paladin", "ranger"],
  scoundrel: ["bard", "rogue"],
  wild: ["barbarian", "druid", "ranger"],
};

const ALL_CLASSES = [
  ...CLASS_GROUPS.adventurer,
  ...CLASS_GROUPS["npc-class"],
] as const;

const RACES: Exclude<NpcRace, "any">[] = [
  "human",
  "dwarf",
  "elf",
  "gnome",
  "half-elf",
  "half-orc",
  "halfling",
];

const RACE_LABELS: Record<Exclude<NpcRace, "any">, string> = {
  human: "Human",
  dwarf: "Dwarf",
  elf: "Elf",
  gnome: "Gnome",
  "half-elf": "Half-elf",
  "half-orc": "Half-orc",
  halfling: "Halfling",
};

function resolveGender(gender: NpcGender, rng: SeededRng): "male" | "female" {
  if (gender === "male" || gender === "female") return gender;
  return rng.next() < 0.5 ? "male" : "female";
}

function resolveRace(race: NpcRace, rng: SeededRng): Exclude<NpcRace, "any"> {
  if (race !== "any") return race;
  return rng.pick(RACES) ?? "human";
}

function pickClass(order: NpcClassOrder, rng: SeededRng): string {
  if (order === "any") {
    return rng.pick([...ALL_CLASSES]) ?? "commoner";
  }
  const pool = CLASS_GROUPS[order];
  return rng.pick([...pool]) ?? pool[0]!;
}

function formatClassLabel(classKey: string): string {
  if (classKey === "npc-class") return "Commoner";
  return classKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function rollNpc(
  rng: SeededRng,
  options: {
    gender: NpcGender;
    race: NpcRace;
    classOrder: NpcClassOrder;
    classSlugByLowerName?: Record<string, string>;
  },
): NpcResult {
  const gender = resolveGender(options.gender, rng);
  const race = resolveRace(options.race, rng);
  const classKey = pickClass(options.classOrder, rng);
  const classLabel = formatClassLabel(classKey);
  const level = rng.pickInt(1, 6) + 1;
  const catalogId = catalogIdForAncestry(race, gender);
  const [name] = generateBuiltinNames(
    { catalogId, count: 1, seed: rng.pickInt(1, 999_999) },
    rng,
  );
  const displayName = name ?? "Unnamed traveler";
  const mannerism = rng.pick([...MANNERISMS]) ?? MANNERISMS[0]!;
  const genderLabel = gender === "male" ? "male" : "female";
  const raceLabel = RACE_LABELS[race];
  const classSlug = options.classSlugByLowerName?.[classKey.toLowerCase()];
  const text = `${displayName}, a ${raceLabel} ${genderLabel} ${classLabel} ${level}, ${mannerism}.`;

  return {
    kind: "npc",
    text,
    name: displayName,
    race: raceLabel,
    gender: genderLabel,
    className: classLabel,
    level,
    mannerism,
    classHref: classSlug ? `/classes/${classSlug}` : undefined,
  };
}
