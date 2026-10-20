"use client";

import { Copy, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import {
  DENSITY_LABELS,
  type DensityKey,
  formatInteger,
  generateKingdom,
  generateTown,
  PRIMARY_RACES,
  rollKingdomDefaults,
  rollTownPopulation,
  rollVillagePopulation,
  type PrimaryRace,
  type RacialMixMode,
} from "@/lib/demographics";

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="demographics-stat">
      <span className="demographics-stat-label">{label}</span>
      <span className="demographics-stat-value">{value}</span>
    </div>
  );
}

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function useDraftNumber(value: number, onCommit: (next: number) => void) {
  const [draft, setDraft] = useState(String(value));
  const fromField = useRef(false);

  useEffect(() => {
    if (fromField.current) {
      fromField.current = false;
      return;
    }
    setDraft(String(value));
  }, [value]);

  const commit = (next: number) => {
    if (next === value) return;
    fromField.current = true;
    onCommit(next);
  };

  return {
    value: draft,
    onBlur: () => {
      const parsed = Number.parseInt(draft, 10);
      const next = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      setDraft(String(next));
      commit(next);
    },
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw !== "" && !/^\d+$/.test(raw)) return;
      setDraft(raw);
      commit(raw === "" ? 0 : Number.parseInt(raw, 10));
    },
  };
}

const DENSITY_KEYS = Object.keys(DENSITY_LABELS) as DensityKey[];

