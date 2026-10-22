import { createSeededRng, type SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateBuiltinNames } from "./generate";

export type NameGender = "male" | "female";

export function genderFromHint(
  hint: string | undefined,
  rng: Pick<SeededRng, "next">,
): NameGender {
  const lower = (hint ?? "").trim().toLowerCase();
  if (lower === "f" || /\b(female|woman|girl|she|her)\b/.test(lower)) {
    return "female";
  }
  if (lower === "m" || /\b(male|man|boy|he|him)\b/.test(lower)) {
    return "male";
  }
  return rng.next() < 0.5 ? "male" : "female";
}

export function catalogIdForAncestry(
  raceHint: string | undefined,
  gender: NameGender,
): string {
  const lower = (raceHint ?? "").toLowerCase();
  const female = gender === "female";

  if (/\bdrow\b/.test(lower)) return female ? "drow-female" : "drow-male";
  if (/\b(dwarf|dwarven)\b/.test(lower)) {
    return female ? "dwarven-female" : "dwarven-male";
  }
  if (/\b(elf|elven|half-elf|half elf)\b/.test(lower)) {
    return female ? "elven-female" : "elven-male";
  }
  if (/\b(orc|half-orc|half orc)\b/.test(lower)) {
    return female ? "orc-female" : "orc-male";
  }
  if (/\b(halfling|gnome|hobbit)\b/.test(lower)) {
    return female ? "halfling-female" : "halfling-male";
  }
  if (/\b(dragon|draconic|dragonborn)\b/.test(lower)) {
    return female ? "draconic-female" : "draconic-male";
  }
  if (/\b(celestial|aasimar)\b/.test(lower)) return "celestial";
  if (/\b(fiend|tiefling|demon|devil)\b/.test(lower)) return "fiendish";

  return female ? "human-female" : "human-male";
}

export function rollRandomCharacterName(options: {
  raceHint?: string;
  genderHint?: string;
  withLastName?: boolean;
  rng?: SeededRng;
} = {}): string {
  const rng =
    options.rng ??
    createSeededRng(Math.floor(Math.random() * 999_999_999) + 1);
  const gender = genderFromHint(options.genderHint, rng);
  const catalogId = catalogIdForAncestry(options.raceHint, gender);
  const names = generateBuiltinNames(
    {
      catalogId,
      count: 1,
      seed: 1,
      withLastName: options.withLastName === true,
    },
    rng,
  );
  return names[0] ?? "Unnamed";
}
