"use client";

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
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  catalogSupportsLastName,
  catalogsForGroup,
  DEFAULT_CATALOG_ID,
  DEFAULT_MARKOV_ORDER,
  DEFAULT_NAME_COUNT,
  DEFAULT_NAME_SEED,
  generateNames,
  getNameCatalog,
  NAME_CATALOG_GROUPS,
  type NameCatalogGroup,
  type NameGeneratorMode,
  type NameGeneratorResult,
} from "@/lib/names";

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

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_NAME_COUNT;
  return Math.min(50, Math.max(1, Math.round(value)));
}

function parseMode(raw: string | null): NameGeneratorMode {
  return raw === "markov" ? "markov" : "builtin";
}

function parseGroup(raw: string | null): NameCatalogGroup {
  const allowed = NAME_CATALOG_GROUPS.map((group) => group.id);
  if (raw && allowed.includes(raw as NameCatalogGroup)) {
    return raw as NameCatalogGroup;
  }
  return "common";
}

export function NameGeneratorTool() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const mounted = useRef(false);

  const initialSeed = Number.parseInt(
    searchParams.get("seed") ?? String(DEFAULT_NAME_SEED),
    10,
  );
  const [seed, setSeed] = useState(
    Number.isNaN(initialSeed) ? DEFAULT_NAME_SEED : initialSeed,
  );
  const [mode, setMode] = useState<NameGeneratorMode>(
    parseMode(searchParams.get("mode")),
  );
  const [group, setGroup] = useState<NameCatalogGroup>(
    parseGroup(searchParams.get("group")),
  );
  const [catalogId, setCatalogId] = useState(
    searchParams.get("catalog") ?? DEFAULT_CATALOG_ID,
  );
  const [count, setCount] = useState(DEFAULT_NAME_COUNT);
  const [withLastName, setWithLastName] = useState(
    searchParams.get("surname") === "1",
  );
  const [sourceText, setSourceText] = useState("");
  const [order, setOrder] = useState<2 | 3>(DEFAULT_MARKOV_ORDER);
  const [result, setResult] = useState<NameGeneratorResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const catalogsInGroup = useMemo(
    () => catalogsForGroup(group),
    [group],
  );
  const selectedCatalog = useMemo(
    () => getNameCatalog(catalogId),
    [catalogId],
  );
  const lastNameAllowed =
    mode === "markov" ||
    (selectedCatalog != null && catalogSupportsLastName(selectedCatalog));
  const useLastName = withLastName && lastNameAllowed;

  useEffect(() => {
    if (!catalogsInGroup.some((entry) => entry.id === catalogId)) {
      setCatalogId(catalogsInGroup[0]?.id ?? DEFAULT_CATALOG_ID);
    }
  }, [catalogId, catalogsInGroup]);

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      params.set("mode", mode);
      if (mode === "builtin") {
        params.set("group", group);
        params.set("catalog", catalogId);
      }
      if (useLastName) params.set("surname", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [catalogId, group, mode, pathname, router, useLastName],
  );

  const runGenerate = useCallback(
    (nextSeed: number) => {
      startTransition(() => {
        const rng = createSeededRng(nextSeed);
        const nextResult =
          mode === "builtin"
            ? generateNames(
                {
                  mode: "builtin",
                  catalogId,
                  count: clampCount(count),
                  seed: nextSeed,
                  withLastName: useLastName,
                },
                rng,
              )
            : generateNames(
                {
                  mode: "markov",
                  sourceText,
                  order,
                  count: clampCount(count),
                  seed: nextSeed,
                  withLastName: useLastName,
                },
                rng,
              );
        setResult(nextResult);
        syncUrl(nextSeed);
      });
    },
    [catalogId, count, mode, order, sourceText, syncUrl, useLastName],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runGenerate(seed);
  }, [runGenerate, seed]);

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed);
  }

  function handleClear() {
    setSeed(DEFAULT_NAME_SEED);
    setMode("builtin");
    setGroup("common");
    setCatalogId(DEFAULT_CATALOG_ID);
    setCount(DEFAULT_NAME_COUNT);
    setWithLastName(false);
    setSourceText("");
    setOrder(DEFAULT_MARKOV_ORDER);
    setResult(null);
    setCopyStatus(null);
    syncUrl(DEFAULT_NAME_SEED);
  }

  async function copyAll() {
    if (!result?.names.length) return;
    await navigator.clipboard.writeText(result.names.join("\n"));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  async function copyName(name: string) {
    await navigator.clipboard.writeText(name);
    setCopyStatus(`Copied ${name}`);
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <div className="name-gen">
      <div className="name-gen-form">
        <div className="name-gen-mode" role="group" aria-label="Name source">
          <button
            type="button"
            className={`tool-btn tool-btn-secondary${mode === "builtin" ? " tool-btn--active" : ""}`}
            aria-pressed={mode === "builtin"}
            onClick={() => setMode("builtin")}
          >
            Built-in
          </button>
          <button
            type="button"
            className={`tool-btn tool-btn-secondary${mode === "markov" ? " tool-btn--active" : ""}`}
            aria-pressed={mode === "markov"}
            onClick={() => setMode("markov")}
          >
            From a list
          </button>
        </div>

        {mode === "builtin" ? (
          <div className="name-gen-grid">
            <div className="tool-field">
              <Label htmlFor="name-gen-group">Group</Label>
              <select
                id="name-gen-group"
                className="tool-input"
                value={group}
                onChange={(event) =>
                  setGroup(event.target.value as NameCatalogGroup)
                }
              >
                {NAME_CATALOG_GROUPS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="name-gen-catalog">Catalog</Label>
              <select
                id="name-gen-catalog"
                className="tool-input"
                value={catalogId}
                onChange={(event) => setCatalogId(event.target.value)}
              >
                {catalogsInGroup.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="tool-checkbox name-gen-surname">
              <input
                type="checkbox"
                checked={withLastName && lastNameAllowed}
                disabled={!lastNameAllowed}
                onChange={(event) => setWithLastName(event.target.checked)}
              />
              With last name
            </label>
          </div>
        ) : (
          <div className="name-gen-markov">
            <div className="tool-field">
              <Label htmlFor="name-gen-source">Source names</Label>
              <textarea
                id="name-gen-source"
                className="tool-input name-gen-textarea"
                rows={8}
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="name-gen-order">Order</Label>
              <select
                id="name-gen-order"
                className="tool-input"
                value={order}
                onChange={(event) =>
                  setOrder(Number(event.target.value) as 2 | 3)
                }
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <label className="tool-checkbox name-gen-surname">
              <input
                type="checkbox"
                checked={withLastName}
                onChange={(event) => setWithLastName(event.target.checked)}
              />
              With last name
            </label>
          </div>
        )}

        <div className="name-gen-grid">
          <div className="tool-field">
            <Label htmlFor="name-gen-count">Count</Label>
            <input
              id="name-gen-count"
              type="number"
              className="tool-input"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>
          <div className="tool-field name-gen-seed-field">
            <Label htmlFor="name-gen-seed">Seed</Label>
            <input
              id="name-gen-seed"
              type="number"
              className="tool-input"
              value={Number.isFinite(seed) ? seed : ""}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="name-gen-actions">
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
            onClick={() => runGenerate(seed)}
            disabled={isPending}
          >
            Use this seed
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="name-gen-results">
        <div className="name-gen-results-toolbar">
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={copyAll}
            disabled={!result?.names.length}
          >
            <Copy size={16} aria-hidden />
            Copy all
          </button>
          {copyStatus ? (
            <span className="name-gen-copy-status">{copyStatus}</span>
          ) : null}
        </div>

        {result?.error ? (
          <p className="name-gen-error" role="alert">
            {result.error}
          </p>
        ) : null}
        {result?.note ? (
          <p className="name-gen-note">{result.note}</p>
        ) : null}

        {result?.names.length ? (
          <ul className="name-gen-list">
            {result.names.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="name-gen-name"
                  onClick={() => copyName(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
