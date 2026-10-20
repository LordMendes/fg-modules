"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { loadEncounterMonsterCandidates } from "@/actions/encounter-generator";
import { formatEl, formatXp } from "@/lib/encounter/formatEl";
import {
  computeEncounterXp,
  generateEncounter,
  type EncounterClimate,
  type EncounterGenerateResult,
  type EncounterInput,
  type EncounterPlane,
  type EncounterTerrain,
  type MonsterCandidate,
} from "@/lib/encounter-generator";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";

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

const PLANE_OPTIONS: { value: EncounterPlane; label: string }[] = [
  { value: "prime", label: "Prime world" },
  { value: "abyssal", label: "Abyssal plane" },
  { value: "infernal", label: "Infernal plane" },
];

const CLIMATE_OPTIONS: { value: EncounterClimate; label: string }[] = [
  { value: "cold", label: "Cold" },
  { value: "temperate", label: "Temperate" },
  { value: "warm", label: "Warm" },
];

const TERRAIN_OPTIONS: { value: EncounterTerrain; label: string }[] = [
  { value: "aquatic", label: "Aquatic" },
  { value: "desert", label: "Desert" },
  { value: "forest", label: "Forest" },
  { value: "hill", label: "Hill" },
  { value: "marsh", label: "Marsh" },
  { value: "mountain", label: "Mountain" },
  { value: "plain", label: "Plain" },
  { value: "underground", label: "Underground" },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parsePlane(raw: string | null): EncounterPlane {
  if (raw === "abyssal" || raw === "infernal") return raw;
  return "prime";
}

function parseClimate(raw: string | null): EncounterClimate {
  if (raw === "cold" || raw === "warm") return raw;
  return "temperate";
}

function parseTerrain(raw: string | null): EncounterTerrain {
  const allowed = TERRAIN_OPTIONS.map((option) => option.value);
  if (raw && allowed.includes(raw as EncounterTerrain)) {
    return raw as EncounterTerrain;
  }
  return "plain";
}

function formatPlainText(
  result: EncounterGenerateResult,
  xpSummary: ReturnType<typeof computeEncounterXp>,
  actualEl: string,
): string {
  const lines = [result.description, `Actual EL: ${actualEl}`];
  for (const group of result.groups) {
    lines.push(
      `${group.count} x ${group.name} (CR ${group.cr}${group.size ? `, ${group.size}` : ""}${group.creatureType ? `, ${group.creatureType}` : ""})`,
    );
    if (group.treasure) {
      lines.push(`Treasure: ${group.treasure}`);
    }
  }
  lines.push(`Total XP: ${xpSummary.totalXp}`);
  lines.push(`XP per PC: ${xpSummary.xpPerPc}`);
  return lines.join("\n");
}

export function EncounterGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const initialLevel = Number.parseInt(searchParams.get("level") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [level, setLevel] = useState(clampInt(initialLevel, 1, 20));
  const [plane, setPlane] = useState<EncounterPlane>(
    parsePlane(searchParams.get("plane")),
  );
  const [climate, setClimate] = useState<EncounterClimate>(
    parseClimate(searchParams.get("climate")),
  );
  const [terrain, setTerrain] = useState<EncounterTerrain>(
    parseTerrain(searchParams.get("terrain")),
  );
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(
    clampInt(initialLevel, 1, 20),
  );
  const [candidates, setCandidates] = useState<MonsterCandidate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<EncounterGenerateResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const autoSelectAttempted = useRef(false);

  const climateDisabled =
    plane !== "prime" || (plane === "prime" && terrain === "underground");
  const terrainDisabled = plane !== "prime";

  const xpSummary = useMemo(
    () =>
      result && result.groups.length > 0
        ? computeEncounterXp(result.groups, partyLevel, partySize)
        : null,
    [result, partyLevel, partySize],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      params.set("level", String(level));
      params.set("plane", plane);
      if (!climateDisabled) {
        params.set("climate", climate);
      }
      if (!terrainDisabled) {
        params.set("terrain", terrain);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [climate, climateDisabled, level, pathname, plane, router, terrain, terrainDisabled],
  );

  const runSelect = useCallback(
    (nextSeed: number, pool: MonsterCandidate[]) => {
      const rng = createSeededRng(nextSeed);
      const selectionInput: EncounterInput = {
        level,
        plane,
        climate,
        terrain,
        partySize,
        partyLevel,
      };
      startTransition(() => {
        setResult(generateEncounter(pool, selectionInput, rng));
        syncUrl(nextSeed);
      });
    },
    [climate, level, partyLevel, partySize, plane, syncUrl, terrain],
  );

  useEffect(() => {
    let cancelled = false;
    void loadEncounterMonsterCandidates()
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Could not load monsters from the compendium.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!candidates?.length) return;
    if (!autoSelectAttempted.current) {
      autoSelectAttempted.current = true;
    }
    runSelect(seed, candidates);
  }, [candidates, level, plane, climate, terrain, runSelect]);

  function handleSelect() {
    if (!candidates?.length) return;
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runSelect(nextSeed, candidates);
  }

  function handleClear() {
    setLevel(1);
    setPlane("prime");
    setClimate("temperate");
    setTerrain("plain");
    setPartySize(4);
    setPartyLevel(1);
    setSeed(1);
    setResult(null);
  }

  async function copyResult() {
    if (!result || !xpSummary) return;
    await navigator.clipboard.writeText(
      formatPlainText(result, xpSummary, formatEl(result.actualEl)),
    );
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  const actualElLabel = formatEl(result?.actualEl ?? null);

  return (
    <div className="encounter-gen">
      <div className="encounter-gen-form">
        <div className="encounter-gen-seed-row">
          <div className="tool-field encounter-gen-seed-field">
            <Label htmlFor="encounter-seed">Seed</Label>
            <input
              id="encounter-seed"
              type="number"
              className="tool-input"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() => candidates?.length && runSelect(seed, candidates)}
            disabled={!candidates?.length}
          >
            Use this seed
          </button>
        </div>

        <div className="encounter-gen-grid">
          <div className="tool-field">
            <Label htmlFor="encounter-level">Level (target EL)</Label>
            <input
              id="encounter-level"
              type="number"
              className="tool-input"
              min={1}
              max={20}
              value={level}
              onChange={(event) =>
                setLevel(clampInt(Number(event.target.value), 1, 20))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="encounter-plane">Plane</Label>
            <select
              id="encounter-plane"
              className="tool-input"
              value={plane}
              onChange={(event) =>
                setPlane(event.target.value as EncounterPlane)
              }
            >
              {PLANE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="encounter-climate">Climate</Label>
            <select
              id="encounter-climate"
              className="tool-input"
              value={climate}
              disabled={climateDisabled}
              onChange={(event) =>
                setClimate(event.target.value as EncounterClimate)
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
            <Label htmlFor="encounter-terrain">Terrain</Label>
            <select
              id="encounter-terrain"
              className="tool-input"
              value={terrain}
              disabled={terrainDisabled}
              onChange={(event) =>
                setTerrain(event.target.value as EncounterTerrain)
              }
            >
              {TERRAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="encounter-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleSelect}
            disabled={isPending || !candidates?.length}
          >
            Select
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

      {loadError ? <p className="encounter-gen-empty">{loadError}</p> : null}

      {result ? (
        <div className="encounter-gen-results">
          {result.emptyPool ? (
            <p className="encounter-gen-empty">
              No monsters in the compendium match this level and locale.
            </p>
          ) : (
            <>
              <div className="encounter-gen-results-toolbar">
                <h2 className="encounter-gen-heading">{result.description}</h2>
                <button
                  type="button"
                  className="tool-btn tool-btn-secondary"
                  onClick={() => void copyResult()}
                >
                  <Copy size={16} aria-hidden="true" />
                  Copy
                </button>
                {copyStatus ? (
                  <span className="encounter-gen-copy-status">{copyStatus}</span>
                ) : null}
              </div>

              <ul className="encounter-gen-groups">
                {result.groups.map((group) => (
                  <li key={`${group.slug}-${group.count}`}>
                    <span className="encounter-gen-group-count">{group.count}</span>
                    <Link href={`/monsters/${group.slug}`}>{group.name}</Link>
                    <span className="encounter-gen-secondary">
                      CR {group.cr}
                      {group.size ? ` · ${group.size}` : ""}
                      {group.creatureType ? ` · ${group.creatureType}` : ""}
                    </span>
                    {group.treasure ? (
                      <span className="encounter-gen-treasure">
                        Treasure: {group.treasure}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="encounter-gen-readouts">
                <p>
                  Actual EL: <strong>{actualElLabel}</strong>
                </p>
                <div className="encounter-gen-xp-grid">
                  <div className="tool-field">
                    <Label htmlFor="encounter-party-size">Party size</Label>
                    <input
                      id="encounter-party-size"
                      type="number"
                      className="tool-input"
                      min={1}
                      max={12}
                      value={partySize}
                      onChange={(event) =>
                        setPartySize(
                          clampInt(Number(event.target.value), 1, 12),
                        )
                      }
                    />
                  </div>
                  <div className="tool-field">
                    <Label htmlFor="encounter-party-level">Party level</Label>
                    <input
                      id="encounter-party-level"
                      type="number"
                      className="tool-input"
                      min={1}
                      max={20}
                      value={partyLevel}
                      onChange={(event) =>
                        setPartyLevel(
                          clampInt(Number(event.target.value), 1, 20),
                        )
                      }
                    />
                  </div>
                </div>
                {xpSummary ? (
                  <>
                    <p>
                      Total XP: <strong>{formatXp(xpSummary.totalXp)}</strong>
                    </p>
                    <p>
                      XP per PC:{" "}
                      <strong>{formatXp(xpSummary.xpPerPc)}</strong>
                    </p>
                    {xpSummary.lines.some((line) => line.xpNote) ? (
                      <p className="encounter-gen-secondary">
                        Some creatures award 0 XP at this party level.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
