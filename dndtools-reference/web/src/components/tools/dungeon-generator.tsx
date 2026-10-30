"use client";

import { Copy, Download, Printer } from "lucide-react";
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
  buildDungeonSvg,
  DEFAULT_DUNGEON_INPUT,
  DUNGEON_LEGEND_ITEMS,
  formatDungeonKeyPlain,
  generateDungeon,
  resolveDimensions,
  type DungeonCorridors,
  type DungeonDeadends,
  type DungeonDoors,
  type DungeonDraft,
  type DungeonEgress,
  type DungeonGrid,
  type DungeonInput,
  type DungeonLayout,
  type DungeonMotif,
  type DungeonPolymorph,
  type DungeonRoomLayout,
  type DungeonRoomSize,
  type DungeonSize,
  type DungeonStairs,
} from "@/lib/dungeon";
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

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const MOTIF_OPTIONS: { value: DungeonMotif; label: string }[] = [
  { value: "", label: "None" },
  { value: "abandoned", label: "Abandoned" },
  { value: "aberrant", label: "Aberrant" },
  { value: "giant", label: "Giant" },
  { value: "undead", label: "Undead" },
  { value: "vermin", label: "Vermin" },
  { value: "aquatic", label: "Aquatic" },
  { value: "desert", label: "Desert" },
  { value: "underdark", label: "Underdark" },
  { value: "arcane", label: "Arcane" },
  { value: "fire", label: "Fire" },
  { value: "cold", label: "Cold" },
  { value: "abyssal", label: "Abyssal" },
  { value: "infernal", label: "Infernal" },
];

