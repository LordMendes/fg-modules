import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { capitalizeWords } from "./capitalize";
import {
  generateMarkovBatch,
  generateMarkovName,
  parseSourceNames,
  trainMarkovModel,
} from "./markov";
import { catalogSupportsLastName, DEFAULT_CATALOG_ID, getNameCatalog } from "./tables";
import type {
  BuiltinNameInput,
  MarkovNameInput,
  NameCatalog,
  NameGeneratorInput,
  NameGeneratorResult,
} from "./types";
import { DEFAULT_NAME_COUNT } from "./types";

function clampCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_NAME_COUNT;
  return Math.min(50, Math.max(1, Math.round(count)));
}

function rollSingleBuiltinName(catalog: NameCatalog, rng: SeededRng): string {
  const start = rng.pick(catalog.syllables.start) ?? "";
  const useMiddle =
    catalog.syllables.middle.length > 0 && rng.next() < 0.55
      ? rng.pick(catalog.syllables.middle) ?? ""
      : "";
  const end = rng.pick(catalog.syllables.end) ?? "";
  let core = `${start}${useMiddle}${end}`.replace(/\s+/g, " ").trim();

  if (catalog.nouns && catalog.nouns.length > 0) {
    const chance = catalog.twoWordChance ?? 0.5;
    if (rng.next() < chance) {
      const noun = rng.pick(catalog.nouns) ?? "";
      core = `${capitalizeWords(core)} ${noun}`.trim();
    } else {
      core = capitalizeWords(core);
    }
  } else {
    core = capitalizeWords(core);
  }

  return core;
}

function isValidNameLength(name: string): boolean {
  return name.length >= 3 && name.length <= 22;
}

function rollValidBuiltinWord(catalog: NameCatalog, rng: SeededRng): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = rollSingleBuiltinName(catalog, rng);
    if (isValidNameLength(candidate)) return candidate;
  }
  return "";
}

function rollBuiltinFullName(
  catalog: NameCatalog,
  rng: SeededRng,
  withLastName: boolean,
): string {
  const given = rollValidBuiltinWord(catalog, rng);
  if (!given) return "";
  if (!withLastName || !catalogSupportsLastName(catalog)) return given;

  for (let attempt = 0; attempt < 10; attempt++) {
    const surname = rollValidBuiltinWord(catalog, rng);
    if (!surname) continue;
    if (surname.toLowerCase() === given.toLowerCase()) continue;
    return `${given} ${surname}`;
  }
  return given;
}

export function generateBuiltinNames(
  input: Omit<BuiltinNameInput, "mode">,
  rng: SeededRng,
): string[] {
  const catalog = getNameCatalog(input.catalogId) ?? getNameCatalog(DEFAULT_CATALOG_ID)!;
  const count = clampCount(input.count);
  const withLastName = input.withLastName === true;
  const names: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  const maxGuard = count * 20;

  while (names.length < count && guard < maxGuard) {
    guard += 1;
    const candidate = rollBuiltinFullName(catalog, rng, withLastName);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    names.push(candidate);
  }

  return names;
}

function rollMarkovFullName(
  model: ReturnType<typeof trainMarkovModel>,
  rng: SeededRng,
  withLastName: boolean,
  seen: Set<string>,
): string | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const given = generateMarkovName(model, rng);
    const givenKey = given.toLowerCase();
    if (seen.has(givenKey)) continue;
    if (model.sourceSet.has(givenKey) && attempt < 39) continue;

    if (!withLastName) return given;

    let surname = "";
    for (let surnameAttempt = 0; surnameAttempt < 10; surnameAttempt++) {
      const next = generateMarkovName(model, rng);
      if (next.toLowerCase() === givenKey) continue;
      surname = next;
      break;
    }
    if (!surname) continue;
    return `${given} ${surname}`;
  }
  return null;
}

export function generateMarkovNames(
  input: Omit<MarkovNameInput, "mode">,
  rng: SeededRng,
): NameGeneratorResult {
  const sources = parseSourceNames(input.sourceText);
  if (sources.length < 5) {
    return {
      names: [],
      error: "Paste at least 5 names.",
    };
  }

  const model = trainMarkovModel(sources, input.order);
  const count = clampCount(input.count);
  if (input.withLastName !== true) {
    const batch = generateMarkovBatch(model, count, rng);
    return { names: batch.names, note: batch.note };
  }

  const names: string[] = [];
  const seen = new Set<string>();
  let allCollisions = false;

  for (let slot = 0; slot < count; slot++) {
    const chosen = rollMarkovFullName(model, rng, true, seen);
    if (!chosen) {
      const fallbackGiven = generateMarkovName(model, rng);
      const fallbackSurname = generateMarkovName(model, rng);
      const fallback = `${fallbackGiven} ${fallbackSurname}`;
      seen.add(fallback.toLowerCase());
      names.push(fallback);
      allCollisions =
        model.sourceSet.has(fallbackGiven.toLowerCase()) &&
        model.sourceSet.has(fallbackSurname.toLowerCase());
      continue;
    }
    seen.add(chosen.toLowerCase());
    seen.add(chosen.split(" ")[0]!.toLowerCase());
    names.push(chosen);
  }

  const everyNameIsSource = names.every((name) =>
    name.split(" ").every((word) => model.sourceSet.has(word.toLowerCase())),
  );

  if (
    (everyNameIsSource && model.sources.length > 0) ||
    (allCollisions && count === 1)
  ) {
    return { names, note: "The list is too small to vary." };
  }

  return { names };
}

export function generateNames(
  input: NameGeneratorInput,
  rng: SeededRng,
): NameGeneratorResult {
  if (input.mode === "builtin") {
    return {
      names: generateBuiltinNames(input, rng),
    };
  }
  return generateMarkovNames(input, rng);
}
