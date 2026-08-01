export type EncounterDifficulty =
  | "very_easy"
  | "easy"
  | "medium"
  | "hard"
  | "very_hard"
  | "hardcore";

export type PartyConfig = {
  partySize: number;
  partyLevel: number;
  difficulty: EncounterDifficulty;
};

export const DEFAULT_PARTY_CONFIG: PartyConfig = {
  partySize: 4,
  partyLevel: 5,
  difficulty: "medium",
};

export const DIFFICULTY_OFFSETS: Record<EncounterDifficulty, number> = {
  very_easy: -4,
  easy: -2,
  medium: 0,
  hard: 2,
  very_hard: 4,
  hardcore: 6,
};

export const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: EncounterDifficulty;
  label: string;
}> = [
  { value: "very_easy", label: "Very Easy" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "very_hard", label: "Very Hard" },
  { value: "hardcore", label: "Hardcore" },
];

export function clampPartySize(size: number): number {
  return Math.min(12, Math.max(1, Math.round(size)));
}

export function clampPartyLevel(level: number): number {
  return Math.min(20, Math.max(1, Math.round(level)));
}

export function normalizePartyConfig(config: Partial<PartyConfig>): PartyConfig {
  return {
    partySize: clampPartySize(config.partySize ?? DEFAULT_PARTY_CONFIG.partySize),
    partyLevel: clampPartyLevel(
      config.partyLevel ?? DEFAULT_PARTY_CONFIG.partyLevel,
    ),
    difficulty:
      config.difficulty && config.difficulty in DIFFICULTY_OFFSETS
        ? config.difficulty
        : DEFAULT_PARTY_CONFIG.difficulty,
  };
}

export function calculateTargetEl(config: PartyConfig): number {
  const normalized = normalizePartyConfig(config);
  const offset = DIFFICULTY_OFFSETS[normalized.difficulty];
  const sizeAdjust = normalized.partySize - 4;
  return Math.max(0, normalized.partyLevel + offset + sizeAdjust);
}
