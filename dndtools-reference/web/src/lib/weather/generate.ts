import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  pickSupernatural,
  precipitationForSupernaturalGroup,
} from "./supernatural";
import type {
  WeatherClimate,
  WeatherDay,
  WeatherInput,
  WeatherResult,
  WeatherSeason,
  SupernaturalFrequency,
} from "./types";

const BASELINE_HIGH: Record<
  WeatherClimate,
  Record<WeatherSeason, number>
> = {
  cold: { spring: 40, summer: 60, autumn: 40, winter: 10 },
  temperate: { spring: 60, summer: 80, autumn: 60, winter: 30 },
  warm: { spring: 75, summer: 95, autumn: 75, winter: 50 },
};

const PRECIP_CHANCE: Record<
  WeatherClimate,
  Record<WeatherSeason, number>
> = {
  cold: { spring: 30, summer: 20, autumn: 30, winter: 40 },
  temperate: { spring: 35, summer: 25, autumn: 30, winter: 30 },
  warm: { spring: 15, summer: 10, autumn: 20, winter: 15 },
};

const SUPERNATURAL_CHANCE: Record<SupernaturalFrequency, number> = {
  none: 0,
  rare: 0.05,
  uncommon: 0.15,
  common: 0.3,
};

export function temperatureBand(high: number): string {
  if (high < -20) return "Extreme cold";
  if (high < 0) return "Severe cold";
  if (high < 40) return "Cold";
  if (high > 140) return "Extreme heat";
  if (high > 110) return "Severe heat";
  if (high > 90) return "Very hot";
  return "Moderate";
}

export function seasonalRelative(high: number, baseline: number): string {
  if (high < baseline - 7) return "Colder than normal";
  if (high > baseline + 7) return "Warmer than normal";
  return "Normal";
}

function rollD100(rng: SeededRng): number {
  return rng.pickInt(1, 100);
}

function rollDiceTotal(
  rolls: number,
  sides: number,
  modifier: number,
  rng: SeededRng,
): number {
  let total = modifier;
  for (let i = 0; i < rolls; i++) {
    total += rng.pickInt(1, sides);
  }
  return total;
}

function rollHighOffset(rng: SeededRng): number {
  return rollDiceTotal(2, 20, -21, rng);
}

type WindCategory =
  | "Light"
  | "Moderate"
  | "Strong"
  | "Severe"
  | "Windstorm"
  | "Hurricane"
  | "Tornado";

function rollWindCategory(
  rng: SeededRng,
  climate: WeatherClimate,
  season: WeatherSeason,
): WindCategory {
  const roll = rollD100(rng);
  if (roll <= 50) return "Light";
  if (roll <= 75) return "Moderate";
  if (roll <= 90) return "Strong";
  if (roll <= 97) return "Severe";
  if (roll <= 99) return "Windstorm";
  if (climate === "warm" && season === "summer") return "Tornado";
  return "Hurricane";
}

function rollWindMph(category: WindCategory, rng: SeededRng): number {
  switch (category) {
    case "Light":
      return rollDiceTotal(1, 10, 0, rng);
    case "Moderate":
      return rollDiceTotal(2, 10, 5, rng);
    case "Strong":
      return rollDiceTotal(3, 10, 10, rng);
    case "Severe":
      return rollDiceTotal(4, 10, 20, rng);
    case "Windstorm":
      return rollDiceTotal(5, 10, 30, rng);
    case "Hurricane":
      return rollDiceTotal(6, 10, 40, rng);
    case "Tornado":
      return rollDiceTotal(8, 10, 50, rng);
    default:
      return rollDiceTotal(1, 10, 0, rng);
  }
}

function isWindSevereOrWorse(category: WindCategory): boolean {
  return (
    category === "Severe" ||
    category === "Windstorm" ||
    category === "Hurricane" ||
    category === "Tornado"
  );
}

function resolveClearSky(rng: SeededRng): string {
  const roll = rollD100(rng);
  if (roll <= 50) return "Clear";
  if (roll <= 80) return "Cloudy";
  return "Overcast";
}

