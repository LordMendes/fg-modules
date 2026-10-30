"use client";

import { Download, Printer } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { DraftNumberInput } from "@/components/draft-number-input";
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
  any: "Any race",
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
  const [normalizeCells, setNormalizeCells] = useState(
    parseBool(searchParams.get("norm"), false),
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
      normalizeCells,
      race,
      culture,
    }),
    [
      culture,
      environment,
      labels,
      name,
      normalizeCells,
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
      params.set("norm", nextInput.normalizeCells ? "1" : "0");
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

  const seedRef = useRef(seed);
  seedRef.current = seed;
  const inputRef = useRef(input);
  inputRef.current = input;
  const generateRef = useRef(runGenerate);
  generateRef.current = runGenerate;

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runGenerate(seed, input);
  }, [input, runGenerate, seed]);

  const optionsReady = useRef(false);
  useEffect(() => {
    if (!optionsReady.current) {
      optionsReady.current = true;
      return;
    }
    generateRef.current(seedRef.current, inputRef.current);
  }, [
    culture,
    environment,
    labels,
    normalizeCells,
    race,
    river,
    size,
    topography,
    walled,
  ]);

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed, input);
  }

  function handleRerollName() {
    const rng = createSeededRng(seed + 9001);
    const nextName = rollTownName(rng, race, culture, "");
    setName(nextName);
    runGenerate(seed, { ...input, name: nextName });
  }

  function handleNameBlur() {
    runGenerate(seed, input);
  }

  function handleUseSeed() {
    runGenerate(seed, input);
  }

  function handlePrint() {
    window.print();
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
        <div className="town-gen-name-block">
          <Label htmlFor="town-gen-name">Town name</Label>
          <input
            id="town-gen-name"
            className="tool-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={handleNameBlur}
            autoComplete="off"
          />
          <div className="town-gen-name-actions">
            <button
              type="button"
              className="tool-btn tool-btn-secondary"
              onClick={handleRerollName}
            >
              Random name
            </button>
          </div>
        </div>

        <div className="town-gen-panels">
          <div className="town-gen-panel">
            <div className="town-gen-line">
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
            <div className="town-gen-line">
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
            <div className="town-gen-line">
              <Label htmlFor="town-gen-river">River</Label>
              <input
                id="town-gen-river"
                className="town-gen-box"
                type="checkbox"
                checked={river}
                onChange={(event) => setRiver(event.target.checked)}
              />
            </div>
          </div>

          <div className="town-gen-panel">
            <div className="town-gen-line">
              <Label htmlFor="town-gen-size">Town size</Label>
              <select
                id="town-gen-size"
                className="tool-input"
                value={size}
                onChange={(event) => {
                  const next = event.target.value as TownSize;
                  setSize(next);
                  if (!walledTouched.current) setWalled(defaultWalledForSize(next));
                }}
              >
                {TOWN_SIZES.map((value) => (
                  <option key={value} value={value}>
                    {TOWN_SIZE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="town-gen-line">
              <Label htmlFor="town-gen-walled">Walled</Label>
              <input
                id="town-gen-walled"
                className="town-gen-box"
                type="checkbox"
                checked={walled}
                onChange={(event) => {
                  walledTouched.current = true;
                  setWalled(event.target.checked);
                }}
              />
            </div>
          </div>

          <div className="town-gen-panel">
            <div className="town-gen-line">
              <Label htmlFor="town-gen-normalize">Normalize cells</Label>
              <input
                id="town-gen-normalize"
                className="town-gen-box"
                type="checkbox"
                checked={normalizeCells}
                onChange={(event) => setNormalizeCells(event.target.checked)}
              />
            </div>
            <div className="town-gen-line">
              <Label htmlFor="town-gen-labels">Label map</Label>
              <input
                id="town-gen-labels"
                className="town-gen-box"
                type="checkbox"
                checked={labels}
                onChange={(event) => setLabels(event.target.checked)}
              />
            </div>
          </div>

          <div className="town-gen-panel">
            <div className="town-gen-line">
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
            <div className="town-gen-line">
              <Label htmlFor="town-gen-culture">Culture</Label>
              <select
                id="town-gen-culture"
                className="tool-input"
                value={culture}
                onChange={(event) => setCulture(event.target.value)}
              >
                {cultureOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id === "default" ? "Default culture" : option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            disabled={!result}
            onClick={handlePrint}
          >
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
        </div>

        <div className="town-gen-seed-row">
          <Label htmlFor="town-gen-seed">Seed</Label>
          <DraftNumberInput
            id="town-gen-seed"
            className="tool-input"
            min={0}
            value={seed}
            onValueChange={setSeed}
          />
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleUseSeed}
          >
            Use this seed
          </button>
        </div>
      </div>

      {result ? (
        <div className="town-gen-results">
          <div
            className="town-gen-map-wrap"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
          <div className="town-gen-readout">
            {result.labels ? null : (
              <h2 className="town-gen-place-name">{result.name}</h2>
            )}
            <h3>Population</h3>
            <ul>
              <li>{result.profile.population}</li>
            </ul>
            <h3>Government</h3>
            <ul>
              <li>{result.profile.government}</li>
            </ul>
            <h3>Notable places</h3>
            <ul>
              {result.profile.notable.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
            <h3>Defenses</h3>
            <ul>
              <li>{result.wallDescription}</li>
            </ul>
            <h3>Gazetteer</h3>
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
        </div>
      ) : null}
    </div>
  );
}
