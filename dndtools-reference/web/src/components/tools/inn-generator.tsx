"use client";

import { Copy, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { advanceGeneratorSeed } from "@/lib/random-spellbook/seeded-rng";
import {
  generateInn,
  INN_PATRON_TYPES,
  INN_QUALITIES,
  PATRON_TYPE_LABELS,
  QUALITY_LABELS,
  rerollInnSection,
  type InnPatronType,
  type InnQuality,
  type InnResult,
  type InnSection,
} from "@/lib/inn";

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

type SectionBumps = Record<InnSection, number>;

function emptySectionBumps(): SectionBumps {
  return {
    name: 0,
    location: 0,
    description: 0,
    keeper: 0,
    menu: 0,
    patrons: 0,
    rumors: 0,
  };
}

function parseQuality(value: string | null): InnQuality {
  if (value && (INN_QUALITIES as readonly string[]).includes(value)) {
    return value as InnQuality;
  }
  return "common";
}

function parsePatrons(value: string | null): InnPatronType {
  if (value && (INN_PATRON_TYPES as readonly string[]).includes(value)) {
    return value as InnPatronType;
  }
  return "townsfolk";
}

function formatPlainText(result: InnResult): string {
  const lines = [
    result.name,
    result.location,
    result.description,
    result.keeper,
    "Menu:",
    ...result.dishes.map((row) => `  ${row.name}: ${row.price}`),
    "Drinks:",
    ...result.drinks.map((row) => `  ${row.name}: ${row.price}`),
    "Patrons:",
    ...result.patrons.map((line) => `  ${line}`),
    "Rumors:",
    ...result.rumors.map((rumor) =>
      rumor.unreliable ? `  ${rumor.text} (Unreliable)` : `  ${rumor.text}`,
    ),
  ];
  return lines.join("\n");
}

export function InnGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [quality, setQuality] = useState<InnQuality>(
    parseQuality(searchParams.get("quality")),
  );
  const [patrons, setPatrons] = useState<InnPatronType>(
    parsePatrons(searchParams.get("patrons")),
  );
  const [result, setResult] = useState<InnResult | null>(null);
  const [sectionBumps, setSectionBumps] = useState<SectionBumps>(emptySectionBumps);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const mounted = useRef(false);

  const baseInput = useMemo(
    () => ({ quality, patrons, seed }),
    [quality, patrons, seed],
  );

  const syncUrl = useCallback(
    (nextSeed: number, nextQuality: InnQuality, nextPatrons: InnPatronType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      params.set("quality", nextQuality);
      params.set("patrons", nextPatrons);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runFullGenerate = useCallback(
    (nextSeed: number, nextQuality: InnQuality, nextPatrons: InnPatronType) => {
      startTransition(() => {
        setSectionBumps(emptySectionBumps());
        setResult(
          generateInn({
            seed: nextSeed,
            quality: nextQuality,
            patrons: nextPatrons,
          }),
        );
        syncUrl(nextSeed, nextQuality, nextPatrons);
      });
    },
    [syncUrl],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runFullGenerate(seed, quality, patrons);
  }, [runFullGenerate, patrons, quality, seed]);

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runFullGenerate(nextSeed, quality, patrons);
  }

  function handleClear() {
    setSeed(1);
    setQuality("common");
    setPatrons("townsfolk");
    setResult(null);
    setSectionBumps(emptySectionBumps());
    setCopyStatus(null);
    syncUrl(1, "common", "townsfolk");
  }

  function handleUseSeed() {
    runFullGenerate(seed, quality, patrons);
  }

  function onQualityOrPatronsChange(
    nextQuality: InnQuality,
    nextPatrons: InnPatronType,
  ) {
    setQuality(nextQuality);
    setPatrons(nextPatrons);
    runFullGenerate(seed, nextQuality, nextPatrons);
  }

  function rerollSection(section: InnSection) {
    if (!result) return;
    const nextBump = sectionBumps[section] + 1;
    const nextBumps = { ...sectionBumps, [section]: nextBump };
    setSectionBumps(nextBumps);
    startTransition(() => {
      setResult((current) =>
        current
          ? rerollInnSection(section, baseInput, current, nextBump)
          : current,
      );
    });
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatPlainText(result));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <div className="inn-gen">
      <div className="inn-gen-form">
        <div className="inn-gen-seed-row">
          <div className="tool-field inn-gen-seed-field">
            <Label htmlFor="inn-gen-seed">Seed</Label>
            <input
              id="inn-gen-seed"
              type="number"
              className="tool-input"
              value={Number.isFinite(seed) ? seed : ""}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleUseSeed}
            disabled={isPending}
          >
            Use this seed
          </button>
        </div>

        <div className="inn-gen-fields">
          <div className="tool-field">
            <Label htmlFor="inn-gen-quality">Quality</Label>
            <select
              id="inn-gen-quality"
              className="tool-input"
              value={quality}
              onChange={(event) =>
                onQualityOrPatronsChange(
                  event.target.value as InnQuality,
                  patrons,
                )
              }
            >
              {INN_QUALITIES.map((value) => (
                <option key={value} value={value}>
                  {QUALITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="inn-gen-patrons">Crowd</Label>
            <select
              id="inn-gen-patrons"
              className="tool-input"
              value={patrons}
              onChange={(event) =>
                onQualityOrPatronsChange(
                  quality,
                  event.target.value as InnPatronType,
                )
              }
            >
              {INN_PATRON_TYPES.map((value) => (
                <option key={value} value={value}>
                  {PATRON_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inn-gen-actions">
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
            disabled={isPending}
          >
            Clear
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={copyResult}
            disabled={!result || isPending}
          >
            <Copy size={16} aria-hidden="true" />
            Copy
          </button>
          {copyStatus ? (
            <span className="inn-gen-copy-status">{copyStatus}</span>
          ) : null}
        </div>
      </div>

      {result ? (
        <div className="inn-gen-results">
          <div className="inn-gen-name-row">
            <button
              type="button"
              className="tool-btn tool-btn--ghost inn-gen-name-btn"
              onClick={() => rerollSection("name")}
              disabled={isPending}
            >
              {result.name}
            </button>
          </div>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Location</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("location")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{result.location}</p>
          </section>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Description</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("description")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{result.description}</p>
          </section>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Keeper</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("keeper")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{result.keeper}</p>
          </section>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Menu</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("menu")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <table className="inn-gen-menu-table">
              <thead>
                <tr>
                  <th scope="col">Dish</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {result.dishes.map((row) => (
                  <tr key={`dish-${row.name}-${row.price}`}>
                    <td>{row.name}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="inn-gen-drinks-heading">Drinks</h3>
            <table className="inn-gen-menu-table">
              <thead>
                <tr>
                  <th scope="col">Drink</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody>
                {result.drinks.map((row) => (
                  <tr key={`drink-${row.name}-${row.price}`}>
                    <td>{row.name}</td>
                    <td>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Patrons</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("patrons")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <ul className="inn-gen-list">
              {result.patrons.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="inn-gen-block">
            <header className="inn-gen-block-header">
              <h2>Rumors</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("rumors")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <ul className="inn-gen-list">
              {result.rumors.map((rumor) => (
                <li key={rumor.text}>
                  {rumor.text}
                  {rumor.unreliable ? (
                    <span className="inn-gen-unreliable"> Unreliable</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
