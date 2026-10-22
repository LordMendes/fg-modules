import {
  hexCenterPx,
  hexPolygonPoints,
  mapBounds,
  WORLD_COLS,
  WORLD_ROWS,
} from "./hex";
import type { WorldResult, WorldSettlement } from "./types";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function terrainClass(terrain: string, river: boolean): string {
  if (river) return "world-gen-river-fill";
  return `world-gen-${terrain}`;
}

function polylinePoints(
  points: { col: number; row: number }[],
  offsetX: number,
  offsetY: number,
): string {
  return points
    .map((p) => {
      const { x, y } = hexCenterPx(p.col, p.row);
      return `${(x - offsetX).toFixed(2)},${(y - offsetY).toFixed(2)}`;
    })
    .join(" ");
}

function renderSettlementMarker(
  s: WorldSettlement,
  offsetX: number,
  offsetY: number,
): string {
  const { x, y } = hexCenterPx(s.col, s.row);
  const cx = x - offsetX;
  const cy = y - offsetY;
  if (s.kind === "capital") {
    const r = 4;
    const spikes = 5;
    const inner = r * 0.45;
    let d = "";
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? r : inner;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      d += i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
    }
    return `<path class="world-gen-capital" d="${d} Z" />`;
  }
  if (s.kind === "ruin") {
    return `<circle class="world-gen-ruin" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="3.2" fill="none" stroke-width="1.2" />`;
  }
  return `<circle class="world-gen-city" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="2.2" />`;
}

function renderLabels(
  result: WorldResult,
  offsetX: number,
  offsetY: number,
): string {
  const { input, settlements, name } = result;
  if (!input.labels) return "";

  const parts: string[] = [];
  const bounds = mapBounds();
  const titleY = 14;
  parts.push(
    `<text class="world-gen-title" x="${(bounds.width / 2).toFixed(2)}" y="${titleY}" text-anchor="middle">${escapeXml(name)}</text>`,
  );

  for (const s of settlements) {
    if (s.kind === "ruin") continue;
    const { x, y } = hexCenterPx(s.col, s.row);
    const labelY = y - offsetY - 5;
    const cls =
      s.kind === "capital" ? "world-gen-label-capital" : "world-gen-label-city";
    parts.push(
      `<text class="${cls}" x="${(x - offsetX).toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="middle">${escapeXml(s.name)}</text>`,
    );
  }

  return `<g class="world-gen-labels">${parts.join("")}</g>`;
}

export function renderWorldSvg(result: WorldResult): string {
  const { input, cells, rivers } = result;
  const bounds = mapBounds();
  const offsetX = bounds.minX;
  const offsetY = bounds.minY;
  const vb = `0 0 ${bounds.width.toFixed(2)} ${bounds.height.toFixed(2)}`;

  const hexes: string[] = [];
  for (const cell of cells) {
    const points = hexPolygonPoints(cell.col, cell.row)
      .split(" ")
      .map((pair) => {
        const [px, py] = pair.split(",").map(Number);
        return `${(px! - offsetX).toFixed(2)},${(py! - offsetY).toFixed(2)}`;
      })
      .join(" ");
    const cls = terrainClass(cell.terrain, cell.river);
    hexes.push(`<polygon class="${cls}" points="${points}" />`);
  }

  const coasts: string[] = [];
  if (input.geography) {
    for (const cell of cells) {
      if (!cell.coast || cell.terrain === "sea") continue;
      const points = hexPolygonPoints(cell.col, cell.row)
        .split(" ")
        .map((pair) => {
          const [px, py] = pair.split(",").map(Number);
          return `${(px! - offsetX).toFixed(2)},${(py! - offsetY).toFixed(2)}`;
        })
        .join(" ");
      coasts.push(
        `<polygon class="world-gen-coast" points="${points}" fill="none" />`,
      );
    }
  }

  const grid: string[] = [];
  if (input.hexGrid) {
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const points = hexPolygonPoints(col, row)
          .split(" ")
          .map((pair) => {
            const [px, py] = pair.split(",").map(Number);
            return `${(px! - offsetX).toFixed(2)},${(py! - offsetY).toFixed(2)}`;
          })
          .join(" ");
        grid.push(
          `<polygon class="world-gen-grid" points="${points}" fill="none" />`,
        );
      }
    }
  }

  const mountains: string[] = [];
  if (input.geography) {
    for (const cell of cells) {
      if (cell.terrain !== "mountain") continue;
      const { x, y } = hexCenterPx(cell.col, cell.row);
      const cx = x - offsetX;
      const cy = y - offsetY;
      mountains.push(
        `<path class="world-gen-mountain-mark" d="M ${(cx - 2.5).toFixed(2)} ${(cy + 2).toFixed(2)} L ${cx.toFixed(2)} ${(cy - 3).toFixed(2)} L ${(cx + 2.5).toFixed(2)} ${(cy + 2).toFixed(2)} Z" />`,
      );
    }
  }

  const riverLines = rivers
    .map(
      (r) =>
        `<polyline class="world-gen-river-line" points="${polylinePoints(r.points, offsetX, offsetY)}" fill="none" />`,
    )
    .join("");

  const markers = result.settlements
    .map((s) => renderSettlementMarker(s, offsetX, offsetY))
    .join("");

  const labels = renderLabels(result, offsetX, offsetY);

  return [
    `<svg class="world-gen-map" xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${escapeXml(result.name)} map">`,
    `<rect class="world-gen-paper" x="0" y="0" width="100%" height="100%" />`,
    `<g class="world-gen-terrain">${hexes.join("")}</g>`,
    input.hexGrid ? `<g class="world-gen-grid-layer">${grid.join("")}</g>` : "",
    coasts.length ? `<g class="world-gen-coasts">${coasts.join("")}</g>` : "",
    riverLines ? `<g class="world-gen-rivers">${riverLines}</g>` : "",
    mountains.length
      ? `<g class="world-gen-mountains">${mountains.join("")}</g>`
      : "",
    markers ? `<g class="world-gen-markers">${markers}</g>` : "",
    labels,
    `</svg>`,
  ].join("");
}