const SIZE_OPTIONS: { value: DungeonSize; label: string }[] = [
  { value: "fine", label: "Fine" },
  { value: "diminutive", label: "Diminutive" },
  { value: "tiny", label: "Tiny" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
  { value: "gargantuan", label: "Gargantuan" },
  { value: "colossal", label: "Colossal" },
  { value: "custom", label: "Custom" },
];

const LAYOUT_OPTIONS: { value: DungeonLayout; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rectangle", label: "Rectangle" },
  { value: "box", label: "Box" },
  { value: "cross", label: "Cross" },
  { value: "dagger", label: "Dagger" },
  { value: "saltire", label: "Saltire" },
  { value: "keep", label: "Keep" },
  { value: "hexagon", label: "Hexagon" },
  { value: "round", label: "Round" },
  { value: "cavernous", label: "Cavernous" },
];

function pickOption<T extends string>(
  options: { value: T }[],
  rng: ReturnType<typeof createSeededRng>,
): T {
  return rng.pick(options)?.value ?? options[0]!.value;
}

export function DungeonGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const initialLevel = Number.parseInt(searchParams.get("level") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(
    clampInt(Number.isNaN(initialLevel) ? 1 : initialLevel, 1, 20),
  );
  const [partySize, setPartySize] = useState(DEFAULT_DUNGEON_INPUT.partySize);
  const [motif, setMotif] = useState<DungeonMotif>(DEFAULT_DUNGEON_INPUT.motif);
  const [size, setSize] = useState<DungeonSize>(DEFAULT_DUNGEON_INPUT.size);
  const [cols, setCols] = useState(DEFAULT_DUNGEON_INPUT.cols);
  const [rows, setRows] = useState(DEFAULT_DUNGEON_INPUT.rows);
  const [layout, setLayout] = useState<DungeonLayout>(DEFAULT_DUNGEON_INPUT.layout);
  const [egress, setEgress] = useState<DungeonEgress>(DEFAULT_DUNGEON_INPUT.egress);
  const [roomLayout, setRoomLayout] = useState<DungeonRoomLayout>(
    DEFAULT_DUNGEON_INPUT.roomLayout,
  );
  const [roomSize, setRoomSize] = useState<DungeonRoomSize>(
    DEFAULT_DUNGEON_INPUT.roomSize,
  );
  const [polymorph, setPolymorph] = useState<DungeonPolymorph>(
    DEFAULT_DUNGEON_INPUT.polymorph,
  );
  const [doors, setDoors] = useState<DungeonDoors>(DEFAULT_DUNGEON_INPUT.doors);
  const [corridors, setCorridors] = useState<DungeonCorridors>(
    DEFAULT_DUNGEON_INPUT.corridors,
  );
  const [deadends, setDeadends] = useState<DungeonDeadends>(
    DEFAULT_DUNGEON_INPUT.deadends,
  );
  const [stairs, setStairs] = useState<DungeonStairs>(DEFAULT_DUNGEON_INPUT.stairs);
  const [grid, setGrid] = useState<DungeonGrid>(DEFAULT_DUNGEON_INPUT.grid);
  const [result, setResult] = useState<DungeonDraft | null>(null);
  const [playerMap, setPlayerMap] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const cavernous = layout === "cavernous";

  const input = useMemo<DungeonInput>(
    () => ({
      seed,
      name,
      level: clampInt(level, 1, 20),
      partySize: clampInt(partySize, 1, 12),
      motif,
      size,
      cols: clampInt(cols, 20, 120),
      rows: clampInt(rows, 20, 120),
      layout,
      egress,
      roomLayout,
      roomSize,
      polymorph,
      doors,
      corridors,
      deadends,
      stairs,
      grid,
    }),
    [
      cols,
      corridors,
      deadends,
      doors,
      egress,
      grid,
      layout,
      level,
      motif,
      name,
      partySize,
      polymorph,
      roomLayout,
      roomSize,
      rows,
      seed,
      size,
      stairs,
    ],
  );

  const dims = useMemo(() => resolveDimensions(input), [input]);

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("level", String(clampInt(level, 1, 20)));
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [level, pathname, router],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(() => {
        const rng = createSeededRng(usedSeed);
        setResult(generateDungeon({ ...input, seed: usedSeed }, rng));
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

  function handleRandomize() {
    const rng = createSeededRng(Date.now() % 2147483647);
    const nextSeed = rng.pickInt(1, 999_999);
    const nextMotif = pickOption(MOTIF_OPTIONS, rng);
    const nextSize = pickOption(SIZE_OPTIONS, rng);
    const nextLayout = pickOption(LAYOUT_OPTIONS, rng);
    const nextEgress = pickOption(
      [
        { value: "none" as const },
        { value: "yes" as const },
        { value: "many" as const },
        { value: "tiling" as const },
      ],
      rng,
    );
    const nextRoomLayout = pickOption(
        [
          { value: "sparse" as const },
          { value: "scattered" as const },
          { value: "dense" as const },
          { value: "symmetric" as const },
        ],
        rng,
    );
    const nextRoomSize = pickOption(
        [
          { value: "small" as const },
          { value: "medium" as const },
          { value: "large" as const },
          { value: "huge" as const },
          { value: "gargantuan" as const },
          { value: "colossal" as const },
        ],
        rng,
    );
    const nextPolymorph = pickOption(
        [
          { value: "none" as const },
          { value: "yes" as const },
          { value: "many" as const },
        ],
        rng,
    );
    const nextDoors = pickOption(
        [
          { value: "none" as const },
          { value: "basic" as const },
          { value: "secure" as const },
          { value: "standard" as const },
          { value: "deathtrap" as const },
        ],
        rng,
    );
    const nextCorridors = pickOption(
        [
          { value: "labyrinth" as const },
          { value: "errant" as const },
          { value: "straight" as const },
        ],
        rng,
    );
    const nextDeadends = pickOption(
        [
          { value: "none" as const },
          { value: "some" as const },
          { value: "all" as const },
        ],
        rng,
    );
    const nextStairs = pickOption(
        [
          { value: "none" as const },
          { value: "yes" as const },
          { value: "many" as const },
        ],
        rng,
    );
    const nextGrid = pickOption(
        [
          { value: "none" as const },
          { value: "square" as const },
          { value: "hex" as const },
          { value: "verthex" as const },
        ],
        rng,
    );
    const nextPartySize = rng.pickInt(1, 12);
    const nextCols = nextSize === "custom" ? rng.pickInt(20, 120) : cols;
    const nextRows = nextSize === "custom" ? rng.pickInt(20, 120) : rows;
    setSeed(nextSeed);
    setMotif(nextMotif);
    setSize(nextSize);
    setLayout(nextLayout);
    setEgress(nextEgress);
    setRoomLayout(nextRoomLayout);
    setRoomSize(nextRoomSize);
    setPolymorph(nextPolymorph);
    setDoors(nextDoors);
    setCorridors(nextCorridors);
    setDeadends(nextDeadends);
    setStairs(nextStairs);
    setGrid(nextGrid);
    setPartySize(nextPartySize);
    setCols(nextCols);
    setRows(nextRows);
    startTransition(() => {
      const genRng = createSeededRng(nextSeed);
      const nextInput = {
        ...input,
        seed: nextSeed,
        motif: nextMotif,
        size: nextSize,
        cols: nextCols,
        rows: nextRows,
        layout: nextLayout,
        egress: nextEgress,
        roomLayout: nextRoomLayout,
        roomSize: nextRoomSize,
        polymorph: nextPolymorph,
        doors: nextDoors,
        corridors: nextCorridors,
        deadends: nextDeadends,
        stairs: nextStairs,
        grid: nextGrid,
        partySize: nextPartySize,
      };
      setResult(generateDungeon(nextInput, genRng));
      syncUrl(nextSeed);
    });
  }

  async function handleCopyKey() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatDungeonKeyPlain(result));
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  function handleDownloadSvg() {
    if (!result) return;
    const svg = buildDungeonSvg(result, { playerMap });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.name.replace(/\s+/g, "-").toLowerCase() || "dungeon"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const svgMarkup = result ? buildDungeonSvg(result, { playerMap }) : "";

  return (
    <div className="dungeon-gen">
      <div className="dungeon-gen-layout">
        <form
          className="dungeon-gen-form dungeon-gen-no-print"
          onSubmit={(event) => {
            event.preventDefault();
            handleGenerate();
          }}
        >
          <div className="dungeon-gen-seed-row">
            <div className="tool-field dungeon-gen-seed-field">
              <Label htmlFor="dungeon-seed">Seed</Label>
              <DraftNumberInput
                id="dungeon-seed"
                className="tool-input"
                min={0}
                max={999_999_999}
                value={seed}
                onValueChange={(next) => setSeed(clampInt(next, 0, 999_999_999))}
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

          <div className="dungeon-gen-fields">
            <div className="tool-field">
              <Label htmlFor="dungeon-name">Dungeon name</Label>
              <input
                id="dungeon-name"
                className="tool-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-level">Dungeon level</Label>
              <DraftNumberInput
                id="dungeon-level"
                className="tool-input"
                min={1}
                max={20}
                value={level}
                onValueChange={(next) => setLevel(clampInt(next, 1, 20))}
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-party">Party size</Label>
              <DraftNumberInput
                id="dungeon-party"
                className="tool-input"
                min={1}
                max={12}
                value={partySize}
                onValueChange={(next) => setPartySize(clampInt(next, 1, 12))}
              />
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-motif">Motif</Label>
              <select
                id="dungeon-motif"
                className="tool-input"
                value={motif}
                onChange={(event) => setMotif(event.target.value as DungeonMotif)}
              >
                {MOTIF_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-size">Size</Label>
              <select
                id="dungeon-size"
                className="tool-input"
                value={size}
                onChange={(event) => setSize(event.target.value as DungeonSize)}
              >
                {SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {size === "custom" ? (
              <>
                <div className="tool-field">
                  <Label htmlFor="dungeon-cols">Columns</Label>
                  <DraftNumberInput
                    id="dungeon-cols"
                    className="tool-input"
                    min={20}
                    max={120}
                    value={cols}
                    onValueChange={(next) => setCols(clampInt(next, 20, 120))}
                  />
                </div>
                <div className="tool-field">
                  <Label htmlFor="dungeon-rows">Rows</Label>
                  <DraftNumberInput
                    id="dungeon-rows"
                    className="tool-input"
                    min={20}
                    max={120}
                    value={rows}
                    onValueChange={(next) => setRows(clampInt(next, 20, 120))}
                  />
                </div>
              </>
            ) : (
              <div className="tool-field">
                <span className="tool-label">Grid cells</span>
                <p className="dungeon-gen-dim-note">
                  {dims.cols} by {dims.rows}
                </p>
              </div>
            )}
            <div className="tool-field">
              <Label htmlFor="dungeon-layout">Overall layout</Label>
              <select
                id="dungeon-layout"
                className="tool-input"
                value={layout}
                onChange={(event) =>
                  setLayout(event.target.value as DungeonLayout)
                }
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-egress">Egress</Label>
              <select
                id="dungeon-egress"
                className="tool-input"
                value={egress}
                onChange={(event) =>
                  setEgress(event.target.value as DungeonEgress)
                }
              >
                <option value="none">None</option>
                <option value="yes">Yes</option>
                <option value="many">Many</option>
                <option value="tiling">Tiling</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-room-layout">Room layout</Label>
              <select
                id="dungeon-room-layout"
                className="tool-input"
                value={roomLayout}
                disabled={cavernous}
                onChange={(event) =>
                  setRoomLayout(event.target.value as DungeonRoomLayout)
                }
              >
                <option value="sparse">Sparse</option>
                <option value="scattered">Scattered</option>
                <option value="dense">Dense</option>
                <option value="symmetric">Symmetric</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-room-size">Room size</Label>
              <select
                id="dungeon-room-size"
                className="tool-input"
                value={roomSize}
                disabled={cavernous}
                onChange={(event) =>
                  setRoomSize(event.target.value as DungeonRoomSize)
                }
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="huge">Huge</option>
                <option value="gargantuan">Gargantuan</option>
                <option value="colossal">Colossal</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-polymorph">Polymorph rooms</Label>
              <select
                id="dungeon-polymorph"
                className="tool-input"
                value={polymorph}
                disabled={cavernous}
                onChange={(event) =>
                  setPolymorph(event.target.value as DungeonPolymorph)
                }
              >
                <option value="none">None</option>
                <option value="yes">Yes</option>
                <option value="many">Many</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-doors">Doors</Label>
              <select
                id="dungeon-doors"
                className="tool-input"
                value={doors}
                onChange={(event) => setDoors(event.target.value as DungeonDoors)}
              >
                <option value="none">None</option>
                <option value="basic">Basic</option>
                <option value="secure">Secure</option>
                <option value="standard">Standard</option>
                <option value="deathtrap">Deathtrap</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-corridors">Corridors</Label>
              <select
                id="dungeon-corridors"
                className="tool-input"
                value={corridors}
                disabled={cavernous}
                onChange={(event) =>
                  setCorridors(event.target.value as DungeonCorridors)
                }
              >
                <option value="labyrinth">Labyrinth</option>
                <option value="errant">Errant</option>
                <option value="straight">Straight</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-deadends">Dead ends</Label>
              <select
                id="dungeon-deadends"
                className="tool-input"
                value={deadends}
                onChange={(event) =>
                  setDeadends(event.target.value as DungeonDeadends)
                }
              >
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-stairs">Stairs</Label>
              <select
                id="dungeon-stairs"
                className="tool-input"
                value={stairs}
                onChange={(event) => setStairs(event.target.value as DungeonStairs)}
              >
                <option value="none">None</option>
                <option value="yes">Yes</option>
                <option value="many">Many</option>
              </select>
            </div>
            <div className="tool-field">
              <Label htmlFor="dungeon-grid">Grid overlay</Label>
              <select
                id="dungeon-grid"
                className="tool-input"
                value={grid}
                onChange={(event) => setGrid(event.target.value as DungeonGrid)}
              >
                <option value="none">None</option>
                <option value="square">Square</option>
                <option value="hex">Hex</option>
                <option value="verthex">Vertical hex</option>
              </select>
            </div>
          </div>

          <div className="dungeon-gen-actions">
            <button
              type="submit"
              className="tool-btn tool-btn-primary"
              disabled={isPending}
            >
              Generate
            </button>
            <button
              type="button"
              className="tool-btn tool-btn-secondary"
              onClick={handleRandomize}
              disabled={isPending}
            >
              Randomize
            </button>
            {copyStatus ? (
              <span className="dungeon-gen-copy-status">{copyStatus}</span>
            ) : null}
          </div>
        </form>

        {result ? (
          <div className="dungeon-gen-results">
            <h2 className="dungeon-gen-title">{result.name}</h2>
            <div className="dungeon-gen-map-wrap">
              <div
                className="dungeon-gen-map-host"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>
            <label className="dungeon-gen-player-toggle dungeon-gen-no-print">
              <input
                type="checkbox"
                checked={playerMap}
                onChange={(event) => setPlayerMap(event.target.checked)}
              />
              Player map (hide secret doors and room numbers)
            </label>
            <ul className="dungeon-gen-legend" aria-label="Map legend">
              {DUNGEON_LEGEND_ITEMS.map((item) => (
                <li key={item.label}>
                  <span
                    className="dungeon-gen-legend-icon-host"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
            <div className="dungeon-gen-key-toolbar dungeon-gen-no-print">
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={handleCopyKey}
              >
                <Copy size={16} aria-hidden="true" />
                Copy key
              </button>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={handleDownloadSvg}
              >
                <Download size={16} aria-hidden="true" />
                Download SVG
              </button>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden="true" />
                Print
              </button>
            </div>
            <ol className="dungeon-gen-key">
              {result.keys.map((entry) => (
                <li key={entry.number}>
                  <h3 className="dungeon-gen-room-heading">
                    Room {entry.number}
                    <span className="dungeon-gen-room-kind">{entry.summary}</span>
                  </h3>
                  <p className="dungeon-gen-room-size">
                    {entry.widthFt} ft. by {entry.heightFt} ft.
                  </p>
                  <p className="dungeon-gen-room-detail">{entry.detail}</p>
                  {entry.doors.length > 0 ? (
                    <p className="dungeon-gen-door-note">
                      Doors: {entry.doors.join("; ")}.
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
