import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import { generateWeather, temperatureBand } from "./generate";
import type { WeatherInput } from "./types";

const baseInput: WeatherInput = {
  climate: "temperate",
  season: "spring",
  supernatural: "none",
  days: 30,
};

describe("weather generator", () => {
  it("is stable for 30 days with the same seed", () => {
    const a = generateWeather(baseInput, createSeededRng(4242));
    const b = generateWeather(baseInput, createSeededRng(4242));
    assert.deepEqual(a, b);
    assert.equal(a.days.length, 30);
  });

  it("never marks supernatural when frequency is none", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const result = generateWeather(
        { ...baseInput, supernatural: "none", days: 30 },
        createSeededRng(seed),
      );
      assert.ok(result.days.every((day) => !day.supernatural));
    }
  });

  it("maps temperature bands for extreme cold and very hot", () => {
    assert.equal(temperatureBand(-25), "Extreme cold");
    assert.equal(temperatureBand(95), "Very hot");
  });

  it("has more precipitation in cold winter than warm summer over many seeds", () => {
    let coldWinter = 0;
    let warmSummer = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const winter = generateWeather(
        {
          climate: "cold",
          season: "winter",
          supernatural: "none",
          days: 30,
        },
        createSeededRng(seed),
      );
      const summer = generateWeather(
        {
          climate: "warm",
          season: "summer",
          supernatural: "none",
          days: 30,
        },
        createSeededRng(seed),
      );
      coldWinter += winter.precipDays;
      warmSummer += summer.precipDays;
    }
    assert.ok(coldWinter > warmSummer);
  });

  it("always keeps low below high", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const result = generateWeather(
        { ...baseInput, days: 60 },
        createSeededRng(seed),
      );
      for (const day of result.days) {
        assert.ok(day.low < day.high, `seed ${seed} day ${day.day}`);
      }
    }
  });
});
