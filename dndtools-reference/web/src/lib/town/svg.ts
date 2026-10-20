import type { LayoutResult } from "./geometry";
import type {
  TownEnvironment,
  TownSvgDraft,
  TownTopography,
  TownWallKind,
} from "./types";
import { BUILDING_TYPE_LABELS, TOWN_VIEW_SIZE } from "./types";

const TERRAIN: Record<TownEnvironment, string[]> = {
  grassland: ["#3c9a34", "#2f8828", "#4eae42", "#348f2c", "#62b854"],
  forest: ["#1e6a30", "#174f24", "#2b7c3c", "#143f1e", "#368a46"],
  desert: ["#e0b15c", "#d09a44", "#c48638", "#ebc472", "#b67a30"],
  arctic: ["#d5e6ef", "#c3d9e6", "#eaf3f8", "#b4ccdc", "#9bbfd4"],
  mountain: ["#8b7a6b", "#73675b", "#a08c7c", "#5e564e", "#6d8a5e"],
  subterranean: ["#3a384c", "#2c2a3c", "#48465c", "#242232", "#333146"],
};

const BUILDINGS = ["#3a3874", "#45428a", "#2c2a5e"];
const STREET = "#c6b48a";
const RIVER = "#a7b3f2";
const RIVER_EDGE = "#7e8ad6";
const WATER = "#8ea2ea";
const WALL = "#161616";
const TITLE = "#f6f3ea";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pointsToPath(points: { x: number; y: number }[], close: boolean): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const body = rest
    .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return `M ${first!.x.toFixed(1)} ${first!.y.toFixed(1)} ${body}${close ? " Z" : ""}`;
}

function coastalWaterPath(): string {
  const base = TOWN_VIEW_SIZE * 0.75;
  const step = 36;
  let d = `M 0 ${TOWN_VIEW_SIZE} L ${TOWN_VIEW_SIZE} ${TOWN_VIEW_SIZE} L ${TOWN_VIEW_SIZE} ${base.toFixed(1)}`;
  for (let x = TOWN_VIEW_SIZE; x >= 0; x -= step) {
    const wave = Math.sin(x * 0.035) * 12 + Math.sin(x * 0.09) * 5;
    d += ` L ${x.toFixed(1)} ${(base + wave).toFixed(1)}`;
  }
  d += " Z";
  return d;
}

function islandWaterPath(): string {
  const inset = TOWN_VIEW_SIZE * 0.12;
  const cx = TOWN_VIEW_SIZE / 2;
  const cy = TOWN_VIEW_SIZE / 2;
  const rx = (TOWN_VIEW_SIZE - inset * 2) / 2;
  const ry = rx;
  return `M 0 0 H ${TOWN_VIEW_SIZE} V ${TOWN_VIEW_SIZE} H 0 Z M ${cx.toFixed(1)} ${cy.toFixed(1)} m -${rx.toFixed(1)},0 a ${rx.toFixed(1)},${ry.toFixed(1)} 0 1,0 ${(rx * 2).toFixed(1)},0 a ${rx.toFixed(1)},${ry.toFixed(1)} 0 1,0 -${(rx * 2).toFixed(1)},0 Z`;
}

function titleSize(name: string): number {
  return Math.max(34, Math.min(68, 620 / Math.max(name.length, 6)));
}

