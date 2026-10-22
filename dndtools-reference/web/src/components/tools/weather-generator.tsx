"use client";

import { Copy } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_WEATHER_INPUT,
  generateWeather,
  type SupernaturalFrequency,
  type WeatherClimate,
  type WeatherInput,
  type WeatherResult,
  type WeatherSeason,
} from "@/lib/weather";

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

const CLIMATE_OPTIONS: { value: WeatherClimate; label: string }[] = [
  { value: "cold", label: "Cold" },
  { value: "temperate", label: "Temperate" },
  { value: "warm", label: "Warm" },
];

const SEASON_OPTIONS: { value: WeatherSeason; label: string }[] = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

const SUPERNATURAL_OPTIONS: {
  value: SupernaturalFrequency;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "rare", label: "Rare" },
  { value: "uncommon", label: "Uncommon" },
  { value: "common", label: "Common" },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseClimate(raw: string | null): WeatherClimate {
  if (raw === "cold" || raw === "warm") return raw;
  return "temperate";
}

function parseSeason(raw: string | null): WeatherSeason {
  if (raw === "summer" || raw === "autumn" || raw === "winter") return raw;
  return "spring";
}

function parseSupernatural(raw: string | null): SupernaturalFrequency {
  if (raw === "rare" || raw === "uncommon" || raw === "common") return raw;
  return "none";
}

function formatPlainText(result: WeatherResult): string {
  const lines = [
    `${result.precipDays} day(s) with precipitation. Coldest high ${result.coldestHigh} F, hottest high ${result.hottestHigh} F.`,
    "",
  ];
  for (const day of result.days) {
    lines.push(
      `Day ${day.day}: ${day.sky}${day.precipitation ? ` (${day.precipitation})` : ""} · ${day.high}/${day.low} F · ${day.band} (${day.relative}) · ${day.wind} ${day.windMph} mph`,
    );
  }
  return lines.join("\n");
}

export function WeatherGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [climate, setClimate] = useState<WeatherClimate>(
    parseClimate(searchParams.get("climate")),
  );
  const [season, setSeason] = useState<WeatherSeason>(
    parseSeason(searchParams.get("season")),
  );
  const [supernatural, setSupernatural] = useState<SupernaturalFrequency>(
    parseSupernatural(searchParams.get("super")),
  );
  const [days, setDays] = useState(DEFAULT_WEATHER_INPUT.days);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const input = useMemo<WeatherInput>(
    () => ({
      climate,
      season,
      supernatural,
      days: clampInt(days, 1, 60),
    }),
    [climate, season, supernatural, days],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("climate", climate);
      params.set("season", season);
      params.set("super", supernatural);
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [climate, pathname, router, season, supernatural],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateWeather(input, rng));
        syncUrl(usedSeed);
      });
    },
    [input, seed, syncUrl],
  );

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed);
  }

  useEffect(() => {
    runGenerate();
  }, []);

  function handleClear() {
    setClimate(DEFAULT_WEATHER_INPUT.climate);
    setSeason(DEFAULT_WEATHER_INPUT.season);
    setSupernatural(DEFAULT_WEATHER_INPUT.supernatural);
    setDays(DEFAULT_WEATHER_INPUT.days);
    setSeed(1);
    setResult(null);
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatPlainText(result));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <div className="weather-gen">
      <div className="weather-gen-form">
        <div className="weather-gen-seed-row">
          <div className="tool-field weather-gen-seed-field">
            <Label htmlFor="weather-seed">Seed</Label>
            <input
              id="weather-seed"
              type="number"
              className="tool-input"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() => runGenerate()}
          >
            Use this seed
          </button>
        </div>

        <div className="weather-gen-grid">
          <div className="tool-field">
            <Label htmlFor="weather-climate">Climate</Label>
            <select
              id="weather-climate"
              className="tool-input"
              value={climate}
              onChange={(event) =>
                setClimate(event.target.value as WeatherClimate)
              }
            >
              {CLIMATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="weather-season">Season</Label>
            <select
              id="weather-season"
              className="tool-input"
              value={season}
              onChange={(event) =>
                setSeason(event.target.value as WeatherSeason)
              }
            >
              {SEASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="weather-super">Supernatural</Label>
            <select
              id="weather-super"
              className="tool-input"
              value={supernatural}
              onChange={(event) =>
                setSupernatural(event.target.value as SupernaturalFrequency)
              }
            >
              {SUPERNATURAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="weather-days">Days</Label>
            <input
              id="weather-days"
              type="number"
              className="tool-input"
              min={1}
              max={60}
              value={days}
              onChange={(event) =>
                setDays(clampInt(Number(event.target.value), 1, 60))
              }
            />
          </div>
        </div>

        <div className="weather-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            Generate
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </div>

      {result ? (
        <div className="weather-gen-results">
          <div className="weather-gen-results-toolbar">
            <p className="weather-gen-summary">
              {result.precipDays} day(s) with precipitation. Coldest high{" "}
              {result.coldestHigh} F, hottest high {result.hottestHigh} F.
            </p>
            <button
              type="button"
              className="tool-btn tool-btn-secondary"
              onClick={() => void copyResult()}
            >
              <Copy size={16} aria-hidden="true" />
              Copy
            </button>
            {copyStatus ? (
              <span className="weather-gen-copy-status">{copyStatus}</span>
            ) : null}
          </div>

          <div className="weather-gen-table-wrap">
            <table className="weather-gen-table">
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Sky</th>
                  <th scope="col">High / Low</th>
                  <th scope="col">Band</th>
                  <th scope="col">Wind</th>
                </tr>
              </thead>
              <tbody>
                {result.days.map((day, index) => {
                  const rowClasses = [
                    day.supernatural ? "weather-gen-super" : "",
                    !day.supernatural && index % 2 === 1
                      ? "weather-gen-odd"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={day.day} className={rowClasses || undefined}>
                      <td>{day.day}</td>
                      <td>{day.sky}</td>
                      <td>
                        {day.high} / {day.low} F
                        <span className="weather-gen-secondary">
                          {" "}
                          ({day.relative})
                        </span>
                      </td>
                      <td>{day.band}</td>
                      <td>
                        {day.wind} ({day.windMph} mph)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
