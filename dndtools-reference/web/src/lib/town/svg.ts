import type { LayoutResult } from "./geometry";
import type {
  TownEnvironment,
  TownSvgDraft,
  TownTopography,
  TownWallKind,
} from "./types";
import { BUILDING_TYPE_LABELS, TOWN_VIEW_SIZE } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first!.x.toFixed(1)} ${first!.y.toFixed(1)} ${rest
    .map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ")}`;
}

function coastalWaterPath(): string {
  const y = TOWN_VIEW_SIZE * 0.75;
  const w = TOWN_VIEW_SIZE;
  const step = 18;
  let d = `M 0 ${y.toFixed(1)} L 0 ${w} L ${w} ${w} L ${w} ${y.toFixed(1)}`;
  for (let x = w; x >= 0; x -= step) {
    const jag = (x / step) % 2 === 0 ? 6 : -4;
    d += ` L ${x.toFixed(1)} ${(y + jag).toFixed(1)}`;
  }
  d += " Z";
  return d;
}

function islandWaterClip(land: { x: number; y: number; w: number; h: number }): string {
  const cx = land.x + land.w / 2;
  const cy = land.y + land.h / 2;
  const rx = land.w / 2 + 6;
  const ry = land.h / 2 + 6;
  return `M 0 0 H ${TOWN_VIEW_SIZE} V ${TOWN_VIEW_SIZE} H 0 Z M ${cx.toFixed(1)} ${cy.toFixed(1)} m -${rx.toFixed(1)},0 a ${rx.toFixed(1)},${ry.toFixed(1)} 0 1,0 ${(rx * 2).toFixed(1)},0 a ${rx.toFixed(1)},${ry.toFixed(1)} 0 1,0 -${(rx * 2).toFixed(1)},0 Z`;
}

