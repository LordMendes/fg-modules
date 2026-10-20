"use client";

import { Download, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_TOWN_INPUT,
  TOWN_ENVIRONMENTS,
  TOWN_RACES,
  TOWN_SIZES,
  TOWN_SIZE_LABELS,
  TOWN_TOPOGRAPHIES,
  defaultWalledForSize,
  generateTown,
  rollTownName,
  townCultureOptions,
  type TownEnvironment,
  type TownInput,
  type TownRace,
  type TownResult,
  type TownSize,
  type TownTopography,
} from "@/lib/town";

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

const ENVIRONMENT_LABELS: Record<TownEnvironment, string> = {
  arctic: "Arctic",
  desert: "Desert",
  forest: "Forest",
  grassland: "Grassland",
  mountain: "Mountain",
  subterranean: "Subterranean",
};

const TOPOGRAPHY_LABELS: Record<TownTopography, string> = {
  inland: "Inland",
  coastal: "Coastal",
  island: "Island",
};

const RACE_LABELS: Record<TownRace, string> = {
  any: "Any",
  human: "Human",
  dwarf: "Dwarf",
  elf: "Elf",
};

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return fallback;
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

export function TownGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const mounted = useRef(false);
  const walledTouched = useRef(false);

  const cultureOptions = useMemo(() => townCultureOptions(), []);

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [environment, setEnvironment] = useState<TownEnvironment>(
    parseEnum(searchParams.get("env"), TOWN_ENVIRONMENTS, DEFAULT_TOWN_INPUT.environment),
  );
  const [topography, setTopography] = useState<TownTopography>(
    parseEnum(searchParams.get("topo"), TOWN_TOPOGRAPHIES, DEFAULT_TOWN_INPUT.topography),
  );
  const [river, setRiver] = useState(
    parseBool(searchParams.get("river"), DEFAULT_TOWN_INPUT.river),
  );
  const [size, setSize] = useState<TownSize>(
    parseEnum(searchParams.get("size"), TOWN_SIZES, DEFAULT_TOWN_INPUT.size),
  );
  const [walled, setWalled] = useState(
    parseBool(searchParams.get("walled"), defaultWalledForSize(size)),
  );
  const [labels, setLabels] = useState(
    parseBool(searchParams.get("labels"), DEFAULT_TOWN_INPUT.labels),
  );
  const [race, setRace] = useState<TownRace>(
    parseEnum(searchParams.get("race"), TOWN_RACES, DEFAULT_TOWN_INPUT.race),
  );
  const [culture, setCulture] = useState(
    searchParams.get("culture") ?? DEFAULT_TOWN_INPUT.culture,
  );
  const [result, setResult] = useState<TownResult | null>(null);

  const subterranean = environment === "subterranean";

  const input = useMemo<TownInput>(
    () => ({
      name,
      environment,
      topography: subterranean ? "inland" : topography,
      river,
      size,
      walled,
      labels,
      race,
      culture,
    }),
    [
      culture,
      environment,
      labels,
      name,
      race,
      river,
      size,
      subterranean,
      topography,
      walled,
    ],
  );

  const syncUrl = useCallback(
    (nextSeed: number, nextInput: TownInput) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      params.set("env", nextInput.environment);
      params.set("topo", nextInput.topography);
      params.set("river", nextInput.river ? "1" : "0");
      params.set("size", nextInput.size);
      params.set("walled", nextInput.walled ? "1" : "0");
      params.set("labels", nextInput.labels ? "1" : "0");
      params.set("race", nextInput.race);
      params.set("culture", nextInput.culture);
      if (nextInput.name.trim()) params.set("name", nextInput.name.trim());
      else params.delete("name");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runGenerate = useCallback(
    (nextSeed: number, nextInput: TownInput) => {
      startTransition(() => {
        const rng = createSeededRng(nextSeed);
        setResult(generateTown(nextInput, rng));
        syncUrl(nextSeed, nextInput);
      });
    },
    [syncUrl],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runGenerate(seed, input);
  }, [input, runGenerate, seed]);

  useEffect(() => {
    if (walledTouched.current) return;
    setWalled(defaultWalledForSize(size));
  }, [size]);

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed, input);
  }

  function handleRerollName() {
    const rng = createSeededRng(seed + 9001);
    setName(rollTownName(rng, race, culture, ""));
  }

  function handleUseSeed() {
    runGenerate(seed, input);
  }

  function handleDownloadSvg() {
    if (!result) return;
    const blob = new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.name.replace(/\s+/g, "-").toLowerCase() || "town"}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="town-gen">
      <div className="town-gen-form">
        <div className="town-gen-name-row">
          <div className="tool-field town-gen-name-field">
            <Label htmlFor="town-gen-name">Town name</Label>
            <input
              id="town-gen-name"
              className="tool-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn--ghost town-gen-name-btn"
            onClick={handleRerollName}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reroll name
          </button>
        </div>

        <div className="town-gen-seed-row">
          <div className="tool-field town-gen-seed-field">
            <Label htmlFor="town-gen-seed">Seed</Label>
            <input
              id="town-gen-seed"
              className="tool-input"
              inputMode="numeric"
              value={seed}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                setSeed(Number.isNaN(parsed) ? 1 : parsed);
              }}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleUseSeed}
          >
            Use this seed
          </button>
        </div>

        <div className="town-gen-grid">
          <div className="tool-field">
            <Label htmlFor="town-gen-environment">Environment</Label>
            <select
              id="town-gen-environment"
              className="tool-input"
              value={environment}
              onChange={(event) =>
                setEnvironment(event.target.value as TownEnvironment)
              }
            >
              {TOWN_ENVIRONMENTS.map((value) => (
                <option key={value} value={value}>
                  {ENVIRONMENT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <Label htmlFor="town-gen-topography">Topography</Label>
            <select
              id="town-gen-topography"
              className="tool-input"
              value={subterranean ? "inland" : topography}
              disabled={subterranean}
              onChange={(event) =>
                setTopography(event.target.value as TownTopography)
              }
            >
              {TOWN_TOPOGRAPHIES.map((value) => (
                <option key={value} value={value}>
                  {TOPOGRAPHY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <Label htmlFor="town-gen-size">Size</Label>
            <select
              id="town-gen-size"
              className="tool-input"
              value={size}
              onChange={(event) => setSize(event.target.value as TownSize)}
            >
              {TOWN_SIZES.map((value) => (
                <option key={value} value={value}>
                  {TOWN_SIZE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <Label htmlFor="town-gen-race">Race</Label>
            <select
              id="town-gen-race"
              className="tool-input"
              value={race}
              onChange={(event) => setRace(event.target.value as TownRace)}
            >
              {TOWN_RACES.map((value) => (
                <option key={value} value={value}>
                  {RACE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <Label htmlFor="town-gen-culture">Culture</Label>
            <select
              id="town-gen-culture"
              className="tool-input"
              value={culture}
              onChange={(event) => setCulture(event.target.value)}
            >
              {cultureOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="town-gen-checks">
          <label className="town-gen-check">
            <input
              type="checkbox"
              checked={river}
              onChange={(event) => setRiver(event.target.checked)}
            />
            <span>River</span>
          </label>
          <label className="town-gen-check">
            <input
              type="checkbox"
              checked={walled}
              onChange={(event) => {
                walledTouched.current = true;
                setWalled(event.target.checked);
              }}
            />
            <span>Walled</span>
          </label>
          <label className="town-gen-check">
            <input
              type="checkbox"
              checked={labels}
              onChange={(event) => setLabels(event.target.checked)}
            />
            <span>Labels</span>
          </label>
        </div>

        <div className="town-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            disabled={isPending}
            onClick={handleGenerate}
          >
            Generate
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            disabled={!result}
            onClick={handleDownloadSvg}
          >
            <Download size={16} aria-hidden="true" />
            Download SVG
          </button>
        </div>
      </div>

      {result ? (
        <div className="town-gen-results">
          <p className="town-gen-summary">
            {result.name} · {TOWN_SIZE_LABELS[result.size]} ·{" "}
            {result.wallDescription}
          </p>
          <div
            className="town-gen-map-wrap"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
          <div className="town-gen-table-wrap">
            <table className="town-gen-table">
              <thead>
                <tr>
                  <th scope="col">District</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.marketName ? (
                  <tr>
                    <td>{result.marketName}</td>
                    <td>Market</td>
                  </tr>
                ) : null}
                {result.districts.map((row) => (
                  <tr key={row.index}>
                    <td>
                      {row.index}. {row.name}
                    </td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
