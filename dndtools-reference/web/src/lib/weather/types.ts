export type WeatherClimate = "cold" | "temperate" | "warm";

export type WeatherSeason = "spring" | "summer" | "autumn" | "winter";

export type SupernaturalFrequency =
  | "none"
  | "rare"
  | "uncommon"
  | "common";

export type WeatherInput = {
  climate: WeatherClimate;
  season: WeatherSeason;
  supernatural: SupernaturalFrequency;
  days: number;
};

export type WeatherDay = {
  day: number;
  sky: string;
  precipitation: string | null;
  high: number;
  low: number;
  band: string;
  relative: string;
  wind: string;
  windMph: number;
  supernatural: boolean;
};

export type WeatherResult = {
  days: WeatherDay[];
  precipDays: number;
  coldestHigh: number;
  hottestHigh: number;
};

export const DEFAULT_WEATHER_INPUT: WeatherInput = {
  climate: "temperate",
  season: "spring",
  supernatural: "none",
  days: 30,
};
