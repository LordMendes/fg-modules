"use client";

import Link from "next/link";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { DraftNumberInput } from "@/components/draft-number-input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_HOARD_ROW,
  DEFAULT_TREASURE_INPUT,
  generateTreasure,
  type CoinMode,
  type GoodsMode,
  type HoardRow,
  type TreasureInput,
  type TreasureResult,
} from "@/lib/treasure";

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

const COIN_OPTIONS: { value: CoinMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "tenth", label: "Tenth" },
  { value: "half", label: "Half" },
  { value: "standard", label: "Standard" },
  { value: "double", label: "Double" },
  { value: "triple", label: "Triple" },
];

const GOODS_OPTIONS: { value: GoodsMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "half-chance", label: "Half chance" },
  { value: "standard", label: "Standard" },
  { value: "double", label: "Double" },
  { value: "triple", label: "Triple" },
];

function formatPlainText(result: TreasureResult): string {
  return result.hoards
    .map((hoard) => {
      const lines = [
        `${hoard.title} (level ${hoard.level})`,
        `Coins: ${hoard.coins.display}`,
        `Total value: ${hoard.totalGp.toFixed(2)} gp`,
      ];
      for (const gem of hoard.gems) {
        lines.push(`Gem: ${gem.name} (${gem.valueDisplay}, avg ${gem.averageDisplay})`);
      }
      for (const art of hoard.art) {
        lines.push(`Art: ${art.name} (${art.valueDisplay}, avg ${art.averageDisplay})`);
      }
      for (const row of hoard.salvage) {
        lines.push(`Salvage: ${row.label} (${row.priceDisplay})`);
      }
      for (const item of hoard.items) {
        lines.push(`Item: ${item.label} (${item.priceDisplay})`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function TreasureGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const initialLevel = Number.parseInt(searchParams.get("level") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [rows, setRows] = useState<HoardRow[]>([
    { ...DEFAULT_HOARD_ROW, level: Number.isNaN(initialLevel) ? 1 : initialLevel },
  ]);
  const [moreRandomCoins, setMoreRandomCoins] = useState(
    DEFAULT_TREASURE_INPUT.moreRandomCoins,
  );
  const [salvagePercent, setSalvagePercent] = useState(
    DEFAULT_TREASURE_INPUT.salvagePercent,
  );
  const [gems, setGems] = useState(DEFAULT_TREASURE_INPUT.gems);
  const [art, setArt] = useState(DEFAULT_TREASURE_INPUT.art);
  const [magicTypes, setMagicTypes] = useState(DEFAULT_TREASURE_INPUT.magicTypes);
  const [ranks, setRanks] = useState(DEFAULT_TREASURE_INPUT.ranks);
  const [maxGp, setMaxGp] = useState<number | null>(DEFAULT_TREASURE_INPUT.maxGp);
  const [combine, setCombine] = useState(DEFAULT_TREASURE_INPUT.combine);
  const [result, setResult] = useState<TreasureResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const input = useMemo<TreasureInput>(
    () => ({
      rows,
      moreRandomCoins,
      salvagePercent,
      gems,
      art,
      magicTypes,
      ranks,
      maxGp,
      combine,
    }),
    [
      rows,
      moreRandomCoins,
      salvagePercent,
      gems,
      art,
      magicTypes,
      ranks,
      maxGp,
      combine,
    ],
  );

  const syncUrl = useCallback(
    (nextSeed: number, nextLevel: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      params.set("level", String(nextLevel));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateTreasure(input, rng));
        syncUrl(usedSeed, rows[0]?.level ?? 1);
      });
    },
    [input, rows, seed, syncUrl],
  );

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed);
  }

  useEffect(() => {
    runGenerate();
  }, []);

  function updateRow(index: number, patch: Partial<HoardRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => {
      if (current.length >= 12) return current;
      return [...current, { ...current[current.length - 1]! }];
    });
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  function clearForm() {
    setRows([{ ...DEFAULT_HOARD_ROW }]);
    setMoreRandomCoins(DEFAULT_TREASURE_INPUT.moreRandomCoins);
    setSalvagePercent(DEFAULT_TREASURE_INPUT.salvagePercent);
    setGems(DEFAULT_TREASURE_INPUT.gems);
    setArt(DEFAULT_TREASURE_INPUT.art);
    setMagicTypes(DEFAULT_TREASURE_INPUT.magicTypes);
    setRanks(DEFAULT_TREASURE_INPUT.ranks);
    setMaxGp(DEFAULT_TREASURE_INPUT.maxGp);
    setCombine(DEFAULT_TREASURE_INPUT.combine);
    setResult(null);
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatPlainText(result));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <div className="treasure-gen">
      <div className="treasure-gen-form">
        <div className="treasure-gen-seed-row">
          <div className="tool-field treasure-gen-seed-field">
            <Label htmlFor="treasure-seed">Seed</Label>
            <DraftNumberInput
              id="treasure-seed"
              className="tool-input"
              min={0}
              value={seed}
              onValueChange={setSeed}
            />
          </div>
        </div>

        <div className="treasure-gen-table-wrap">
          <table className="treasure-gen-table">
            <thead>
              <tr>
                <th>Count</th>
                <th>Level</th>
                <th>Coins</th>
                <th>Valuables</th>
                <th>Items</th>
                <th aria-label="Remove row" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <DraftNumberInput
                      aria-label={`Hoard ${index + 1} count`}
                      className="tool-input"
                      min={1}
                      max={20}
                      value={row.count}
                      onValueChange={(count) => updateRow(index, { count })}
                    />
                  </td>
                  <td>
                    <DraftNumberInput
                      aria-label={`Hoard ${index + 1} level`}
                      className="tool-input"
                      min={1}
                      max={20}
                      value={row.level}
                      onValueChange={(level) => updateRow(index, { level })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Hoard ${index + 1} coins`}
                      className="tool-input"
                      value={row.coins}
                      onChange={(event) =>
                        updateRow(index, { coins: event.target.value as CoinMode })
                      }
                    >
                      {COIN_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Hoard ${index + 1} valuables`}
                      className="tool-input"
                      value={row.valuables}
                      onChange={(event) =>
                        updateRow(index, {
                          valuables: event.target.value as GoodsMode,
                        })
                      }
                    >
                      {GOODS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Hoard ${index + 1} items`}
                      className="tool-input"
                      value={row.items}
                      onChange={(event) =>
                        updateRow(index, { items: event.target.value as GoodsMode })
                      }
                    >
                      {GOODS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="tool-btn tool-btn-secondary treasure-gen-remove"
                      aria-label={`Remove hoard row ${index + 1}`}
                      onClick={() => removeRow(index)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="tool-btn tool-btn-secondary"
          onClick={addRow}
          disabled={rows.length >= 12}
        >
          <Plus size={16} aria-hidden="true" /> Add hoard
        </button>

        <div className="treasure-gen-options">
          <label className="treasure-gen-check">
            <input
              type="checkbox"
              checked={moreRandomCoins}
              onChange={(event) => setMoreRandomCoins(event.target.checked)}
            />
            More random coin amounts
          </label>

          <div className="tool-field">
            <Label htmlFor="treasure-salvage">Trade coins for salvage</Label>
            <select
              id="treasure-salvage"
              className="tool-input"
              value={salvagePercent}
              onChange={(event) => setSalvagePercent(Number(event.target.value))}
            >
              {Array.from({ length: 11 }, (_, index) => index * 10).map((value) => (
                <option key={value} value={value}>
                  {value}%
                </option>
              ))}
            </select>
          </div>

          <label className="treasure-gen-check">
            <input
              type="checkbox"
              checked={gems}
              onChange={(event) => setGems(event.target.checked)}
            />
            Gems
          </label>
          <label className="treasure-gen-check">
            <input
              type="checkbox"
              checked={art}
              onChange={(event) => setArt(event.target.checked)}
            />
            Art objects
          </label>
          <label className="treasure-gen-check">
            <input
              type="checkbox"
              checked={combine}
              onChange={(event) => setCombine(event.target.checked)}
            />
            Combine hoards into one
          </label>

          <div className="tool-field">
            <Label htmlFor="treasure-max-gp">Maximum item value (gp)</Label>
            <input
              id="treasure-max-gp"
              type="number"
              className="tool-input"
              min={0}
              value={maxGp ?? ""}
              placeholder="No limit"
              onChange={(event) => {
                const raw = event.target.value.trim();
                setMaxGp(raw ? Number(raw) : null);
              }}
            />
          </div>
        </div>

        <div className="treasure-gen-magic-grid">
          {(Object.keys(magicTypes) as (keyof typeof magicTypes)[]).map((key) => (
            <label key={key} className="treasure-gen-check">
              <input
                type="checkbox"
                checked={magicTypes[key]}
                onChange={(event) =>
                  setMagicTypes((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
          {(Object.keys(ranks) as (keyof typeof ranks)[]).map((key) => (
            <label key={key} className="treasure-gen-check">
              <input
                type="checkbox"
                checked={ranks[key]}
                onChange={(event) =>
                  setRanks((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
              {key.charAt(0).toUpperCase() + key.slice(1)} rank
            </label>
          ))}
        </div>

        <div className="treasure-gen-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            Generate
          </button>
          <button type="button" className="tool-btn tool-btn-secondary" onClick={clearForm}>
            Clear
          </button>
        </div>
      </div>

      {result && (
        <div className="treasure-gen-results">
          <div className="treasure-gen-results-toolbar">
            <button type="button" className="tool-btn tool-btn-secondary" onClick={copyResult}>
              <Copy size={16} aria-hidden="true" /> Copy
            </button>
            {copyStatus ? <span className="treasure-gen-copy-status">{copyStatus}</span> : null}
          </div>
          {result.hoards.map((hoard, index) => (
            <article key={`${hoard.title}-${index}`} className="treasure-gen-card">
              <header className="treasure-gen-card-header">
                <h2>{hoard.title}</h2>
                <span>Level {hoard.level}</span>
              </header>
              <p>
                <strong>Coins:</strong> {hoard.coins.display}
              </p>
              <p>
                <strong>Total value:</strong> {hoard.totalGp.toFixed(2)} gp
              </p>
              {hoard.gems.length > 0 && (
                <ul className="treasure-gen-list">
                  {hoard.gems.map((gem, gemIndex) => (
                    <li key={`gem-${gemIndex}`}>
                      <span>{gem.name}</span>
                      <span className="treasure-gen-secondary">
                        {gem.valueDisplay} (avg {gem.averageDisplay})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {hoard.art.length > 0 && (
                <ul className="treasure-gen-list">
                  {hoard.art.map((piece, artIndex) => (
                    <li key={`art-${artIndex}`}>
                      <span>{piece.name}</span>
                      <span className="treasure-gen-secondary">
                        {piece.valueDisplay} (avg {piece.averageDisplay})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {hoard.salvage.length > 0 && (
                <ul className="treasure-gen-list">
                  {hoard.salvage.map((row, salvageIndex) => (
                    <li key={`salvage-${salvageIndex}`}>
                      <span>Salvage: {row.label}</span>
                      <span className="treasure-gen-secondary">{row.priceDisplay}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hoard.items.length > 0 && (
                <ul className="treasure-gen-list">
                  {hoard.items.map((item, itemIndex) => (
                    <li key={`item-${itemIndex}`}>
                      {item.href ?
                        <Link href={item.href}>{item.label}</Link>
                      : <span>{item.label}</span>}
                      <span className="treasure-gen-secondary">{item.priceDisplay}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
