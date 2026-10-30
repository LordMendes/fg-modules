"use client";

import { Download } from "lucide-react";
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
  DEFAULT_WORLD_INPUT,
  generateWorld,
  type WorldCities,
  type WorldInput,
  type WorldResult,
  type WorldRivers,
  type WorldStyle,
} from "@/lib/world";

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

function clampInt(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const STYLE_OPTIONS: { value: WorldStyle; label: string }[] = [
  { value: "atlas", label: "Atlas" },
  { value: "antique", label: "Antique" },
];

const RIVER_OPTIONS: { value: WorldRivers; label: string }[] = [
  { value: "none", label: "None" },
  { value: "yes", label: "Yes" },
  { value: "many", label: "Many" },
];

const CITY_OPTIONS: { value: WorldCities; label: string }[] = [
  { value: "none", label: "None" },
  { value: "yes", label: "Yes" },
  { value: "many", label: "Many" },
];

const LEGEND_SWATCHES = [
  { className: "world-gen-sea", label: "Sea" },
  { className: "world-gen-lowland", label: "Land" },
  { className: "world-gen-mountain", label: "Mountain" },
  { className: "world-gen-ice", label: "Ice" },
  { className: "world-gen-capital world-gen-legend-capital", label: "Capital" },
  { className: "world-gen-city world-gen-legend-city", label: "City" },
  { className: "world-gen-ruin world-gen-legend-ruin", label: "Ruin" },
] as const;

function parseStyle(raw: string | null): WorldStyle {
  return raw === "antique" ? "antique" : "atlas";
}

function parseRivers(raw: string | null): WorldRivers {
  if (raw === "none" || raw === "many") return raw;
  return "yes";
}

function parseCities(raw: string | null): WorldCities {
  if (raw === "none" || raw === "many") return raw;
  return "yes";
}

function parseBool(raw: string | null, defaultValue: boolean): boolean {
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return defaultValue;
}

function cssRulesForDownload(container: HTMLElement): string {
  const selectors = [
    ".world-gen-paper",
    ".world-gen-sea",
    ".world-gen-lowland",
    ".world-gen-mountain",
    ".world-gen-ice",
    ".world-gen-river-fill",
    ".world-gen-river-line",
    ".world-gen-coast",
    ".world-gen-grid",
    ".world-gen-mountain-mark",
    ".world-gen-city",
    ".world-gen-ruin",
    ".world-gen-capital",
    ".world-gen-title",
    ".world-gen-label-capital",
    ".world-gen-label-city",
  ];
  const rules: string[] = [];
  for (const selector of selectors) {
    const probe = container.querySelector(selector);
    if (!probe) continue;
    const style = getComputedStyle(probe);
    const fill = style.fill;
    const stroke = style.stroke;
    const strokeWidth = style.strokeWidth;
    const opacity = style.opacity;
    const parts: string[] = [];
    if (fill && fill !== "none") parts.push(`fill:${fill}`);
    if (stroke && stroke !== "none") parts.push(`stroke:${stroke}`);
    if (strokeWidth) parts.push(`stroke-width:${strokeWidth}`);
    if (opacity && opacity !== "1") parts.push(`opacity:${opacity}`);
    if (parts.length) rules.push(`${selector}{${parts.join(";")}}`);
  }
  return rules.join("");
}

function svgWithInlineStyles(svg: string, container: HTMLElement): string {
  const css = cssRulesForDownload(container);
  if (!css) return svg;
  const withStyle = svg.replace(
    "<svg ",
    `<svg xmlns="http://www.w3.org/2000/svg" `,
  );
  const close = withStyle.indexOf(">");
  if (close === -1) return withStyle;
  return (
    withStyle.slice(0, close + 1) +
    `<style>${css}</style>` +
    withStyle.slice(close + 1)
  );
}

export function WorldGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [water, setWater] = useState(
    clampInt(
      Number.parseInt(searchParams.get("water") ?? "", 10),
      10,
      90,
      DEFAULT_WORLD_INPUT.water,
    ),
  );
  const [ice, setIce] = useState(
    clampInt(
      Number.parseInt(searchParams.get("ice") ?? "", 10),
      0,
      40,
      DEFAULT_WORLD_INPUT.ice,
    ),
  );
  const [style, setStyle] = useState<WorldStyle>(
    parseStyle(searchParams.get("style")),
  );
  const [geography, setGeography] = useState(
    parseBool(searchParams.get("geo"), DEFAULT_WORLD_INPUT.geography),
  );
  const [rivers, setRivers] = useState<WorldRivers>(
    parseRivers(searchParams.get("rivers")),
  );
  const [cities, setCities] = useState<WorldCities>(
    parseCities(searchParams.get("cities")),
  );
  const [hexGrid, setHexGrid] = useState(
    parseBool(searchParams.get("hex"), DEFAULT_WORLD_INPUT.hexGrid),
  );
  const [labels, setLabels] = useState(
    parseBool(searchParams.get("labels"), DEFAULT_WORLD_INPUT.labels),
  );
  const [result, setResult] = useState<WorldResult | null>(null);

  const input = useMemo<WorldInput>(
    () => ({
      name,
      water,
      ice,
      style,
      geography,
      rivers,
      cities,
      hexGrid,
      labels,
    }),
    [name, water, ice, style, geography, rivers, cities, hexGrid, labels],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      if (name.trim()) params.set("name", name.trim());
      params.set("water", String(water));
      params.set("ice", String(ice));
      params.set("style", style);
      params.set("geo", geography ? "1" : "0");
      params.set("rivers", rivers);
      params.set("cities", cities);
      params.set("hex", hexGrid ? "1" : "0");
      params.set("labels", labels ? "1" : "0");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [
      cities,
      geography,
      hexGrid,
      ice,
      labels,
      name,
      pathname,
      rivers,
      router,
      style,
      water,
    ],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateWorld(input, rng, usedSeed));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  function handleDownload() {
    if (!result || !rootRef.current) return;
    const svg = svgWithInlineStyles(result.svg, rootRef.current);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = (result.name || "world")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    anchor.href = url;
    anchor.download = `${safeName || "world"}-map.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      ref={rootRef}
      className="world-gen"
      data-style={style}
    >
      <div className="world-gen-form">
        <div className="tool-field">
          <Label htmlFor="world-name">World name</Label>
          <input
            id="world-name"
            type="text"
            className="tool-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="world-gen-seed-row">
          <div className="tool-field world-gen-seed-field">
            <Label htmlFor="world-seed">Seed</Label>
            <DraftNumberInput
              id="world-seed"
              className="tool-input"
              min={0}
              value={seed}
              onValueChange={setSeed}
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

        <div className="world-gen-fields">
          <div className="tool-field">
            <Label htmlFor="world-water">Water percent</Label>
            <DraftNumberInput
              id="world-water"
              className="tool-input"
              min={10}
              max={90}
              value={water}
              onValueChange={(next) =>
                setWater(clampInt(next, 10, 90, DEFAULT_WORLD_INPUT.water))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="world-ice">Ice percent</Label>
            <DraftNumberInput
              id="world-ice"
              className="tool-input"
              min={0}
              max={40}
              value={ice}
              onValueChange={(next) =>
                setIce(clampInt(next, 0, 40, DEFAULT_WORLD_INPUT.ice))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="world-style">Style</Label>
            <select
              id="world-style"
              className="tool-input"
              value={style}
              onChange={(event) =>
                setStyle(event.target.value as WorldStyle)
              }
            >
              {STYLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="world-rivers">Rivers</Label>
            <select
              id="world-rivers"
              className="tool-input"
              value={rivers}
              onChange={(event) =>
                setRivers(event.target.value as WorldRivers)
              }
            >
              {RIVER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="world-cities">Cities</Label>
            <select
              id="world-cities"
              className="tool-input"
              value={cities}
              onChange={(event) =>
                setCities(event.target.value as WorldCities)
              }
            >
              {CITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="world-gen-toggles">
          <label className="world-gen-check">
            <input
              type="checkbox"
              checked={geography}
              onChange={(event) => setGeography(event.target.checked)}
            />
            <span>Geography icons</span>
          </label>
          <label className="world-gen-check">
            <input
              type="checkbox"
              checked={hexGrid}
              onChange={(event) => setHexGrid(event.target.checked)}
            />
            <span>Hex grid</span>
          </label>
          <label className="world-gen-check">
            <input
              type="checkbox"
              checked={labels}
              onChange={(event) => setLabels(event.target.checked)}
            />
            <span>Labels</span>
          </label>
        </div>

        <div className="world-gen-actions">
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
            onClick={handleDownload}
          >
            <Download size={16} aria-hidden />
            Download SVG
          </button>
        </div>
      </div>

      {result ? (
        <div className="world-gen-results">
          <div
            className="world-gen-map-wrap"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
          <ul className="world-gen-legend" aria-label="Map legend">
            {LEGEND_SWATCHES.map((item) => (
              <li key={item.label}>
                <span
                  className={`world-gen-legend-swatch ${item.className}`}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
