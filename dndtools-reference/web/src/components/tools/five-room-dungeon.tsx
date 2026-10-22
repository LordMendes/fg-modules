"use client";

import Link from "next/link";
import { Copy, Download } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { advanceGeneratorSeed } from "@/lib/random-spellbook/seeded-rng";
import {
  rerollFiveRoomName,
  rollFiveRoomDungeon,
} from "@/actions/five-room-dungeon";
import { buildDungeonSvg } from "@/lib/dungeon/render-svg";
import {
  DEFAULT_FIVE_ROOM_INPUT,
  FIVE_ROOM_MOTIFS,
  type FiveRoomMotif,
  type FiveRoomResult,
  type FiveRoomRoleIndex,
} from "@/lib/five-room";

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

const MOTIF_OPTIONS: { value: FiveRoomMotif; label: string }[] =
  FIVE_ROOM_MOTIFS.map((value) => ({
    value,
    label: value === "none" ? "None" : value.charAt(0).toUpperCase() + value.slice(1),
  }));

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseMotif(raw: string | null): FiveRoomMotif {
  if (raw && (FIVE_ROOM_MOTIFS as readonly string[]).includes(raw)) {
    return raw as FiveRoomMotif;
  }
  return DEFAULT_FIVE_ROOM_INPUT.motif;
}

function formatPlainText(result: FiveRoomResult): string {
  const lines = [
    result.name,
    result.premise,
    `Motif: ${result.motif}, level ${result.level}, party size ${result.partySize}`,
    "",
  ];
  for (const room of result.rooms) {
    lines.push(`${room.role}`);
    lines.push(room.body);
    lines.push("");
  }
  return lines.join("\n");
}

export function FiveRoomDungeon() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const initialLevel = Number.parseInt(searchParams.get("level") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [nameSeed, setNameSeed] = useState(
    Number.isNaN(initialSeed) ? 1 : initialSeed,
  );
  const [motif, setMotif] = useState<FiveRoomMotif>(
    parseMotif(searchParams.get("motif")),
  );
  const [level, setLevel] = useState(
    clampInt(Number.isNaN(initialLevel) ? 1 : initialLevel, 1, 20),
  );
  const [partySize, setPartySize] = useState(DEFAULT_FIVE_ROOM_INPUT.partySize);
  const [result, setResult] = useState<FiveRoomResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [roomBumps, setRoomBumps] = useState<Record<number, number>>({});

  const input = useMemo(
    () => ({
      motif,
      level: clampInt(level, 1, 20),
      partySize: clampInt(partySize, 1, 12),
      seed,
      nameSeed,
    }),
    [level, motif, nameSeed, partySize, seed],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("motif", motif);
      params.set("level", String(clampInt(level, 1, 20)));
      params.set("seed", String(nextSeed));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [level, motif, pathname, router],
  );

  const runGenerate = useCallback(
    (nextSeed?: number) => {
      const usedSeed = nextSeed ?? seed;
      startTransition(async () => {
        const next = await rollFiveRoomDungeon({ ...input, seed: usedSeed });
        setResult(next);
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

  function handleClear() {
    setMotif(DEFAULT_FIVE_ROOM_INPUT.motif);
    setLevel(DEFAULT_FIVE_ROOM_INPUT.level);
    setPartySize(DEFAULT_FIVE_ROOM_INPUT.partySize);
    setSeed(1);
    setNameSeed(1);
    setRoomBumps({});
    setResult(null);
  }

  function rerollRoom(roomIndex: FiveRoomRoleIndex) {
    const bump = (roomBumps[roomIndex] ?? 0) + 1;
    setRoomBumps((prev) => ({ ...prev, [roomIndex]: bump }));
    startTransition(async () => {
      const next = await rollFiveRoomDungeon({
        ...input,
        rerollRoom: roomIndex,
        roomSeedBump: bump,
      });
      setResult(next);
    });
  }

  function rerollName() {
    const nextNameSeed = nameSeed + 1;
    setNameSeed(nextNameSeed);
    startTransition(async () => {
      const name = await rerollFiveRoomName(nextNameSeed);
      setResult((prev) => (prev ? { ...prev, name } : prev));
    });
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(formatPlainText(result));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  function downloadMap() {
    if (!result) return;
    const svg = buildDungeonSvg(result.map, { legend: true });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.name.replace(/\s+/g, "-").toLowerCase() || "five-room-dungeon"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const svgMarkup = useMemo(
    () => (result ? buildDungeonSvg(result.map, { legend: true }) : ""),
    [result],
  );

  return (
    <div className="five-room">
      <div className="five-room-form">
        <div className="five-room-name-row">
          <span className="tool-label">Dungeon name</span>
          <button
            type="button"
            className="five-room-name-btn tool-btn tool-btn--ghost"
            onClick={rerollName}
            disabled={isPending}
          >
            {result?.name ?? "Generate to name"}
          </button>
        </div>

        <div className="five-room-seed-row">
          <div className="tool-field five-room-seed-field">
            <Label htmlFor="five-room-seed">Seed</Label>
            <input
              id="five-room-seed"
              type="number"
              className="tool-input"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={() => runGenerate()}
            disabled={isPending}
          >
            Use this seed
          </button>
        </div>

        <div className="five-room-grid">
          <div className="tool-field">
            <Label htmlFor="five-room-motif">Motif</Label>
            <select
              id="five-room-motif"
              className="tool-input"
              value={motif}
              onChange={(event) =>
                setMotif(parseMotif(event.target.value))
              }
            >
              {MOTIF_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="five-room-level">Dungeon level</Label>
            <input
              id="five-room-level"
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
            <Label htmlFor="five-room-party">Party size</Label>
            <input
              id="five-room-party"
              type="number"
              className="tool-input"
              min={1}
              max={12}
              value={partySize}
              onChange={(event) =>
                setPartySize(clampInt(Number(event.target.value), 1, 12))
              }
            />
          </div>
        </div>

        <div className="five-room-actions">
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
        </div>
      </div>

      {result ? (
        <div className="five-room-results">
          <div className="five-room-results-toolbar">
            <div className="five-room-summary">
              <p className="five-room-summary-title">{result.name}</p>
              <p className="five-room-premise">{result.premise}</p>
            </div>
            <button
              type="button"
              className="tool-btn tool-btn-secondary"
              onClick={copyResult}
            >
              <Copy size={16} aria-hidden="true" />
              Copy
            </button>
            <button
              type="button"
              className="tool-btn tool-btn-secondary"
              onClick={downloadMap}
            >
              <Download size={16} aria-hidden="true" />
              Download SVG
            </button>
            {copyStatus ? (
              <span className="five-room-copy-status">{copyStatus}</span>
            ) : null}
          </div>

          <div className="five-room-map-wrap">
            <div
              className="five-room-map-host"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>

          <ol className="five-room-list">
            {result.rooms.map((room) => (
              <li key={room.index} className="five-room-room">
                <div className="five-room-room-head">
                  <h2 className="five-room-room-title">
                    {room.index}. {room.role}
                  </h2>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost"
                    onClick={() => rerollRoom(room.index)}
                    disabled={isPending}
                  >
                    Reroll room
                  </button>
                </div>
                <div className="five-room-room-body">
                  {room.body.split(/\n\n+/).map((paragraph, index) => (
                    <p key={`${room.index}-${index}`}>{paragraph}</p>
                  ))}
                </div>
                {room.monsterSlug ? (
                  <p className="five-room-room-link">
                    <Link href={`/monsters/${room.monsterSlug}`}>
                      Open creature in compendium
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