const MIX_OPTIONS: { value: RacialMixMode; label: string }[] = [
  { value: "isolated", label: "Isolated" },
  { value: "mixed", label: "Mixed" },
  { value: "integrated", label: "Integrated" },
];

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function DemographicsCalculator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const parsedSeed = Number.isNaN(initialSeed) ? 1 : initialSeed;

  const [seed, setSeed] = useState(parsedSeed);
  const [seedDraft, setSeedDraft] = useState(String(parsedSeed));
  const [randomSalt, setRandomSalt] = useState(0);
  const [showEmptyTrades, setShowEmptyTrades] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [kingdomName, setKingdomName] = useState("");
  const [initialKingdomRoll] = useState(() =>
    rollKingdomDefaults(createSeededRng(parsedSeed)),
  );
  const [areaSqMi, setAreaSqMi] = useState(initialKingdomRoll.areaSqMi);
  const [density, setDensity] = useState<DensityKey>("average");
  const [ageYears, setAgeYears] = useState(initialKingdomRoll.ageYears);

  const [townName, setTownName] = useState("");
  const [townPopulation, setTownPopulation] = useState(8000);
  const [racialMix, setRacialMix] = useState<RacialMixMode>("mixed");
  const [primaryRace, setPrimaryRace] = useState<PrimaryRace>("Human");
  const [townPulse, setTownPulse] = useState(false);

  const townPopRef = useRef<HTMLInputElement>(null);
  const pulseTimer = useRef<number | null>(null);
  const areaField = useDraftNumber(areaSqMi, setAreaSqMi);
  const ageField = useDraftNumber(ageYears, setAgeYears);
  const townPopField = useDraftNumber(townPopulation, setTownPopulation);

  useEffect(() => {
    return () => {
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    };
  }, []);

  const syncSeedToUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const seedDraftValid = /^-?\d+$/.test(seedDraft.trim());

  const applySeed = useCallback(() => {
    const next = Number.parseInt(seedDraft, 10);
    if (Number.isNaN(next)) return;
    setSeed(next);
    syncSeedToUrl(next);
    const defaults = rollKingdomDefaults(createSeededRng(next));
    setAreaSqMi(defaults.areaSqMi);
    setAgeYears(defaults.ageYears);
    setRandomSalt(0);
  }, [seedDraft, syncSeedToUrl]);

  const setTownFromPreset = useCallback((next: number) => {
    setTownPopulation(Math.max(0, next));
    setTownPulse(true);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => {
      setTownPulse(false);
      pulseTimer.current = null;
    }, 900);
    townPopRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const kingdomResult = useMemo(() => {
    const rng = createSeededRng(seed);
    return generateKingdom(
      {
        name: kingdomName,
        areaSqMi: Math.max(0, areaSqMi),
        density,
        ageYears: Math.max(0, ageYears),
      },
      rng,
    );
  }, [seed, kingdomName, areaSqMi, density, ageYears]);

  const townResult = useMemo(() => {
    const rng = createSeededRng((seed + randomSalt * 9973) >>> 0);
    return generateTown(
      {
        name: townName,
        population: townPopulation,
        racialMix,
        primaryRace,
      },
      rng,
    );
  }, [seed, randomSalt, townName, townPopulation, racialMix, primaryRace]);

  const visibleBusinesses = useMemo(() => {
    if (showEmptyTrades) return townResult.businesses;
    return townResult.businesses.filter((row) => row.count > 0);
  }, [showEmptyTrades, townResult.businesses]);

  const classRows = townResult.classGrid;
  const levelColumns = useMemo(
    () => Array.from({ length: 20 }, (_, i) => i + 1),
    [],
  );

  const copySummary = useCallback(async () => {
    const lines = [
      kingdomName.trim() ? `${kingdomName.trim()}` : "Kingdom",
      `Population ${formatInteger(kingdomResult.population)}`,
      `Largest settlement ${formatInteger(kingdomResult.largestSettlementPop)} (${kingdomResult.largestSettlementLabel})`,
      "",
      townName.trim() ? `${townName.trim()}` : "Town",
      `${townResult.sizeLabel}, population ${formatInteger(townPopulation)}`,
      `gp limit ${formatInteger(townResult.gpLimit)}, ready cash ${formatInteger(townResult.readyCash)} gp`,
      townResult.racialMixText,
      ...townResult.powerCenters.map((c) => c.sentence),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  }, [kingdomName, kingdomResult, townName, townPopulation, townResult]);

  const rerollRandom = () => setRandomSalt((s) => s + 1);

  const rollTownPop = () => {
    const rng = createSeededRng((seed + randomSalt * 9973 + 17) >>> 0);
    setTownFromPreset(rollTownPopulation(rng));
  };

  const rollVillagePop = () => {
    const rng = createSeededRng((seed + randomSalt * 9973 + 31) >>> 0);
    setTownFromPreset(rollVillagePopulation(rng));
  };

  const mixTotal = townResult.racialLines.reduce(
    (sum, line) => sum + line.percent,
    0,
  );

  return (
    <div className="demographics">
      <div className="demographics-toolbar">
        <div className="demographics-seed-row">
          <div className="tool-field demographics-seed-field">
            <Label htmlFor="demographics-seed">Seed</Label>
            <input
              id="demographics-seed"
              className="tool-input"
              type="number"
              value={seedDraft}
              onChange={(e) => setSeedDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySeed();
              }}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={applySeed}
            disabled={!seedDraftValid}
          >
            Apply seed
          </button>
        </div>
        <p className="demographics-hint">
          Applying a seed rerolls kingdom area and age, and resets the town&apos;s
          random tables.
        </p>
      </div>

      <section className="demographics-card" aria-labelledby="demographics-kingdom-heading">
        <h2 id="demographics-kingdom-heading">
          Kingdom
          {kingdomName.trim() ? (
            <span className="demographics-card-name">{kingdomName.trim()}</span>
          ) : null}
        </h2>
        <div className="demographics-grid">
          <div className="tool-field">
            <Label htmlFor="demographics-kingdom-name">Kingdom name</Label>
            <input
              id="demographics-kingdom-name"
              className="tool-input"
              type="text"
              value={kingdomName}
              onChange={(e) => setKingdomName(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-area">Area (sq mi)</Label>
            <input
              id="demographics-area"
              className="tool-input"
              inputMode="numeric"
              min={0}
              value={areaField.value}
              onChange={areaField.onChange}
              onBlur={areaField.onBlur}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-density">Density</Label>
            <select
              id="demographics-density"
              className="tool-input"
              value={density}
              onChange={(e) => setDensity(e.target.value as DensityKey)}
            >
              {DENSITY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {DENSITY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-age">Age (years)</Label>
            <input
              id="demographics-age"
              className="tool-input"
              inputMode="numeric"
              min={0}
              value={ageField.value}
              onChange={ageField.onChange}
              onBlur={ageField.onBlur}
            />
          </div>
        </div>

        <div className="demographics-stats">
          <Stat
            label="Population"
            value={formatInteger(kingdomResult.population)}
          />
          <Stat
            label="Cultivated"
            value={`${formatPercent(kingdomResult.cultivatedFraction)} · ${formatInteger(kingdomResult.cultivatedSqMi)} sq mi`}
          />
          <Stat
            label="Wilderness"
            value={`${formatPercent(kingdomResult.wildernessFraction)} · ${formatInteger(kingdomResult.wildernessSqMi)} sq mi`}
          />
        </div>

        <div className="demographics-split">
          <div>
            <h3>Settlements</h3>
            <dl className="demographics-facts">
              <div>
                <dt>Largest</dt>
                <dd>
                  {formatInteger(kingdomResult.largestSettlementPop)}{" "}
                  <span className="demographics-muted">
                    {kingdomResult.largestSettlementLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Second</dt>
                <dd>{formatInteger(kingdomResult.secondSettlementPop)}</dd>
              </div>
              {kingdomResult.extraCityCount > 0 ? (
                <div>
                  <dt>More cities</dt>
                  <dd>{formatInteger(kingdomResult.extraCityCount)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="demographics-hint">{kingdomResult.townsOfNoteNote}</p>
          </div>
          <div>
            <h3>Castles</h3>
            <table className="demographics-castle-table">
              <thead>
                <tr>
                  <th scope="col">Condition</th>
                  <th scope="col">Total</th>
                  <th scope="col">Wilderness</th>
                  <th scope="col">Settled</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Active</th>
                  <td>{formatInteger(kingdomResult.castlesActive)}</td>
                  <td>{formatInteger(kingdomResult.castlesActiveWilderness)}</td>
                  <td>{formatInteger(kingdomResult.castlesActiveSettled)}</td>
                </tr>
                <tr>
                  <th scope="row">Ruined</th>
                  <td>{formatInteger(kingdomResult.castlesRuined)}</td>
                  <td>{formatInteger(kingdomResult.castlesRuinedWilderness)}</td>
                  <td>{formatInteger(kingdomResult.castlesRuinedSettled)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="demographics-bridge">
          <div>
            <h3>Set town population</h3>
            <p className="demographics-hint">
              These fill the town calculator. It is currently{" "}
              {formatInteger(townPopulation)} people.
            </p>
          </div>
          <div className="demographics-pop-buttons">
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              aria-pressed={townPopulation === kingdomResult.largestSettlementPop}
              onClick={() =>
                setTownFromPreset(kingdomResult.largestSettlementPop)
              }
            >
              Largest ({formatInteger(kingdomResult.largestSettlementPop)})
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              aria-pressed={townPopulation === 8000}
              onClick={() => setTownFromPreset(8000)}
            >
              City (8,000)
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              onClick={rollTownPop}
            >
              Random town
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              onClick={rollVillagePop}
            >
              Random village
            </button>
          </div>
        </div>
      </section>

      <section className="demographics-card" aria-labelledby="demographics-town-heading">
        <h2 id="demographics-town-heading">
          Town
          {townName.trim() ? (
            <span className="demographics-card-name">{townName.trim()}</span>
          ) : null}
        </h2>
        <div className="demographics-grid">
          <div className="tool-field">
            <Label htmlFor="demographics-town-name">Town name</Label>
            <input
              id="demographics-town-name"
              className="tool-input"
              type="text"
              value={townName}
              onChange={(e) => setTownName(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-town-pop">Population</Label>
            <input
              ref={townPopRef}
              id="demographics-town-pop"
              className={
                townPulse
                  ? "tool-input demographics-input-pulse"
                  : "tool-input"
              }
              inputMode="numeric"
              min={0}
              value={townPopField.value}
              onChange={townPopField.onChange}
              onBlur={townPopField.onBlur}
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-mix">Racial mix</Label>
            <select
              id="demographics-mix"
              className="tool-input"
              value={racialMix}
              onChange={(e) => setRacialMix(e.target.value as RacialMixMode)}
            >
              {MIX_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-primary-race">Primary race</Label>
            <select
              id="demographics-primary-race"
              className="tool-input"
              value={primaryRace}
              onChange={(e) => setPrimaryRace(e.target.value as PrimaryRace)}
              disabled={racialMix !== "isolated"}
              aria-describedby={
                racialMix === "isolated"
                  ? undefined
                  : "demographics-primary-race-hint"
              }
            >
              {PRIMARY_RACES.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
          </div>
        </div>
        {racialMix !== "isolated" ? (
          <p id="demographics-primary-race-hint" className="demographics-hint">
            Primary race applies to isolated communities. Mixed and integrated
            communities use a fixed racial order.
          </p>
        ) : null}

        <div className="demographics-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={rerollRandom}
          >
            <RefreshCw size={16} aria-hidden />
            Reroll tables
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={copySummary}
          >
            <Copy size={16} aria-hidden />
            Copy summary
          </button>
          <span className="demographics-copy-status" aria-live="polite">
            {copyStatus}
          </span>
        </div>
        <p className="demographics-hint">
          Reroll refreshes power centers, businesses, and class levels. Kingdom
          area and age stay until you apply a new seed.
        </p>

        <div className="demographics-results">
          <div className="demographics-stats">
            <Stat label="Population" value={formatInteger(townPopulation)} />
            <Stat
              label="Settlement"
              value={titleCase(townResult.communityLabel)}
            />
            <Stat label="DMG size" value={townResult.sizeLabel} />
            <Stat
              label="GP limit"
              value={`${formatInteger(townResult.gpLimit)} gp`}
            />
            <Stat
              label="Ready cash"
              value={`${formatInteger(townResult.readyCash)} gp`}
            />
          </div>
          <p className="demographics-hint">
            Settlement is village, town, or city by population. DMG size sets
            the gp limit and NPC modifiers.
          </p>

          <div className="demographics-subsection">
            <h3>Racial mix</h3>
            <div className="demographics-mix-bar" aria-hidden="true">
              {townResult.racialLines.map((line) => (
                <span
                  key={line.race}
                  style={{
                    width: `${mixTotal > 0 ? (line.percent / mixTotal) * 100 : 0}%`,
                  }}
                  title={`${line.percent}% ${line.label}`}
                />
              ))}
            </div>
            <p>{townResult.racialMixText}</p>
          </div>

          <div className="demographics-subsection">
            <h3>Power centers</h3>
            <ul className="demographics-list">
              {townResult.powerCenters.map((center, index) => (
                <li key={`${center.kind}-${index}`}>{center.sentence}</li>
              ))}
            </ul>
          </div>
          <div className="demographics-subsection">
            <h3>Staff</h3>
            <div className="demographics-stats demographics-stats--compact">
              <Stat label="Nobles" value={formatInteger(townResult.staff.nobles)} />
              <Stat label="Guards" value={formatInteger(townResult.staff.guards)} />
              <Stat
                label="Advocates"
                value={formatInteger(townResult.staff.advocates)}
              />
              <Stat label="Clergy" value={formatInteger(townResult.staff.clergy)} />
              <Stat label="Priests" value={formatInteger(townResult.staff.priests)} />
            </div>
          </div>
          <div className="demographics-subsection">
            <h3>Businesses</h3>
            {visibleBusinesses.length === 0 ? (
              <p className="demographics-hint">
                No businesses at this population.
              </p>
            ) : (
              <ul className="demographics-trades">
                {visibleBusinesses.map((row) => (
                  <li key={row.trade}>
                    <span>{row.trade}</span>
                    <strong>{formatInteger(row.count)}</strong>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="tool-btn tool-btn--ghost demographics-disclosure"
              onClick={() => setShowEmptyTrades((v) => !v)}
              aria-expanded={showEmptyTrades}
            >
              {showEmptyTrades ? "Hide empty trades" : "Show empty trades"}
            </button>
          </div>
          <div className="demographics-subsection">
            <h3>Classes by level</h3>
            {classRows.length === 0 ? (
              <p className="demographics-hint">No NPCs at this population.</p>
            ) : (
              <div className="demographics-table-wrap">
                <table className="demographics-class-table">
                  <caption className="sr-only">
                    NPC count for each class at levels 1 through 20
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Class</th>
                      {levelColumns.map((level) => (
                        <th key={level} scope="col">
                          {level}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map((row) => (
                      <tr key={row.className}>
                        <th scope="row">{row.className}</th>
                        {levelColumns.map((level) => {
                          const count = row.levels[level];
                          return (
                            <td
                              key={level}
                              className={
                                count
                                  ? "demographics-class-filled"
                                  : "demographics-class-empty"
                              }
                            >
                              {count ? formatInteger(count) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
