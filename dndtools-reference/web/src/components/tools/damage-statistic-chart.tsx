"use client";

import { useId, useMemo, useState } from "react";
import {
  formatExpectedDelta,
  formatExpectedDamage,
  type AcCompareRow,
  type AcDamageRow,
} from "@/lib/damage-statistic";

type ChartMode = "full" | "standard";

type ChartPoint = {
  ac: number;
  a: number;
  b: number;
};

const PAD = { top: 18, right: 18, bottom: 32, left: 46 };
const VIEW_W = 720;
const VIEW_H = 320;
const INNER_W = VIEW_W - PAD.left - PAD.right;
const INNER_H = VIEW_H - PAD.top - PAD.bottom;

function valuesForCompareMode(rows: AcCompareRow[], mode: ChartMode): ChartPoint[] {
  return rows.map((row) => ({
    ac: row.ac,
    a: mode === "full" ? row.a.fullAttackDamage : row.a.standardDamage,
    b: mode === "full" ? row.b.fullAttackDamage : row.b.standardDamage,
  }));
}

function valuesForSingleMode(rows: AcDamageRow[], mode: ChartMode): ChartPoint[] {
  return rows.map((row) => ({
    ac: row.ac,
    a: mode === "full" ? row.fullAttackDamage : row.standardDamage,
    b: 0,
  }));
}

function acTicks(min: number, max: number): number[] {
  const span = Math.max(1, max - min);
  const step = span <= 12 ? 1 : span <= 24 ? 2 : span <= 40 ? 5 : 10;
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let ac = start; ac <= max; ac += step) ticks.push(ac);
  if (ticks[0] !== min) ticks.unshift(min);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

function damageTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / 5;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }
  return ticks;
}

