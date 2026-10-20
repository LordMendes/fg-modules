import type { TreasureMapMarker, TreasureMapResult } from "./types";
import { TREASURE_MAP_VIEWBOX } from "./generate";

export type TreasureMapSvgColors = {
  paper: string;
  ink: string;
};

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hoardSymbolMarkup(
  x: number,
  y: number,
  hoardSymbol: TreasureMapResult["hoardSymbol"],
): string {
  if (hoardSymbol === "cross") {
    const s = 14;
    return `<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="${x - s}" y1="${y - s}" x2="${x + s}" y2="${y + s}" />
        <line x1="${x + s}" y1="${y - s}" x2="${x - s}" y2="${y + s}" />
      </g>`;
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
  return `<polygon points="${points}" fill="currentColor" />`;
}

function markerMarkup(
  marker: TreasureMapMarker,
  hoardSymbol: TreasureMapResult["hoardSymbol"],
  paperFill: string,
): string {
  const { x, y, index, isHoard } = marker;
  if (isHoard) {
    return hoardSymbolMarkup(x, y, hoardSymbol);
  }
  return `<circle cx="${x}" cy="${y}" r="16" fill="${paperFill}" stroke="currentColor" stroke-width="2" />
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="14" font-family="serif" fill="currentColor">${index}</text>`;
}

export function buildTreasureMapSvg(
  result: TreasureMapResult,
  colors: TreasureMapSvgColors,
): string {
  const { width, height } = TREASURE_MAP_VIEWBOX;
  const pathPoints = result.markers.map((m) => `${m.x},${m.y}`).join(" ");

  const labels = result.markers
    .map((m) => {
      const labelY = m.y + 34;
      return `<text x="${m.x}" y="${labelY}" text-anchor="middle" font-size="13" font-family="serif" fill="${colors.ink}">${escapeXml(m.name)}</text>`;
    })
    .join("\n  ");

  const markers = result.markers
    .map((m) => markerMarkup(m, result.hoardSymbol, colors.paper))
    .join("\n  ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="treasure-map-title">
  <title id="treasure-map-title">${escapeXml(result.title)}</title>
  <rect width="100%" height="100%" fill="#d7e4ea" />
  <path d="${result.coastPath}" fill="#f4e7c8" stroke="${colors.ink}" stroke-width="2.5" />
  <polyline points="${pathPoints}" fill="none" stroke="${colors.ink}" stroke-width="2" stroke-dasharray="10 8" stroke-linecap="round" stroke-linejoin="round" />
  ${markers}
  ${labels}
  <text x="${width / 2}" y="48" text-anchor="middle" font-size="22" font-family="serif" font-weight="600" fill="${colors.ink}">${escapeXml(result.title)}</text>
</svg>`;
}
