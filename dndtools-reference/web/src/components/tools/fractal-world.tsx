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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  advanceGeneratorSeed,
  createSeededRng,
} from "@/lib/random-spellbook/seeded-rng";
import {
  DEFAULT_FRACTAL_INPUT,
  FRACTAL_PALETTES,
  FRACTAL_PROJECTIONS,
  generateFractalWorld,
  type FractalInput,
  type FractalPalette,
  type FractalProjection,
  type FractalResult,
} from "@/lib/fractal-world";

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

function parseProjection(raw: string | null): FractalProjection {
  const found = FRACTAL_PROJECTIONS.find((p) => p.value === raw);
  return found?.value ?? DEFAULT_FRACTAL_INPUT.projection;
}

function parsePalette(raw: string | null): FractalPalette {
  const found = FRACTAL_PALETTES.find((p) => p.value === raw);
  return found?.value ?? DEFAULT_FRACTAL_INPUT.palette;
}

export function FractalWorldTool() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);

  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [projection, setProjection] = useState<FractalProjection>(
    parseProjection(searchParams.get("projection")),
  );
  const [palette, setPalette] = useState<FractalPalette>(
    parsePalette(searchParams.get("palette")),
  );
  const [water, setWater] = useState(
    clampInt(
      Number.parseInt(searchParams.get("water") ?? "", 10),
      0,
      100,
      DEFAULT_FRACTAL_INPUT.water,
    ),
  );
  const [ice, setIce] = useState(
    clampInt(
      Number.parseInt(searchParams.get("ice") ?? "", 10),
      0,
      100,
      DEFAULT_FRACTAL_INPUT.ice,
    ),
  );
  const [height, setHeight] = useState(
    clampInt(
      Number.parseInt(searchParams.get("height") ?? "", 10),
      240,
      800,
      DEFAULT_FRACTAL_INPUT.height,
    ),
  );
  const [iterations, setIterations] = useState(
    clampInt(
      Number.parseInt(searchParams.get("iterations") ?? "", 10),
      1,
      6,
      DEFAULT_FRACTAL_INPUT.iterations,
    ),
  );
  const [rotation, setRotation] = useState(
    clampInt(
      Number.parseInt(searchParams.get("rotation") ?? "", 10),
      0,
      359,
      DEFAULT_FRACTAL_INPUT.rotation,
    ),
  );
  const [result, setResult] = useState<FractalResult | null>(null);

  const input = useMemo<FractalInput>(
    () => ({
      projection,
      palette,
      water,
      ice,
      height,
      iterations,
      rotation,
    }),
    [projection, palette, water, ice, height, iterations, rotation],
  );

  const syncUrl = useCallback(
    (nextSeed: number) => {
      const params = new URLSearchParams();
      params.set("seed", String(nextSeed));
      params.set("projection", projection);
      params.set("palette", palette);
      params.set("water", String(water));
      params.set("ice", String(ice));
      params.set("height", String(height));
      params.set("iterations", String(iterations));
      params.set("rotation", String(rotation));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [
      pathname,
      projection,
      palette,
      water,
      ice,
      height,
      iterations,
      rotation,
      router,
    ],
  );

  const runGenerate = useCallback(
    (nextSeed: number) => {
      startTransition(() => {
        const rng = createSeededRng(nextSeed);
        const next = generateFractalWorld(input, rng, nextSeed);
        setResult(next);
        syncUrl(nextSeed);
      });
    },
    [input, syncUrl],
  );

  useEffect(() => {
    runGenerate(seed);
  }, [input, seed, runGenerate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.createImageData(result.width, result.height);
    imageData.data.set(result.pixels);
    ctx.putImageData(imageData, 0, 0);
  }, [result]);

  const onDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fractal-world-${seed}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [seed]);

  return (
    <div className="fractal-world">
      <div className="fractal-world-form">
        <div className="fractal-world-seed-row">
          <div className="tool-field fractal-world-seed-field">
            <Label htmlFor="fractal-seed">Seed</Label>
            <input
              id="fractal-seed"
              className="tool-input"
              type="number"
              value={seed}
              onChange={(e) =>
                setSeed(clampInt(Number(e.target.value), 1, 2 ** 31 - 1, 1))
              }
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            disabled={isPending}
            onClick={() => setSeed(advanceGeneratorSeed(seed))}
          >
            Generate
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            disabled={isPending}
            onClick={() => runGenerate(seed)}
          >
            Use this seed
          </button>
        </div>

        <div className="fractal-world-fields">
          <div className="tool-field">
            <Label htmlFor="fractal-projection">Projection</Label>
            <select
              id="fractal-projection"
              className="tool-input"
              value={projection}
              onChange={(e) =>
                setProjection(parseProjection(e.target.value))
              }
            >
              {FRACTAL_PROJECTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-palette">Palette</Label>
            <select
              id="fractal-palette"
              className="tool-input"
              value={palette}
              onChange={(e) => setPalette(parsePalette(e.target.value))}
            >
              {FRACTAL_PALETTES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-water">Water percent</Label>
            <input
              id="fractal-water"
              className="tool-input"
              type="number"
              min={0}
              max={100}
              value={water}
              onChange={(e) =>
                setWater(clampInt(Number(e.target.value), 0, 100, water))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-ice">Ice percent of land</Label>
            <input
              id="fractal-ice"
              className="tool-input"
              type="number"
              min={0}
              max={100}
              value={ice}
              onChange={(e) =>
                setIce(clampInt(Number(e.target.value), 0, 100, ice))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-height">Image height (px)</Label>
            <input
              id="fractal-height"
              className="tool-input"
              type="number"
              min={240}
              max={800}
              value={height}
              onChange={(e) =>
                setHeight(clampInt(Number(e.target.value), 240, 800, height))
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-iterations">Noise octaves</Label>
            <input
              id="fractal-iterations"
              className="tool-input"
              type="number"
              min={1}
              max={6}
              value={iterations}
              onChange={(e) =>
                setIterations(
                  clampInt(Number(e.target.value), 1, 6, iterations),
                )
              }
            />
          </div>
          <div className="tool-field">
            <Label htmlFor="fractal-rotation">Rotation (degrees)</Label>
            <input
              id="fractal-rotation"
              className="tool-input"
              type="number"
              min={0}
              max={359}
              value={rotation}
              onChange={(e) =>
                setRotation(
                  clampInt(Number(e.target.value), 0, 359, rotation),
                )
              }
            />
          </div>
        </div>

        <div className="fractal-world-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            disabled={isPending || !result}
            onClick={onDownload}
          >
            <Download size={16} aria-hidden />
            Download PNG
          </button>
        </div>
      </div>

      <div className="fractal-world-results">
        <canvas
          ref={canvasRef}
          className="fractal-world-canvas"
          aria-label="Fractal world map"
        />
      </div>
    </div>
  );
}
