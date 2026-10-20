import type {
  EncounterClimate,
  EncounterInput,
  EncounterPlane,
  EncounterTerrain,
  MonsterCandidate,
} from "./types";

const TERRAIN_KEYWORDS: Record<EncounterTerrain, readonly string[]> = {
  aquatic: ["aquatic", "sea", "ocean", "water"],
  desert: ["desert"],
  forest: ["forest", "woods"],
  hill: ["hill", "hills"],
  marsh: ["marsh", "swamp", "bog"],
  mountain: ["mountain", "mountains"],
  plain: ["plain", "plains"],
  underground: ["underground", "undergrounds", "dungeon", "cave"],
};

function normalizedHaystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase();
}

export function matchesClimate(
  environment: string | null,
  climate: EncounterClimate,
): boolean {
  if (!environment?.trim()) return true;
  return environment.toLowerCase().includes(climate);
}

export function matchesTerrain(
  environment: string | null,
  terrain: EncounterTerrain,
): boolean {
  if (!environment?.trim()) return false;
  const env = environment.toLowerCase();
  return TERRAIN_KEYWORDS[terrain].some((keyword) => env.includes(keyword));
}

function matchesAbyssalTheme(candidate: MonsterCandidate): boolean {
  const hay = normalizedHaystack([
    candidate.environment,
    candidate.subtypes,
    candidate.name,
  ]);
  return (
    hay.includes("abyss") ||
    hay.includes("tanar") ||
    hay.includes("demon")
  );
}

function matchesInfernalTheme(candidate: MonsterCandidate): boolean {
  const hay = normalizedHaystack([
    candidate.environment,
    candidate.subtypes,
    candidate.name,
  ]);
  return (
    hay.includes("hell") ||
    hay.includes("baatezu") ||
    hay.includes("devil")
  );
}

function matchesPlanarFallback(candidate: MonsterCandidate): boolean {
  if (candidate.creatureType?.toLowerCase() === "outsider") return true;
  const subtypes = (candidate.subtypes ?? "").toLowerCase();
  return subtypes.includes("evil") && subtypes.includes("extraplanar");
}

function filterByPlanePool(
  candidates: MonsterCandidate[],
  plane: EncounterPlane,
): MonsterCandidate[] {
  if (plane === "prime") return candidates;

  const themed =
    plane === "abyssal"
      ? candidates.filter(matchesAbyssalTheme)
      : candidates.filter(matchesInfernalTheme);

  if (themed.length >= 8) return themed;
  const fallback = candidates.filter(matchesPlanarFallback);
  return fallback.length > 0 ? fallback : candidates;
}

function filterByPrimeLocale(
  candidates: MonsterCandidate[],
  input: Pick<EncounterInput, "climate" | "terrain">,
): MonsterCandidate[] {
  const skipClimate = input.terrain === "underground";

  return candidates.filter((candidate) => {
    if (!matchesTerrain(candidate.environment, input.terrain)) {
      return false;
    }
    if (skipClimate) return true;
    return matchesClimate(candidate.environment, input.climate);
  });
}

export function filterCandidatesByCr(
  candidates: MonsterCandidate[],
  level: number,
  crWindow: number,
): MonsterCandidate[] {
  const minCr = level - crWindow;
  const maxCr = level + 2;
  return candidates.filter(
    (candidate) =>
      candidate.crNum != null &&
      candidate.crNum >= minCr &&
      candidate.crNum <= maxCr,
  );
}

export function filterCandidatesForEncounter(
  candidates: MonsterCandidate[],
  input: Pick<EncounterInput, "level" | "plane" | "climate" | "terrain">,
): MonsterCandidate[] {
  let pool = filterCandidatesByCr(candidates, input.level, 4);
  if (pool.length < 5) {
    pool = filterCandidatesByCr(candidates, input.level, 6);
  }

  if (input.plane === "prime") {
    pool = filterByPrimeLocale(pool, input);
  } else {
    pool = filterByPlanePool(pool, input.plane);
  }

  return pool;
}
