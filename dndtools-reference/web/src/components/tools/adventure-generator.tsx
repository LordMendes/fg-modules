"use client";

import { Copy } from "lucide-react";
import {
  useCallback,
  useEffect,
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
  ADVENTURE_SECTION_DEFS,
  formatAdventurePlainText,
  generateAdventure,
  rerollAdventureSection,
  type AdventureResult,
} from "@/lib/adventure";

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

function parseSeed(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

export function AdventureGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const mounted = useRef(false);

  const [seed, setSeed] = useState(parseSeed(searchParams.get("seed")));
  const [result, setResult] = useState<AdventureResult | null>(null);
  const [sectionBumps, setSectionBumps] = useState<number[]>(() =>
    ADVENTURE_SECTION_DEFS.map(() => 0),
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const runGenerateAll = useCallback(
    (nextSeed: number) => {
      startTransition(() => {
        const rng = createSeededRng(nextSeed);
        const nextResult = generateAdventure({ seed: nextSeed }, rng);
        setResult(nextResult);
        setSectionBumps(ADVENTURE_SECTION_DEFS.map(() => 0));
        syncUrl(nextSeed);
      });
    },
    [syncUrl],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runGenerateAll(seed);
  }, [runGenerateAll, seed]);

  function handleUseSeed() {
    runGenerateAll(seed);
  }

  function handleGenerateAll() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerateAll(nextSeed);
  }

  function handleRerollSection(sectionIndex: number) {
    if (!result) return;
    startTransition(() => {
      const { result: nextResult, bumps } = rerollAdventureSection(
        { seed },
        result,
        sectionIndex,
        sectionBumps,
      );
      setResult(nextResult);
      setSectionBumps(bumps);
    });
  }

  async function handleCopyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatAdventurePlainText(result));
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <div className="adventure-gen">
      <div className="adventure-gen-controls">
        <div className="adventure-gen-seed-row">
          <div className="tool-field adventure-gen-seed-field">
            <Label htmlFor="adventure-gen-seed">Seed</Label>
            <input
              id="adventure-gen-seed"
              className="tool-input"
              type="number"
              inputMode="numeric"
              value={seed}
              onChange={(event) =>
                setSeed(parseSeed(event.target.value.trim() || "1"))
              }
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
        <div className="adventure-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleGenerateAll}
            disabled={isPending}
          >
            Generate all
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleCopyAll}
            disabled={!result || isPending}
          >
            <Copy size={16} aria-hidden="true" />
            Copy
          </button>
          {copyStatus ? (
            <span className="adventure-gen-copy-status">{copyStatus}</span>
          ) : null}
        </div>
      </div>

      {result ? (
        <ol className="adventure-gen-list">
          {result.sections.map((section, index) => (
            <li key={section.id} className="adventure-gen-row">
              <button
                type="button"
                className="tool-btn tool-btn--ghost adventure-gen-title"
                onClick={() => handleRerollSection(index)}
                disabled={isPending}
              >
                {section.title}
              </button>
              <p className="adventure-gen-body">{section.text}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