function linePath(
  points: ChartPoint[],
  key: "a" | "b",
  x: (ac: number) => number,
  y: (value: number) => number,
): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${x(point.ac).toFixed(2)} ${y(point[key]).toFixed(2)}`;
    })
    .join(" ");
}

function areaPath(
  points: ChartPoint[],
  key: "a" | "b",
  x: (ac: number) => number,
  y: (value: number) => number,
  baseline: number,
): string {
  if (points.length === 0) return "";
  const line = linePath(points, key, x, y);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return `${line} L${x(last.ac).toFixed(2)} ${baseline.toFixed(2)} L${x(first.ac).toFixed(2)} ${baseline.toFixed(2)} Z`;
}

export function DamageStatisticChart({
  compareRows,
  singleRows,
  nameA,
  nameB,
  compare = true,
}: {
  compareRows?: AcCompareRow[];
  singleRows?: AcDamageRow[];
  nameA: string;
  nameB?: string;
  compare?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [mode, setMode] = useState<ChartMode>("full");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    if (compare && compareRows) return valuesForCompareMode(compareRows, mode);
    if (!compare && singleRows) return valuesForSingleMode(singleRows, mode);
    return [];
  }, [compare, compareRows, singleRows, mode]);

  const acMin = points[0]?.ac ?? 0;
  const acMax = points[points.length - 1]?.ac ?? 1;
  const yMax = useMemo(() => {
    const peak = points.reduce(
      (max, point) => Math.max(max, point.a, compare ? point.b : 0),
      0,
    );
    return Math.max(1, peak * 1.08);
  }, [points, compare]);

  const x = (ac: number) =>
    PAD.left + ((ac - acMin) / Math.max(1, acMax - acMin)) * INNER_W;
  const y = (value: number) => PAD.top + INNER_H - (value / yMax) * INNER_H;
  const baseline = y(0);

  const xTicks = acTicks(acMin, acMax);
  const yTicks = damageTicks(yMax);
  const pathA = linePath(points, "a", x, y);
  const pathB = compare ? linePath(points, "b", x, y) : "";
  const fillA = areaPath(points, "a", x, y, baseline);
  const fillB = compare ? areaPath(points, "b", x, y, baseline) : "";

  const hover = hoverIndex == null ? null : points[hoverIndex];
  const hoverX = hover ? x(hover.ac) : null;
  const tooltipLeft = hover
    ? Math.min(86, Math.max(14, (x(hover.ac) / VIEW_W) * 100))
    : 50;

  function indexFromClientX(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * VIEW_W;
    const ratio = (svgX - PAD.left) / INNER_W;
    const ac = acMin + ratio * (acMax - acMin);
    let nearest = 0;
    let best = Infinity;
    points.forEach((point, index) => {
      const dist = Math.abs(point.ac - ac);
      if (dist < best) {
        best = dist;
        nearest = index;
      }
    });
    return nearest;
  }

  const labelA = nameA || "Weapon";
  const labelB = nameB || "Weapon B";
  const modeLabel = mode === "full" ? "Full attack" : "Standard attack";
  const ariaLabel = compare
    ? `${modeLabel} expected damage from AC ${acMin} to ${acMax} for ${labelA} and ${labelB}.`
    : `${modeLabel} expected damage from AC ${acMin} to ${acMax} for ${labelA}.`;

  return (
    <div className="damage-statistic-chart">
      <div className="damage-statistic-chart-toolbar">
        <ul className="damage-statistic-chart-legend">
          <li>
            <span className="damage-statistic-chart-swatch damage-statistic-chart-swatch-a" />
            {labelA}
          </li>
          {compare ? (
            <li>
              <span className="damage-statistic-chart-swatch damage-statistic-chart-swatch-b" />
              {labelB}
            </li>
          ) : null}
        </ul>
        <div className="damage-statistic-chart-modes" role="group" aria-label="Attack type">
          <button
            type="button"
            className="damage-statistic-chart-mode"
            aria-pressed={mode === "full"}
            onClick={() => setMode("full")}
          >
            Full attack
          </button>
          <button
            type="button"
            className="damage-statistic-chart-mode"
            aria-pressed={mode === "standard"}
            onClick={() => setMode("standard")}
          >
            Standard
          </button>
        </div>
      </div>

      <div className="damage-statistic-chart-frame">
        <svg
          className="damage-statistic-chart-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(event) => {
            setHoverIndex(indexFromClientX(event.clientX, event.currentTarget));
          }}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`${uid}-fill-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ds-chart-a)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--ds-chart-a)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uid}-fill-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ds-chart-b)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--ds-chart-b)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uid}-line-a`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--ds-chart-a)" stopOpacity="0.72" />
              <stop offset="100%" stopColor="var(--ds-chart-a)" />
            </linearGradient>
            <linearGradient id={`${uid}-line-b`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--ds-chart-b)" stopOpacity="0.72" />
              <stop offset="100%" stopColor="var(--ds-chart-b)" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                className="damage-statistic-chart-grid"
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="damage-statistic-chart-tick"
                x={PAD.left - 8}
                y={y(tick) + 3}
                textAnchor="end"
              >
                {Number.isInteger(tick) ? String(tick) : tick.toFixed(1)}
              </text>
            </g>
          ))}

          {xTicks.map((tick) => (
            <text
              key={`x-${tick}`}
              className="damage-statistic-chart-tick"
              x={x(tick)}
              y={VIEW_H - 12}
              textAnchor="middle"
            >
              {tick}
            </text>
          ))}

          <line
            className="damage-statistic-chart-axis"
            x1={PAD.left}
            x2={VIEW_W - PAD.right}
            y1={baseline}
            y2={baseline}
          />
          <line
            className="damage-statistic-chart-axis"
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={baseline}
          />

          <text
            className="damage-statistic-chart-axis-label"
            x={16}
            y={VIEW_H / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${VIEW_H / 2})`}
          >
            Expected damage
          </text>

          {fillA ? <path d={fillA} fill={`url(#${uid}-fill-a)`} /> : null}
          {compare && fillB ? <path d={fillB} fill={`url(#${uid}-fill-b)`} /> : null}
          {pathA ? (
            <path
              d={pathA}
              className="damage-statistic-chart-line"
              stroke={`url(#${uid}-line-a)`}
              filter={`url(#${uid}-glow)`}
            />
          ) : null}
          {compare && pathB ? (
            <path
              d={pathB}
              className="damage-statistic-chart-line"
              stroke={`url(#${uid}-line-b)`}
              filter={`url(#${uid}-glow)`}
            />
          ) : null}

          {hover && hoverX != null ? (
            <>
              <line
                className="damage-statistic-chart-crosshair"
                x1={hoverX}
                x2={hoverX}
                y1={PAD.top}
                y2={baseline}
              />
              <circle
                className="damage-statistic-chart-dot damage-statistic-chart-dot-a"
                cx={hoverX}
                cy={y(hover.a)}
                r="5"
              />
              {compare ? (
                <circle
                  className="damage-statistic-chart-dot damage-statistic-chart-dot-b"
                  cx={hoverX}
                  cy={y(hover.b)}
                  r="5"
                />
              ) : null}
            </>
          ) : null}
        </svg>

        {hover ? (
          <div
            className="damage-statistic-chart-tooltip"
            style={{
              left: `${tooltipLeft.toFixed(2)}%`,
            }}
          >
            <p className="damage-statistic-chart-tooltip-ac">AC {hover.ac}</p>
            <p>
              <span className="damage-statistic-chart-swatch damage-statistic-chart-swatch-a" />
              {labelA}: <strong>{formatExpectedDamage(hover.a)}</strong>
            </p>
            {compare ? (
              <>
                <p>
                  <span className="damage-statistic-chart-swatch damage-statistic-chart-swatch-b" />
                  {labelB}: <strong>{formatExpectedDamage(hover.b)}</strong>
                </p>
                <p className="damage-statistic-chart-tooltip-delta">
                  Difference {formatExpectedDelta(hover.b - hover.a)}
                </p>
              </>
            ) : null}
          </div>
        ) : (
          <p className="damage-statistic-chart-hint">
            Hover the plot to read damage at each AC.
          </p>
        )}
      </div>
    </div>
  );
}
