/** Draconomicon Table 3-14: Dragon Cohorts (p. 139) */
export type DragonCohortOption = {
  kind: string;
  age: string;
  alignment: string;
};

export type DragonCohortRow = {
  ecl: number;
  options: DragonCohortOption[];
};

export const DRAGON_COHORT_ECL_ADJUSTMENT = 3;
export const MAX_COHORT_LEVEL = 17;

export const DRAGON_COHORT_TABLE: DragonCohortRow[] = [
  {
    ecl: 4,
    options: [{ kind: "Pseudodragon", age: "—", alignment: "NG" }],
  },
  {
    ecl: 5,
    options: [{ kind: "White dragon", age: "wyrmling", alignment: "CE" }],
  },
  {
    ecl: 6,
    options: [{ kind: "Brass dragon", age: "wyrmling", alignment: "CG" }],
  },
  {
    ecl: 7,
    options: [
      { kind: "Black dragon", age: "wyrmling", alignment: "CE" },
      { kind: "Copper dragon", age: "wyrmling", alignment: "CG" },
    ],
  },
  {
    ecl: 9,
    options: [{ kind: "White dragon", age: "very young", alignment: "CE" }],
  },
  {
    ecl: 10,
    options: [
      { kind: "Black dragon", age: "very young", alignment: "CE" },
      { kind: "Blue dragon", age: "wyrmling", alignment: "LE" },
      { kind: "Brass dragon", age: "very young", alignment: "CG" },
      { kind: "Bronze dragon", age: "wyrmling", alignment: "LG" },
      { kind: "Green dragon", age: "wyrmling", alignment: "LE" },
    ],
  },
  {
    ecl: 11,
    options: [
      { kind: "Copper dragon", age: "very young", alignment: "CG" },
      { kind: "Red dragon", age: "wyrmling", alignment: "CE" },
      { kind: "Silver dragon", age: "wyrmling", alignment: "LG" },
    ],
  },
  {
    ecl: 12,
    options: [
      { kind: "Gold dragon", age: "wyrmling", alignment: "LG" },
      { kind: "White dragon", age: "young", alignment: "CE" },
      { kind: "Wyvern", age: "—", alignment: "N" },
    ],
  },
  {
    ecl: 13,
    options: [
      { kind: "Black dragon", age: "young", alignment: "CE" },
      { kind: "Blue dragon", age: "very young", alignment: "LE" },
      { kind: "Bronze dragon", age: "very young", alignment: "LG" },
      { kind: "Green dragon", age: "very young", alignment: "LE" },
    ],
  },
  {
    ecl: 14,
    options: [
      { kind: "Brass dragon", age: "young", alignment: "CG" },
      { kind: "Silver dragon", age: "very young", alignment: "LG" },
    ],
  },
  {
    ecl: 15,
    options: [
      { kind: "Copper dragon", age: "young", alignment: "CG" },
      { kind: "Red dragon", age: "very young", alignment: "CE" },
    ],
  },
  {
    ecl: 16,
    options: [
      { kind: "Gold dragon", age: "very young", alignment: "LG" },
      { kind: "Green dragon", age: "young", alignment: "LE" },
    ],
  },
  {
    ecl: 17,
    options: [
      { kind: "Black dragon", age: "juvenile", alignment: "CE" },
      { kind: "Blue dragon", age: "young", alignment: "LE" },
      { kind: "Brass dragon", age: "juvenile", alignment: "CG" },
      { kind: "Copper dragon", age: "juvenile", alignment: "CG" },
      { kind: "Dragon turtle", age: "—", alignment: "N" },
      { kind: "White dragon", age: "juvenile", alignment: "CE" },
    ],
  },
  {
    ecl: 18,
    options: [
      { kind: "Bronze dragon", age: "young", alignment: "LG" },
      { kind: "Silver dragon", age: "young", alignment: "LG" },
    ],
  },
  {
    ecl: 19,
    options: [{ kind: "Red dragon", age: "young", alignment: "CE" }],
  },
  {
    ecl: 20,
    options: [
      { kind: "Gold dragon", age: "young", alignment: "LG" },
      { kind: "Green dragon", age: "juvenile", alignment: "LE" },
    ],
  },
];

export function formatDragonCohortLabel(option: DragonCohortOption): string {
  if (option.age === "—") {
    return option.kind;
  }
  return `${option.kind}, ${option.age}`;
}

export function adjustedDragonEcl(listedEcl: number): number {
  return listedEcl - DRAGON_COHORT_ECL_ADJUSTMENT;
}

export function maxListedDragonEcl(
  effectiveCohortLevel: number | null,
): number | null {
  if (effectiveCohortLevel === null) {
    return null;
  }

  const cappedLevel = Math.min(effectiveCohortLevel, MAX_COHORT_LEVEL);
  return cappedLevel + DRAGON_COHORT_ECL_ADJUSTMENT;
}

export function isDragonCohortEligible(
  listedEcl: number,
  effectiveCohortLevel: number | null,
): boolean {
  const maxListed = maxListedDragonEcl(effectiveCohortLevel);
  if (maxListed === null) {
    return false;
  }

  return listedEcl <= maxListed;
}

export type DragonCohortSelection = {
  maxListedEcl: number | null;
  adjustedCohortLevel: number | null;
  eligible: Array<DragonCohortOption & { listedEcl: number; adjustedEcl: number }>;
  best: Array<DragonCohortOption & { listedEcl: number; adjustedEcl: number }>;
};

export function selectDragonCohortOptions(
  effectiveCohortLevel: number | null,
): DragonCohortSelection {
  const maxListedEcl = maxListedDragonEcl(effectiveCohortLevel);
  const adjustedCohortLevel =
    effectiveCohortLevel === null
      ? null
      : Math.min(effectiveCohortLevel, MAX_COHORT_LEVEL);

  const eligible = DRAGON_COHORT_TABLE.flatMap((row) =>
    isDragonCohortEligible(row.ecl, effectiveCohortLevel)
      ? row.options.map((option) => ({
          ...option,
          listedEcl: row.ecl,
          adjustedEcl: adjustedDragonEcl(row.ecl),
        }))
      : [],
  );

  const bestListedEcl = maxListedEcl;
  const best =
    bestListedEcl === null
      ? []
      : eligible.filter((option) => option.listedEcl === bestListedEcl);

  return {
    maxListedEcl,
    adjustedCohortLevel,
    eligible,
    best,
  };
}
