import type { TownEnvironment, TownInput, TownTopography } from "./types";

export type NormalizedTownInput = TownInput & {
  effectiveTopography: TownTopography;
};

export function normalizeTownTopography(
  environment: TownEnvironment,
  topography: TownTopography,
): TownTopography {
  if (environment === "subterranean") {
    return "inland";
  }
  return topography;
}

export function normalizeTownInput(input: TownInput): NormalizedTownInput {
  const effectiveTopography = normalizeTownTopography(
    input.environment,
    input.topography,
  );
  return {
    ...input,
    effectiveTopography,
  };
}