export function renderTownSvg(options: {
  townName: string;
  environment: TownEnvironment;
  effectiveTopography: TownTopography;
  labels: boolean;
  wallKind: TownWallKind;
  layout: LayoutResult;
}): { svg: string; draft: TownSvgDraft } {
  const { townName, environment, effectiveTopography, labels, wallKind, layout } =
    options;
  const hasWater =
    effectiveTopography === "coastal" || effectiveTopography === "island";
  const palette = TERRAIN[environment];
  const ground = palette[2] ?? palette[0]!;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TOWN_VIEW_SIZE} ${TOWN_VIEW_SIZE}" class="town-gen-map" role="img" aria-labelledby="town-gen-title">`,
  );
  parts.push(`<title id="town-gen-title">${escapeXml(townName)}</title>`);
  parts.push(
    `<rect class="town-gen-ground town-gen-${environment}" x="0" y="0" width="${TOWN_VIEW_SIZE}" height="${TOWN_VIEW_SIZE}" fill="${ground}" />`,
  );

  for (const cell of layout.terrain) {
    const fill = palette[cell.shade % palette.length] ?? ground;
    parts.push(
      `<path class="town-gen-terrain town-gen-${environment} town-gen-shade-${cell.shade}" d="${pointsToPath(cell.points, true)}" fill="${fill}" stroke="${fill}" stroke-width="1.4" />`,
    );
  }

  if (effectiveTopography === "coastal") {
    parts.push(
      `<path class="town-gen-water" d="${coastalWaterPath()}" fill="${WATER}" />`,
    );
  } else if (effectiveTopography === "island") {
    parts.push(
      `<path class="town-gen-water" d="${islandWaterPath()}" fill="${WATER}" fill-rule="evenodd" />`,
    );
  }

  for (const road of layout.roads) {
    parts.push(
      `<line class="town-gen-road" x1="${road.x1.toFixed(1)}" y1="${road.y1.toFixed(1)}" x2="${road.x2.toFixed(1)}" y2="${road.y2.toFixed(1)}" stroke="${STREET}" stroke-width="12" stroke-linecap="round" />`,
    );
  }

  for (const block of layout.blocks) {
    parts.push(
      `<path class="town-gen-block" d="${pointsToPath(block.points, true)}" fill="${STREET}" stroke="#b19768" stroke-width="1.15" />`,
    );
    for (const building of block.buildings) {
      const shade = building.shade ?? 0;
      const fill = BUILDINGS[shade] ?? BUILDINGS[0]!;
      parts.push(
        `<rect class="town-gen-building town-gen-roof-${shade}" x="${building.x.toFixed(1)}" y="${building.y.toFixed(1)}" width="${building.w.toFixed(1)}" height="${building.h.toFixed(1)}" fill="${fill}" />`,
      );
    }
  }

  if (layout.river) {
    const d = pointsToPath(layout.river.points, false);
    parts.push(
      `<path class="town-gen-river-bank" d="${d}" fill="none" stroke="${RIVER_EDGE}" stroke-width="${(layout.river.width + 8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" />`,
    );
    parts.push(
      `<path class="town-gen-river" d="${d}" fill="none" stroke="${RIVER}" stroke-width="${layout.river.width.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" />`,
    );
  }

  if (wallKind !== "none" && layout.town.outline.length >= 3) {
    const palisade = wallKind === "palisade";
    const dash = palisade ? ' stroke-dasharray="9 7"' : "";
    const width = palisade ? 4.5 : 9;
    parts.push(
      `<path class="town-gen-wall town-gen-wall-${wallKind}" d="${pointsToPath(layout.town.outline, true)}" fill="none" stroke="${WALL}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${dash} />`,
    );
    const towerR = palisade ? 6 : 11;
    for (const tower of layout.towers) {
      parts.push(
        `<circle class="town-gen-tower" cx="${tower.x.toFixed(1)}" cy="${tower.y.toFixed(1)}" r="${towerR}" fill="${WALL}" />`,
      );
    }
    parts.push(
      `<circle class="town-gen-gate" cx="${layout.gate.x.toFixed(1)}" cy="${layout.gate.y.toFixed(1)}" r="${palisade ? 8 : 13}" fill="${WALL}" />`,
    );
  }

  if (labels) {
    const size = titleSize(townName);
    parts.push(
      `<text class="town-gen-map-title" x="32" y="${(size + 18).toFixed(0)}" fill="${TITLE}" stroke="${WALL}" stroke-width="7" paint-order="stroke fill" font-family="Palatino Linotype, Palatino, Georgia, serif" font-size="${size.toFixed(0)}" font-weight="700">${escapeXml(townName)}</text>`,
    );
  }

  parts.push("</svg>");

  return {
    svg: parts.join(""),
    draft: {
      labels,
      districtTextIds: [],
      hasWater,
      river: layout.river,
      wallKind,
    },
  };
}

export function districtNotes(buildingType: import("./types").BuildingType): string {
  return BUILDING_TYPE_LABELS[buildingType];
}