function bridgeAt(
  road: { x1: number; y1: number; x2: number; y2: number },
  river: LayoutResult["river"],
): { x: number; y: number } | null {
  if (!river || river.points.length < 2) return null;
  const mx = (road.x1 + road.x2) / 2;
  const my = (road.y1 + road.y2) / 2;
  const half = river.width / 2 + 4;
  for (let i = 0; i < river.points.length - 1; i++) {
    const a = river.points[i]!;
    const b = river.points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / lenSq));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    if (Math.hypot(mx - px, my - py) <= half) {
      return { x: px, y: py };
    }
  }
  return null;
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
  const districtTextIds: string[] = [];
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TOWN_VIEW_SIZE} ${TOWN_VIEW_SIZE}" class="town-gen-map" role="img" aria-labelledby="town-gen-title">`,
  );
  parts.push(`<title id="town-gen-title">${escapeXml(townName)}</title>`);

  parts.push(
    `<rect class="town-gen-ground town-gen-${environment}" x="0" y="0" width="${TOWN_VIEW_SIZE}" height="${TOWN_VIEW_SIZE}" />`,
  );

  if (effectiveTopography === "coastal") {
    parts.push(
      `<path class="town-gen-water" d="${coastalWaterPath()}" fill-rule="evenodd" />`,
    );
  }

  if (effectiveTopography === "island") {
    parts.push(
      `<path class="town-gen-water" d="${islandWaterClip(layout.land)}" fill-rule="evenodd" />`,
    );
    const cx = layout.land.x + layout.land.w / 2;
    const cy = layout.land.y + layout.land.h / 2;
    parts.push(
      `<ellipse class="town-gen-island-fill town-gen-${environment}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(layout.land.w / 2).toFixed(1)}" ry="${(layout.land.h / 2).toFixed(1)}" />`,
    );
  }

  if (layout.river) {
    parts.push(
      `<path class="town-gen-river" d="${pointsToPath(layout.river.points)}" stroke-width="${layout.river.width}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`,
    );
  }

  for (const road of layout.roads) {
    parts.push(
      `<line class="town-gen-road" x1="${road.x1.toFixed(1)}" y1="${road.y1.toFixed(1)}" x2="${road.x2.toFixed(1)}" y2="${road.y2.toFixed(1)}" />`,
    );
  }

  if (wallKind !== "none") {
    const wall = layout.land;
    const inset = 14;
    const wx = wall.x - inset;
    const wy = wall.y - inset;
    const ww = wall.w + inset * 2;
    const wh = wall.h + inset * 2;
    const dash = wallKind === "palisade" ? ' stroke-dasharray="10 8"' : "";
    if (effectiveTopography === "island") {
      const cx = layout.land.x + layout.land.w / 2;
      const cy = layout.land.y + layout.land.h / 2;
      parts.push(
        `<ellipse class="town-gen-wall town-gen-wall-${wallKind}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(layout.land.w / 2 + inset).toFixed(1)}" ry="${(layout.land.h / 2 + inset).toFixed(1)}" fill="none"${dash} />`,
      );
    } else {
      parts.push(
        `<rect class="town-gen-wall town-gen-wall-${wallKind}" x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww.toFixed(1)}" height="${wh.toFixed(1)}" rx="18" ry="18" fill="none"${dash} />`,
      );
    }
    parts.push(
      `<rect class="town-gen-gate" x="${(layout.gate.x - 10).toFixed(1)}" y="${(layout.gate.y - 6).toFixed(1)}" width="20" height="12" rx="2" />`,
    );
  }

  const bridges: { x: number; y: number }[] = [];
  if (layout.river) {
    for (const road of layout.roads) {
      const hit = bridgeAt(road, layout.river);
      if (hit) bridges.push(hit);
      if (bridges.length >= 2) break;
    }
  }
  for (const bridge of bridges) {
    parts.push(
      `<rect class="town-gen-bridge" x="${(bridge.x - 14).toFixed(1)}" y="${(bridge.y - 6).toFixed(1)}" width="28" height="12" rx="2" />`,
    );
  }

  if (layout.marketBounds) {
    const m = layout.marketBounds;
    parts.push(
      `<rect class="town-gen-market" x="${m.x.toFixed(1)}" y="${m.y.toFixed(1)}" width="${m.w.toFixed(1)}" height="${m.h.toFixed(1)}" />`,
    );
    if (labels) {
      parts.push(
        `<text class="town-gen-label town-gen-market-label" x="${(m.x + m.w / 2).toFixed(1)}" y="${(m.y + m.h / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="middle">Market</text>`,
      );
    }
  }

  for (const district of layout.districtLayouts) {
    parts.push(
      `<rect class="town-gen-district" x="${district.bounds.x.toFixed(1)}" y="${district.bounds.y.toFixed(1)}" width="${district.bounds.w.toFixed(1)}" height="${district.bounds.h.toFixed(1)}" />`,
    );
    for (const building of district.buildings) {
      parts.push(
        `<rect class="town-gen-building" x="${building.x.toFixed(1)}" y="${building.y.toFixed(1)}" width="${building.w.toFixed(1)}" height="${building.h.toFixed(1)}" />`,
      );
    }
    const labelId = `district-${district.index}`;
    districtTextIds.push(labelId);
    if (labels) {
      parts.push(
        `<text id="${labelId}" class="town-gen-label town-gen-district-label" x="${(district.bounds.x + district.bounds.w / 2).toFixed(1)}" y="${(district.bounds.y + 8).toFixed(1)}" text-anchor="middle">${district.index}. ${escapeXml(district.name)}</text>`,
      );
    }
  }

  parts.push("</svg>");

  return {
    svg: parts.join(""),
    draft: {
      labels,
      districtTextIds,
      hasWater,
      river: layout.river,
      wallKind,
    },
  };
}

export function districtNotes(buildingType: import("./types").BuildingType): string {
  return BUILDING_TYPE_LABELS[buildingType];
}
