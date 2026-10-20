# Weather Generator

Read `00-shared.md` first. Implement only this tool.

## Catalog

- key: `weather-generator`
- label: Weather Generator
- href: `/tools/weather-generator`
- description: Generate a month of weather for a climate and season, including wind, precipitation, and rare supernatural skies.
- source: `DMG`

## Goal

One month of daily weather. Each day has a sky, precipitation, high and low temperature, a temperature band, a note if the day is warmer or colder than the seasonal norm, and wind. Supernatural weather can replace the sky.

## Input

```ts
type WeatherInput = {
  climate: "cold" | "temperate" | "warm";
  season: "spring" | "summer" | "autumn" | "winter";
  supernatural: "none" | "rare" | "uncommon" | "common";
  days: number; // default 30, range 1-60
};
```

## Seasonal baseline

Base high temperature in degrees Fahrenheit, then a day-to-day swing.

| Climate | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| Cold | 40 | 60 | 40 | 10 |
| Temperate | 60 | 80 | 60 | 30 |
| Warm | 75 | 95 | 75 | 50 |

Daily high = baseline plus a `2d20 - 21` offset (range -19 to +19). Low = high - 10 - `rng.pickInt(0, 10)`.

Temperature band from the high:

- below -20: Extreme cold
- below 0: Severe cold
- below 40: Cold
- above 140: Extreme heat
- above 110: Severe heat
- above 90: Very hot
- otherwise: Moderate

Seasonal norm band is baseline-7 through baseline+7. Below that: "Colder than normal". Above: "Warmer than normal". Inside: "Normal".

## Sky and precipitation

Roll d100 for the day's sky after the temperature is known.

Precipitation chance by climate and season (d100 less than or equal to this number means precipitation, otherwise clear or cloudy):

| Climate | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| Cold | 30 | 20 | 30 | 40 |
| Temperate | 35 | 25 | 30 | 30 |
| Warm | 15 | 10 | 20 | 15 |

If there is no precipitation, d100: 01-50 clear, 51-80 cloudy, 81-100 overcast.

If there is precipitation, pick the kind from temperature:

- High below 32: snow. If wind is Severe or worse, call it a blizzard. If the precip roll was 10 or less on a second d100, call it a snowstorm instead of snow.
- High 32 through 40: sleet, or hail if a coin flip from the rng is under 0.3.
- Warm climate and no snow: 01-10 on a side roll is a duststorm (greater duststorm if wind is Windstorm). Otherwise rain.
- Rain: if a side d100 is 15 or less, thunderstorm. If 5 or less, severe thunderstorm. If wind is already Hurricane, the sky is Hurricane and precipitation is rain.
- Fog replaces a cloudy or overcast day when a side d100 is 20 or less and there was no precipitation. Fog is a precipitation type for the icon, with no rainfall amount.

Wind, one roll per day, d100:

- 01-50 Light
- 51-75 Moderate
- 76-90 Strong
- 91-97 Severe
- 98-99 Windstorm
- 100 Tornado in warm summer, otherwise Hurricane in temperate or cold coastal-equivalent (treat cold and temperate 100 as Hurricane)

Wind speed dice, rolled and shown in mph:

- Light `1d10`
- Moderate `2d10+5`
- Strong `3d10+10`
- Severe `4d10+20`
- Windstorm `5d10+30`
- Hurricane `6d10+40`
- Tornado `8d10+50`

## Supernatural

Chance a day is replaced: none 0, rare 0.05, uncommon 0.15, common 0.30.

On a hit, pick one original name from `src/lib/weather/supernatural.ts`. Write 24 names in this site's voice, grouped so the type is one of: sky, wind, fog, rain, hail, snow, storm. The day keeps its temperature and wind, but `sky` becomes the supernatural name and precipitation is cleared unless the group is rain, hail, snow, or storm. Do not reuse names from other generators. Examples of the shape, not a list to copy: a calm silver sky, a wind that repeats the last word spoken, rain that falls upward.

## Output

```ts
type WeatherDay = {
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
```

## UI

- Three selects: climate, season, supernatural.
- Days number.
- Seed and Generate.
- Result is a table: Day, Sky, High / Low, Band, Wind. Supernatural rows use `.weather-gen-odd` only if the row index is odd; supernatural gets `.weather-gen-super` (italic sky, accent color from a CSS variable).
- A one-line summary above the table: how many days had precipitation, and the coldest and hottest high.
- Class prefix: `.weather-gen`.
- Query: `climate`, `season`, `super`, `seed`.

## Tests

- Seed stability for 30 days.
- `supernatural: "none"` never sets the flag.
- A forced high of -25 maps to Extreme cold. A high of 95 maps to Very hot. Test the band function directly.
- Cold winter precipitation over 200 seeds happens more often than warm summer (compare counts, not exact rates).
- Low is always less than high.

## Acceptance

- Page on `/tools`.
- Generate fills 30 rows by default.
- Tests and typecheck pass.

## Suggested commit

`feat(weather): add monthly weather generator`
