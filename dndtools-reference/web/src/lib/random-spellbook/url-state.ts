import { ARCANE_SCHOOLS, type ArcaneSchool } from "@/lib/spell-utils";
import {
  DEFAULT_INT_MODIFIER,
  DEFAULT_RANDOM_SPELLBOOK_URL_STATE,
  DEFAULT_SOURCES,
  DEFAULT_WIZARD_LEVEL,
} from "./defaults";
import { spellsOfInterestCount } from "./wizard-progression";
import type { RandomSpellbookUrlState } from "./types";

const SPECIALIZATION_OPTIONS = ARCANE_SCHOOLS.filter((school) => school !== "Universal");
const SCHOOL_SET = new Set<string>(ARCANE_SCHOOLS);

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseIntParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function parseSchool(value: string | undefined): ArcaneSchool | "" {
  if (!value) return "";
  return SPECIALIZATION_OPTIONS.includes(value as ArcaneSchool)
    ? (value as ArcaneSchool)
    : "";
}

function parseSchools(values: string[]): ArcaneSchool[] {
  return values.filter((value): value is ArcaneSchool => SCHOOL_SET.has(value));
}

function parseSources(
  value: string | undefined,
  validSourceAbbrevs: string[],
): string[] {
  const valid = new Set(validSourceAbbrevs);
  const parsed = parseCsv(value).filter((abbrev) => valid.has(abbrev));
  if (parsed.length > 0) return parsed;
  if (valid.has(DEFAULT_SOURCES[0]!)) return [...DEFAULT_SOURCES];
  return validSourceAbbrevs[0] ? [validSourceAbbrevs[0]] : [];
}

function defaultInterestForLevel(level: number): number {
  return spellsOfInterestCount(level);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function parseRandomSpellbookSearchParams(
  searchParams: Record<string, string | string[] | undefined> = {},
  validSourceAbbrevs: string[] = DEFAULT_SOURCES,
): RandomSpellbookUrlState {
  const defaults = DEFAULT_RANDOM_SPELLBOOK_URL_STATE;
  const wizardLevel = parseIntParam(readParam(searchParams, "lvl"), defaults.wizardLevel, 1, 20);
  const intModifier = parseIntParam(readParam(searchParams, "int"), defaults.intModifier, -4, 10);
  const selectedSources = parseSources(readParam(searchParams, "src"), validSourceAbbrevs);
  const specialization = parseSchool(readParam(searchParams, "spec"));
  const prohibitedSchools = parseSchools(parseCsv(readParam(searchParams, "ban"))).filter(
    (school) => school !== specialization,
  );
  const defaultInterest = defaultInterestForLevel(wizardLevel);
  const interestPerLevel = parseIntParam(
    readParam(searchParams, "interest"),
    defaultInterest,
    1,
    20,
  );
  const seed = readParam(searchParams, "seed")?.trim() ?? "";

  return {
    wizardLevel,
    intModifier,
    selectedSources,
    specialization,
    prohibitedSchools,
    interestPerLevel,
    seed,
  };
}

export function buildRandomSpellbookSearchParams(
  state: RandomSpellbookUrlState,
): URLSearchParams {
  const defaults = DEFAULT_RANDOM_SPELLBOOK_URL_STATE;
  const params = new URLSearchParams();
  const defaultInterest = defaultInterestForLevel(state.wizardLevel);

  if (state.wizardLevel !== DEFAULT_WIZARD_LEVEL) {
    params.set("lvl", String(state.wizardLevel));
  }

  if (state.intModifier !== DEFAULT_INT_MODIFIER) {
    params.set("int", String(state.intModifier));
  }

  if (!arraysEqual(state.selectedSources, DEFAULT_SOURCES)) {
    params.set("src", state.selectedSources.join(","));
  }

  if (state.specialization) {
    params.set("spec", state.specialization);
  }

  if (state.prohibitedSchools.length > 0) {
    params.set("ban", state.prohibitedSchools.join(","));
  }

  if (state.interestPerLevel !== defaultInterest) {
    params.set("interest", String(state.interestPerLevel));
  }

  if (state.seed.trim()) {
    params.set("seed", state.seed.trim());
  }

  return params;
}

export function serializeRandomSpellbookUrlState(state: RandomSpellbookUrlState): string {
  return buildRandomSpellbookSearchParams(state).toString();
}