function maybeFog(sky: string, rng: SeededRng): { sky: string; precip: string | null } {
  if (sky !== "Cloudy" && sky !== "Overcast") {
    return { sky, precip: null };
  }
  if (rollD100(rng) <= 20) {
    return { sky: "Fog", precip: "Fog" };
  }
  return { sky, precip: null };
}

function resolvePrecipitation(
  rng: SeededRng,
  climate: WeatherClimate,
  high: number,
  wind: WindCategory,
): { sky: string; precipitation: string } {
  if (high < 32) {
    const intensityRoll = rollD100(rng);
    let label = "Snow";
    if (intensityRoll <= 10) {
      label = "Snowstorm";
    } else if (isWindSevereOrWorse(wind)) {
      label = "Blizzard";
    }
    return { sky: label, precipitation: label };
  }

  if (high <= 40) {
    if (rng.next() < 0.3) {
      return { sky: "Hail", precipitation: "Hail" };
    }
    return { sky: "Sleet", precipitation: "Sleet" };
  }

  if (climate === "warm") {
    const dustRoll = rollD100(rng);
    if (dustRoll <= 10) {
      const label =
        wind === "Windstorm" ? "Greater duststorm" : "Duststorm";
      return { sky: label, precipitation: label };
    }
  }

  const stormRoll = rollD100(rng);
  let label = "Rain";
  if (stormRoll <= 5) {
    label = "Severe thunderstorm";
  } else if (stormRoll <= 15) {
    label = "Thunderstorm";
  }

  if (wind === "Hurricane") {
    return { sky: "Hurricane", precipitation: "Rain" };
  }

  return { sky: label, precipitation: label };
}

function generateDay(
  day: number,
  input: WeatherInput,
  rng: SeededRng,
): WeatherDay {
  const baseline = BASELINE_HIGH[input.climate][input.season];
  const high = baseline + rollHighOffset(rng);
  const low = high - 10 - rng.pickInt(0, 10);
  const band = temperatureBand(high);
  const relative = seasonalRelative(high, baseline);

  const windCategory = rollWindCategory(rng, input.climate, input.season);
  const windMph = rollWindMph(windCategory, rng);

  const precipThreshold = PRECIP_CHANCE[input.climate][input.season];
  const hasPrecip = rollD100(rng) <= precipThreshold;

  let sky: string;
  let precipitation: string | null;

  if (hasPrecip) {
    const resolved = resolvePrecipitation(
      rng,
      input.climate,
      high,
      windCategory,
    );
    sky = resolved.sky;
    precipitation = resolved.precipitation;
  } else {
    const clearSky = resolveClearSky(rng);
    const fogged = maybeFog(clearSky, rng);
    sky = fogged.sky;
    precipitation = fogged.precip;
  }

  let supernatural = false;

  const superChance = SUPERNATURAL_CHANCE[input.supernatural];
  if (superChance > 0 && rng.next() < superChance) {
    const picked = pickSupernatural(rng);
    sky = picked.name;
    precipitation = precipitationForSupernaturalGroup(picked.group);
    supernatural = true;
  }

  return {
    day,
    sky,
    precipitation,
    high,
    low,
    band,
    relative,
    wind: windCategory,
    windMph,
    supernatural,
  };
}

export function generateWeather(
  input: WeatherInput,
  rng: SeededRng,
): WeatherResult {
  const daysCount = Math.min(60, Math.max(1, Math.round(input.days)));
  const days: WeatherDay[] = [];

  for (let day = 1; day <= daysCount; day++) {
    days.push(generateDay(day, { ...input, days: daysCount }, rng));
  }

  const precipDays = days.filter((day) => day.precipitation !== null).length;
  const highs = days.map((day) => day.high);
  const coldestHigh = highs.length > 0 ? Math.min(...highs) : 0;
  const hottestHigh = highs.length > 0 ? Math.max(...highs) : 0;

  return { days, precipDays, coldestHigh, hottestHigh };
}
