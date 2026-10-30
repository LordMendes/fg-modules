"use client";

import { Download, Printer } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
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
  buildTreasureMapSvg,
  generateTreasureMap,
  TREASURE_MAP_VIEWBOX,
  type TreasureMapInput,
  type TreasureMapLayout,
  type TreasureMapMarkerCount,
  type TreasureMapResult,
} from "@/lib/treasure-map";

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

const MARKER_COUNT_OPTIONS: { value: TreasureMapMarkerCount; label: string }[] =
  [
    { value: "random", label: "Random" },
    { value: 4, label: "4" },
    { value: 5, label: "5" },
    { value: 6, label: "6" },
  ];

const LAYOUT_OPTIONS: { value: TreasureMapLayout; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "left-to-right", label: "Left to right" },
  { value: "top-to-bottom", label: "Top to bottom" },
  { value: "right-to-left", label: "Right to left" },
  { value: "bottom-to-top", label: "Bottom to top" },
];

function parseMarkerCount(raw: string | null): TreasureMapMarkerCount {
  if (raw === "4" || raw === "5" || raw === "6") return Number(raw) as 4 | 5 | 6;
  return "random";
}

function parseLayout(raw: string | null): TreasureMapLayout {
  if (
    raw === "left-to-right" ||
    raw === "top-to-bottom" ||
    raw === "right-to-left" ||
    raw === "bottom-to-top"
  ) {
    return raw;
  }
  return "random";
}

function hoardSymbolNode(
  x: number,
  y: number,
  hoardSymbol: TreasureMapResult["hoardSymbol"],
) {
  if (hoardSymbol === "cross") {
    const s = 14;
    return (
      <g stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
        <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} />
      </g>
    );
  }
  const points = [
    [x, y - 16],
    [x + 4, y - 4],
    [x + 16, y - 2],
    [x + 6, y + 6],
    [x + 10, y + 18],
    [x, y + 10],
    [x - 10, y + 18],
    [x - 6, y + 6],
    [x - 16, y - 2],
    [x - 4, y - 4],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
  return <polygon points={points} fill="currentColor" />;
}

export function TreasureMapTool() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [markerCount, setMarkerCount] = useState<TreasureMapMarkerCount>(
    parseMarkerCount(searchParams.get("count")),
  );
  const [layout, setLayout] = useState<TreasureMapLayout>(
    parseLayout(searchParams.get("layout")),
  );
  const [result, setResult] = useState<TreasureMapResult | null>(null);

  const input = useMemo<TreasureMapInput>(
    () => ({
      seed,
      markerCount,
      layout,
    }),
    [seed, markerCount, layout],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      params.set("count", String(markerCount));
      params.set("layout", layout);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [layout, markerCount, pathname, router],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateTreasureMap({ ...input, seed: usedSeed }, rng));
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
  }, []);

  function readMapColors() {
    return {
      paper: "#F6F0E2",
      ink: "#1C1612",
    };
  }

  function handleDownloadSvg() {
    if (!result) return;
    const svg = buildTreasureMapSvg(result, readMapColors());
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "treasure-map.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  const { width, height } = TREASURE_MAP_VIEWBOX;

  return (
    <div className="treasure-map">
      <div className="treasure-map-form treasure-map-print">
        <div className="treasure-map-seed-row">
          <div className="tool-field treasure-map-seed-field">
            <Label htmlFor="treasure-map-seed">Seed</Label>
            <DraftNumberInput
              id="treasure-map-seed"
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

        <div className="treasure-map-grid">
          <div className="tool-field">
            <Label htmlFor="treasure-map-count">Marker count</Label>
            <select
              id="treasure-map-count"
              className="tool-input"
              value={String(markerCount)}
              onChange={(event) =>
                setMarkerCount(parseMarkerCount(event.target.value))
              }
            >
              {MARKER_COUNT_OPTIONS.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="treasure-map-layout">Route direction</Label>
            <select
              id="treasure-map-layout"
              className="tool-input"
              value={layout}
              onChange={(event) =>
                setLayout(parseLayout(event.target.value))
              }
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="treasure-map-actions">
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
            <Download size={16} aria-hidden />
            Download SVG
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            disabled={!result}
            onClick={handlePrint}
          >
            <Printer size={16} aria-hidden />
            Print
          </button>
        </div>
      </div>

      {result ? (
        <div className="treasure-map-output">
          <svg
            className="treasure-map-svg"
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            role="img"
            aria-labelledby="treasure-map-live-title"
          >
            <title id="treasure-map-live-title">{result.title}</title>
            <rect width="100%" height="100%" className="treasure-map-sea" />
            <path
              d={result.coastPath}
              className="treasure-map-coast"
              stroke="currentColor"
              strokeWidth={2.5}
            />
            <polyline
              points={result.markers.map((m) => `${m.x},${m.y}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="10 8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {result.markers.map((marker) =>
              marker.isHoard ? (
                <g key={marker.index}>
                  {hoardSymbolNode(marker.x, marker.y, result.hoardSymbol)}
                </g>
              ) : (
                <g key={marker.index}>
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r={16}
                    className="treasure-map-paper"
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                  <text
                    x={marker.x}
                    y={marker.y + 5}
                    textAnchor="middle"
                    fontSize={14}
                    fontFamily="serif"
                    fill="currentColor"
                  >
                    {marker.index}
                  </text>
                </g>
              ),
            )}
            {result.markers.map((marker) => (
              <text
                key={`label-${marker.index}`}
                x={marker.x}
                y={marker.y + 34}
                textAnchor="middle"
                fontSize={13}
                fontFamily="serif"
                fill="currentColor"
              >
                {marker.name}
              </text>
            ))}
            <text
              x={width / 2}
              y={48}
              textAnchor="middle"
              fontSize={22}
              fontFamily="serif"
              fontWeight={600}
              fill="currentColor"
            >
              {result.title}
            </text>
          </svg>

          <ol className="treasure-map-clues">
            {result.markers.map((marker) => (
              <li key={marker.index}>{marker.clue}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
