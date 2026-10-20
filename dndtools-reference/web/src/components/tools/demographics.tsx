"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
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

  const syncSeedToUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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
    setTownPopulation(rollTownPopulation(rng));
  };

  const rollVillagePop = () => {
    const rng = createSeededRng((seed + randomSalt * 9973 + 31) >>> 0);
    setTownPopulation(rollVillagePopulation(rng));
  };

  return (
    <div className="demographics">
      <div className="demographics-seed-row">
        <div className="tool-field demographics-seed-field">
          <Label htmlFor="demographics-seed">Seed</Label>
          <input
            id="demographics-seed"
            className="tool-input"
            type="number"
            value={seedDraft}
            onChange={(e) => setSeedDraft(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="tool-btn tool-btn-secondary"
          onClick={applySeed}
        >
          Use this seed
        </button>
      </div>

      <section className="demographics-card" aria-labelledby="demographics-kingdom-heading">
        <h2 id="demographics-kingdom-heading">Kingdom</h2>
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
            <Label htmlFor="demographics-area">Area (square miles)</Label>
            <input
              id="demographics-area"
              className="tool-input"
              type="number"
              min={0}
              value={areaSqMi}
              onChange={(e) =>
                setAreaSqMi(Number.parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="demographics-density">Density (people per square mile)</Label>
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
              type="number"
              min={0}
              value={ageYears}
              onChange={(e) =>
                setAgeYears(Number.parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
        </div>

        <div className="demographics-results">
          <p className="demographics-lead">
            Population{" "}
            <strong>{formatInteger(kingdomResult.population)}</strong>. Cultivated
            land {formatPercent(kingdomResult.cultivatedFraction)} (
            {formatInteger(kingdomResult.cultivatedSqMi)} sq mi), wilderness{" "}
            {formatPercent(kingdomResult.wildernessFraction)} (
            {formatInteger(kingdomResult.wildernessSqMi)} sq mi).
          </p>
          <p>
            Largest settlement:{" "}
            <button
              type="button"
              className="demographics-link-btn"
              onClick={() =>
                setTownPopulation(kingdomResult.largestSettlementPop)
              }
            >
              {formatInteger(kingdomResult.largestSettlementPop)}
            </button>{" "}
            ({kingdomResult.largestSettlementLabel}). Second settlement{" "}
            {formatInteger(kingdomResult.secondSettlementPop)}.
            {kingdomResult.extraCityCount > 0
              ? ` ${kingdomResult.extraCityCount} additional cities.`
              : null}{" "}
            {kingdomResult.townsOfNoteNote}
          </p>
          <p>
            Castles: {formatInteger(kingdomResult.castlesActive)} active (
            {formatInteger(kingdomResult.castlesActiveWilderness)} wilderness,{" "}
            {formatInteger(kingdomResult.castlesActiveSettled)} settled),{" "}
            {formatInteger(kingdomResult.castlesRuined)} ruined (
            {formatInteger(kingdomResult.castlesRuinedWilderness)} wilderness,{" "}
            {formatInteger(kingdomResult.castlesRuinedSettled)} settled).
          </p>
        </div>

        <div className="demographics-pop-actions">
          <span className="demographics-pop-label">Town population presets</span>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() =>
              setTownPopulation(kingdomResult.largestSettlementPop)
            }
          >
            Largest settlement
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() => setTownPopulation(8000)}
          >
            City (8000)
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={rollTownPop}
          >
            Random town
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={rollVillagePop}
          >
            Random village
          </button>
        </div>
      </section>

      <section className="demographics-card" aria-labelledby="demographics-town-heading">
        <h2 id="demographics-town-heading">Town</h2>
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
              id="demographics-town-pop"
              className="tool-input"
              type="number"
              min={0}
              value={townPopulation}
              onChange={(e) =>
                setTownPopulation(Number.parseInt(e.target.value, 10) || 0)
              }
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
            >
              {PRIMARY_RACES.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="demographics-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={rerollRandom}
          >
            <RefreshCw size={16} aria-hidden />
            Reroll
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={copySummary}
          >
            <Copy size={16} aria-hidden />
            Copy
          </button>
          {copyStatus ? (
            <span className="demographics-copy-status">{copyStatus}</span>
          ) : null}
        </div>

        <div className="demographics-results">
          <p className="demographics-lead">
            A {townResult.communityLabel} of {formatInteger(townPopulation)} people
            ({townResult.sizeLabel}). Community gp limit{" "}
            {formatInteger(townResult.gpLimit)} gp; estimated ready cash{" "}
            {formatInteger(townResult.readyCash)} gp.
          </p>
          <p>{townResult.racialMixText}</p>
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
            <p>
              Nobles {formatInteger(townResult.staff.nobles)}, guards{" "}
              {formatInteger(townResult.staff.guards)}, advocates{" "}
              {formatInteger(townResult.staff.advocates)}, clergy{" "}
              {formatInteger(townResult.staff.clergy)}, priests{" "}
              {formatInteger(townResult.staff.priests)}.
            </p>
          </div>
          <div className="demographics-subsection">
            <h3>Businesses</h3>
            <table className="demographics-table">
              <thead>
                <tr>
                  <th scope="col">Trade</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {visibleBusinesses.map((row) => (
                  <tr key={row.trade}>
                    <td>{row.trade}</td>
                    <td>{formatInteger(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="tool-btn tool-btn--ghost demographics-disclosure"
              onClick={() => setShowEmptyTrades((v) => !v)}
              aria-expanded={showEmptyTrades}
            >
              {showEmptyTrades ? "Hide empty trades" : "Show empty trades"}
            </button>
          </div>
          {classRows.length > 0 ? (
            <div className="demographics-subsection">
              <h3>Classes by level</h3>
              <div className="demographics-table-wrap">
                <table className="demographics-class-table">
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
                                count ? undefined : "demographics-class-empty"
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
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
