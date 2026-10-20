import { createSeededRng } from "@/lib/random-spellbook/seeded-rng";
import type {
  DoorVariant,
  DungeonDraft,
  DungeonGrid,
  GridCell,
  PlacedRoom,
  RoomShape,
} from "./types";

const CELL_PX = 16;

export type DungeonSvgOptions = {
  playerMap?: boolean;
  legend?: boolean;
};

const MAP_STYLE = `
.dungeon-gen-floor { fill: #f6f0e2; stroke: none; }
.dungeon-gen-room-fill { fill: #f6f0e2; stroke: none; }
.dungeon-gen-wall-line { stroke: #1c1612; stroke-width: 1.7; stroke-linecap: square; stroke-linejoin: miter; fill: none; }
.dungeon-gen-shape-wall { stroke: #1c1612; stroke-width: 1.9; stroke-linejoin: miter; fill: none; }
.dungeon-gen-grid-line { stroke: rgba(28, 22, 18, 0.22); stroke-width: 0.45; fill: none; }
.dungeon-gen-room-label { fill: #1c1612; font-family: Georgia, "Times New Roman", serif; font-weight: 700; }
.dungeon-gen-caption { fill: #1c1612; font-family: Georgia, "Times New Roman", serif; font-size: 11px; }
`.trim();

const MARK_INK = "#1c1612";
const MARK_PAPER = "#f6f0e2";
const STONE_TILE = 72;

function stoneHatchDefs(): string {
  const rng = createSeededRng(0x51a7e);
  const buckets = new Map<string, string[]>();
  for (let i = 0; i < 520; i++) {
    const x = rng.next() * STONE_TILE;
    const y = rng.next() * STONE_TILE;
    const angle = rng.next() * Math.PI * 2;
    const len = 3.6 + rng.next() * 5.4;
    const bend = (rng.next() - 0.5) * 0.4;
    const points = [
      { x, y },
      {
        x: x + Math.cos(angle) * len * 0.5,
        y: y + Math.sin(angle) * len * 0.5,
      },
      {
        x: x + Math.cos(angle + bend) * len,
        y: y + Math.sin(angle + bend) * len,
      },
    ];
    const width = rng.next() < 0.25 ? "0.85" : "0.62";
    const commands = buckets.get(width) ?? [];
    for (const ox of [-STONE_TILE, 0, STONE_TILE]) {
      for (const oy of [-STONE_TILE, 0, STONE_TILE]) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const draw: string[] = [];
        points.forEach((point, index) => {
          const px = point.x + ox;
          const py = point.y + oy;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
          draw.push(
            `${index === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`,
          );
        });
        if (maxX < 0 || minX > STONE_TILE || maxY < 0 || minY > STONE_TILE) {
          continue;
        }
        commands.push(draw.join(""));
      }
    }
    buckets.set(width, commands);
  }
  const strokes = [...buckets.entries()]
    .map(
      ([width, commands]) =>
        `<path d="${commands.join("")}" fill="none" stroke="#141414" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<defs><pattern id="dungeon-stone-hatch" width="${STONE_TILE}" height="${STONE_TILE}" patternUnits="userSpaceOnUse"><rect width="${STONE_TILE}" height="${STONE_TILE}" fill="${MARK_PAPER}"/>${strokes}</pattern></defs>`;
}

const STONE_DEFS = stoneHatchDefs();

function doorCaps(dashed = false): string {
  if (dashed) {
    return (
      `<rect x="5" y="1.2" width="6" height="3.5" rx="1.15" fill="none" stroke="${MARK_INK}" stroke-width="1.15" stroke-dasharray="1.5 1.15" />` +
      `<rect x="5" y="11.3" width="6" height="3.5" rx="1.15" fill="none" stroke="${MARK_INK}" stroke-width="1.15" stroke-dasharray="1.5 1.15" />`
    );
  }
  return (
    `<rect x="5" y="1.2" width="6" height="3.5" rx="1.15" fill="${MARK_INK}" />` +
    `<rect x="5" y="11.3" width="6" height="3.5" rx="1.15" fill="${MARK_INK}" />`
  );
}

function doorLeaf(): string {
  return (
    `<rect x="5.45" y="4.55" width="5.1" height="6.9" rx="0.45" fill="${MARK_PAPER}" stroke="${MARK_INK}" stroke-width="0.85" />`
  );
}

function doorSymbol(kind: DoorVariant): string {
  if (kind === "secret") {
    return (
      `<rect x="3.6" y="1.2" width="5.4" height="3.4" rx="1.1" fill="none" stroke="${MARK_INK}" stroke-width="1.1" stroke-dasharray="1.45 1.1" />` +
      `<rect x="3.6" y="11.4" width="5.4" height="3.4" rx="1.1" fill="none" stroke="${MARK_INK}" stroke-width="1.1" stroke-dasharray="1.45 1.1" />` +
      `<line x1="6.3" y1="4.6" x2="6.3" y2="11.4" fill="none" stroke="${MARK_INK}" stroke-width="1.1" stroke-dasharray="1.45 1.1" />` +
      `<text fill="${MARK_INK}" font-family="Georgia, 'Times New Roman', serif" font-size="6.2" font-weight="700" x="10.6" y="10.4">S</text>`
    );
  }
  if (kind === "open") {
    return doorCaps();
  }
  if (kind === "portcullis") {
    return (
      doorCaps() +
      `<line x1="8" y1="4.8" x2="8" y2="11.2" stroke="${MARK_INK}" stroke-width="1.15" />` +
      `<circle cx="8" cy="6.3" r="0.72" fill="${MARK_INK}" />` +
      `<circle cx="8" cy="8" r="0.72" fill="${MARK_INK}" />` +
      `<circle cx="8" cy="9.7" r="0.72" fill="${MARK_INK}" />`
    );
  }
  const leaf = doorCaps() + doorLeaf();
  if (kind === "locked") {
    return (
      leaf +
      `<circle cx="8" cy="8" r="1.55" fill="${MARK_INK}" />` +
      `<circle cx="8" cy="8" r="0.62" fill="${MARK_PAPER}" />`
    );
  }
  if (kind === "trapped") {
    return leaf + `<polygon fill="${MARK_INK}" points="8,6.15 9.85,8 8,9.85 6.15,8" />`;
  }
  return leaf + `<circle cx="8" cy="8" r="1.35" fill="${MARK_INK}" />`;
}

function stairSymbol(up: boolean): string {
  const frame = `<rect x="1.8" y="3.4" width="12.4" height="9.2" rx="0.55" fill="${MARK_INK}" />`;
  if (up) {
    const stripes = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      .map((i) => {
        const x = 3.15 + i * 1.12;
        return `<line x1="${x.toFixed(1)}" y1="4.4" x2="${x.toFixed(1)}" y2="11.6" stroke="${MARK_PAPER}" stroke-width="0.7" />`;
      })
      .join("");
    return frame + stripes;
  }
  const rays = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const y = 4.55 + i * 1.3;
      return `<line x1="3.15" y1="${y.toFixed(1)}" x2="13.2" y2="8" stroke="${MARK_PAPER}" stroke-width="0.85" />`;
    })
    .join("");
  return frame + rays;
}

function placeMark(body: string, cx: number, cy: number, vertical: boolean): string {
  const rot = vertical ? 0 : 90;
  return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot}) scale(0.9) translate(-8 -8)">${body}</g>`;
}

function legendSvg(body: string): string {
  return `<svg class="dungeon-gen-legend-icon" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="${MARK_PAPER}" />${body}</svg>`;
}

export const DUNGEON_LEGEND_ITEMS: { label: string; svg: string }[] = [
  {
    label: "Floor",
    svg: legendSvg(
      `<rect x="0.5" y="0.5" width="15" height="15" fill="none" stroke="rgba(28,22,18,0.35)" stroke-width="0.7" />`,
    ),
  },
  {
    label: "Wall",
    svg: `<svg class="dungeon-gen-legend-icon" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" fill="#f6f0e2"/><g fill="none" stroke="#141414" stroke-width="0.7" stroke-linecap="round"><line x1="1" y1="3" x2="6" y2="1"/><line x1="3" y1="6" x2="8" y2="3"/><line x1="1" y1="9" x2="6" y2="12"/><line x1="7" y1="8" x2="12" y2="5"/><line x1="9" y1="2" x2="15" y2="6"/><line x1="5" y1="11" x2="10" y2="14"/><line x1="10" y1="10" x2="15" y2="13"/><line x1="2" y1="13" x2="5" y2="15"/><line x1="8" y1="1" x2="12" y2="3"/><line x1="11" y1="8" x2="15" y2="9"/></g></svg>`,
  },
  { label: "Archway", svg: legendSvg(doorSymbol("open")) },
  { label: "Portcullis", svg: legendSvg(doorSymbol("portcullis")) },
  { label: "Door", svg: legendSvg(doorSymbol("closed")) },
  { label: "Locked", svg: legendSvg(doorSymbol("locked")) },
  { label: "Trapped", svg: legendSvg(doorSymbol("trapped")) },
  { label: "Secret", svg: legendSvg(doorSymbol("secret")) },
  { label: "Up", svg: legendSvg(stairSymbol(true)) },
  { label: "Down", svg: legendSvg(stairSymbol(false)) },
];

function isOpen(cell: GridCell | undefined, playerMap: boolean): boolean {
  if (!cell || cell.type === "wall") return false;
  if (playerMap && cell.type === "door" && cell.door === "secret") return false;
  return true;
}

function cellAt(
  draft: DungeonDraft,
  x: number,
  y: number,
): GridCell | undefined {
  return draft.cells[y]?.[x];
}

function cellCenter(
  x: number,
  y: number,
  grid: DungeonGrid,
): { cx: number; cy: number } {
  if (grid === "hex" || grid === "verthex") {
    const offsetX = grid === "verthex" && y % 2 === 1 ? CELL_PX * 0.5 : 0;
    return {
      cx: x * CELL_PX + CELL_PX / 2 + offsetX,
      cy: y * CELL_PX * 0.866 + CELL_PX / 2,
    };
  }
  return {
    cx: x * CELL_PX + CELL_PX / 2,
    cy: y * CELL_PX + CELL_PX / 2,
  };
}

function roomLabels(draft: DungeonDraft, playerMap: boolean): string {
  if (playerMap) return "";
  return draft.rooms
    .map((room) => labelForRoom(room, room.index + 1, draft.grid))
    .join("");
}

function labelForRoom(room: PlacedRoom, number: number, grid: DungeonGrid): string {
  if (Math.min(room.w, room.h) < 2) return "";
  const { cx, cy } = cellCenter(
    room.x + Math.floor((room.w - 1) / 2),
    room.y + Math.floor((room.h - 1) / 2),
    grid,
  );
  const size = Math.max(9, Math.min(18, Math.min(room.w, room.h) * CELL_PX * 0.42));
  return `<text class="dungeon-gen-room-label" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${size.toFixed(1)}">${number}</text>`;
}

function line(x1: number, y1: number, x2: number, y2: number, cls: string): string {
  return `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;
}

function isShapedRoom(shape: RoomShape | undefined): boolean {
  return shape === "round" || shape === "pentagon";
}

function roomIndexMap(draft: DungeonDraft): Map<number, PlacedRoom> {
  return new Map(draft.rooms.map((room) => [room.index, room]));
}

function shapedInterior(
  draft: DungeonDraft,
  x: number,
  y: number,
  rooms: Map<number, PlacedRoom>,
): boolean {
  const cell = cellAt(draft, x, y);
  if (cell?.roomIndex === undefined) return false;
  return isShapedRoom(rooms.get(cell.roomIndex)?.shape);
}

function roomEllipsePx(room: PlacedRoom): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
} {
  const radius = (Math.min(room.w, room.h) / 2) * CELL_PX;
  return {
    cx: (room.x + room.w / 2) * CELL_PX,
    cy: (room.y + room.h / 2) * CELL_PX,
    rx: radius,
    ry: radius,
  };
}

function pentagonVerts(room: PlacedRoom): { x: number; y: number }[] {
  const { cx, cy, rx, ry } = roomEllipsePx(room);
  const verts: { x: number; y: number }[] = [];
  for (let k = 0; k < 5; k++) {
    const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    verts.push({
      x: cx + rx * Math.cos(ang),
      y: cy + ry * Math.sin(ang),
    });
  }
  return verts;
}

function isCorridorSource(cell: GridCell | undefined): boolean {
  if (!cell) return false;
  if (cell.roomIndex !== undefined) return false;
  return (
    cell.corridor === true ||
    cell.type === "door" ||
    cell.type === "floor"
  );
}

function growCorridorsIntoShapes(
  draft: DungeonDraft,
  playerMap: boolean,
  rooms: Map<number, PlacedRoom>,
): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const showGrid = draft.grid === "square";
  const back = 2;
  for (let y = 0; y < draft.rows; y++) {
    for (let x = 0; x < draft.cols; x++) {
      const cell = cellAt(draft, x, y);
      if (!isOpen(cell, playerMap)) continue;
      if (!isCorridorSource(cell)) continue;
      if (shapedInterior(draft, x, y, rooms)) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const ix = x + dx;
        const iy = y + dy;
        if (!shapedInterior(draft, ix, iy, rooms)) continue;
        const behind = cellAt(draft, x - dx, y - dy);
        if (!isCorridorSource(behind) || !isOpen(behind, playerMap)) continue;
        const key = `${ix},${iy},${dx},${dy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const x0 = ix * CELL_PX;
        const y0 = iy * CELL_PX;
        if (dx === 1) {
          parts.push(
            `<rect class="dungeon-gen-floor" x="${x0 - back}" y="${y0}" width="${CELL_PX + back}" height="${CELL_PX}" />`,
          );
        } else if (dx === -1) {
          parts.push(
            `<rect class="dungeon-gen-floor" x="${x0}" y="${y0}" width="${CELL_PX + back}" height="${CELL_PX}" />`,
          );
        } else if (dy === 1) {
          parts.push(
            `<rect class="dungeon-gen-floor" x="${x0}" y="${y0 - back}" width="${CELL_PX}" height="${CELL_PX + back}" />`,
          );
        } else {
          parts.push(
            `<rect class="dungeon-gen-floor" x="${x0}" y="${y0}" width="${CELL_PX}" height="${CELL_PX + back}" />`,
          );
        }
        if (showGrid) {
          parts.push(
            `<rect class="dungeon-gen-grid-line" x="${x0}" y="${y0}" width="${CELL_PX}" height="${CELL_PX}" />`,
          );
        }
      }
    }
  }
  return parts.join("");
}

function roomShapeElement(room: PlacedRoom, extraClass?: string): string {
  const { cx, cy, rx, ry } = roomEllipsePx(room);
  const cls = extraClass ? ` class="${extraClass}"` : "";
  if (room.shape === "round") {
    return `<circle${cls} cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rx.toFixed(1)}" />`;
  }
  return `<polygon${cls} points="${pentagonVerts(room)
    .map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`)
    .join(" ")}" />`;
}

function shapedRoomMarkup(
  draft: DungeonDraft,
  kind: "fill" | "stroke",
): string {
  const showGrid = draft.grid === "square";
  if (kind === "stroke") {
    return draft.rooms
      .filter((room) => isShapedRoom(room.shape))
      .map((room) => roomShapeElement(room, "dungeon-gen-shape-wall"))
      .join("");
  }
  const defs: string[] = ["<defs>"];
  const bodies: string[] = [];
  for (const room of draft.rooms) {
    if (!isShapedRoom(room.shape)) continue;
    const clipId = `dungeon-room-clip-${room.index}`;
    defs.push(`<clipPath id="${clipId}">${roomShapeElement(room)}</clipPath>`);
    bodies.push(roomShapeElement(room, "dungeon-gen-room-fill"));
    if (showGrid) {
      const grids: string[] = [];
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          grids.push(
            `<rect class="dungeon-gen-grid-line" x="${x * CELL_PX}" y="${y * CELL_PX}" width="${CELL_PX}" height="${CELL_PX}" />`,
          );
        }
      }
      bodies.push(`<g clip-path="url(#${clipId})">${grids.join("")}</g>`);
    }
  }
  defs.push("</defs>");
  return defs.join("") + bodies.join("");
}

function pointInsideShapedRoom(
  rooms: PlacedRoom[],
  px: number,
  py: number,
): boolean {
  for (const room of rooms) {
    if (!isShapedRoom(room.shape)) continue;
    const { cx, cy, rx, ry } = roomEllipsePx(room);
    if (rx <= 0 || ry <= 0) continue;
    if (room.shape === "round") {
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      if (dx * dx + dy * dy < 0.97) return true;
      continue;
    }
    const verts = pentagonVerts(room);
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i]!.x;
      const yi = verts[i]!.y;
      const xj = verts[j]!.x;
      const yj = verts[j]!.y;
      const denom = yj - yi || Number.EPSILON;
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / denom + xi) {
        inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

function squareMap(draft: DungeonDraft, playerMap: boolean): string {
  const parts: string[] = [];
  const showGrid = draft.grid === "square";
  const rooms = roomIndexMap(draft);
  parts.push(shapedRoomMarkup(draft, "fill"));

  const maybeWall = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    if (pointInsideShapedRoom(draft.rooms, mx, my)) return;
    parts.push(line(x1, y1, x2, y2, "dungeon-gen-wall-line"));
  };

  for (let y = 0; y < draft.rows; y++) {
    for (let x = 0; x < draft.cols; x++) {
      if (!isOpen(cellAt(draft, x, y), playerMap)) continue;
      if (shapedInterior(draft, x, y, rooms)) continue;
      const x0 = x * CELL_PX;
      const y0 = y * CELL_PX;
      const x1 = x0 + CELL_PX;
      const y1 = y0 + CELL_PX;
      parts.push(
        `<rect class="dungeon-gen-floor" x="${x0}" y="${y0}" width="${CELL_PX}" height="${CELL_PX}" />`,
      );
      if (showGrid) {
        parts.push(
          `<rect class="dungeon-gen-grid-line" x="${x0}" y="${y0}" width="${CELL_PX}" height="${CELL_PX}" />`,
        );
      }
      if (!isOpen(cellAt(draft, x, y - 1), playerMap)) {
        maybeWall(x0, y0, x1, y0);
      }
      if (!isOpen(cellAt(draft, x, y + 1), playerMap)) {
        maybeWall(x0, y1, x1, y1);
      }
      if (!isOpen(cellAt(draft, x - 1, y), playerMap)) {
        maybeWall(x0, y0, x0, y1);
      }
      if (!isOpen(cellAt(draft, x + 1, y), playerMap)) {
        maybeWall(x1, y0, x1, y1);
      }
    }
  }

  parts.push(shapedRoomMarkup(draft, "stroke"));
  parts.push(growCorridorsIntoShapes(draft, playerMap, rooms));

  for (let y = 0; y < draft.rows; y++) {
    for (let x = 0; x < draft.cols; x++) {
      const cell = cellAt(draft, x, y);
      if (!cell) continue;
      if (cell.type === "door") {
        if (playerMap && cell.door === "secret") continue;
        parts.push(doorMark(draft, x, y, playerMap, rooms));
      } else if (cell.type === "stairs-up" || cell.type === "stairs-down") {
        parts.push(stairMark(x, y, cell.type === "stairs-up"));
      }
    }
  }

  return parts.join("");
}

function doorMark(
  draft: DungeonDraft,
  x: number,
  y: number,
  playerMap: boolean,
  rooms: Map<number, PlacedRoom>,
): string {
  const cell = cellAt(draft, x, y)!;
  let cx = x * CELL_PX + CELL_PX / 2;
  let cy = y * CELL_PX + CELL_PX / 2;
  let vertical = true;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    if (!shapedInterior(draft, x + dx, y + dy, rooms)) continue;
    const behind = cellAt(draft, x - dx, y - dy);
    if (!isCorridorSource(behind) || !isOpen(behind, playerMap)) continue;
    if (dx !== 0) {
      cx = dx === 1 ? (x + 1) * CELL_PX : x * CELL_PX;
      vertical = true;
    } else {
      cy = dy === 1 ? (y + 1) * CELL_PX : y * CELL_PX;
      vertical = false;
    }
    break;
  }
  if (vertical === true && cx === x * CELL_PX + CELL_PX / 2) {
    const north = isOpen(cellAt(draft, x, y - 1), playerMap);
    const south = isOpen(cellAt(draft, x, y + 1), playerMap);
    const east = isOpen(cellAt(draft, x + 1, y), playerMap);
    const west = isOpen(cellAt(draft, x - 1, y), playerMap);
    vertical = !((north || south) && !east && !west);
  }
  const kind: DoorVariant = cell.door ?? "closed";
  return placeMark(doorSymbol(kind), cx, cy, vertical);
}

function stairMark(x: number, y: number, up: boolean): string {
  const cx = x * CELL_PX + CELL_PX / 2;
  const cy = y * CELL_PX + CELL_PX / 2;
  return placeMark(stairSymbol(up), cx, cy, true);
}

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
}

function hexMap(draft: DungeonDraft, playerMap: boolean): string {
  const vertical = draft.grid === "verthex";
  const parts: string[] = [];
  for (let y = 0; y < draft.rows; y++) {
    for (let x = 0; x < draft.cols; x++) {
      const cell = cellAt(draft, x, y);
      if (!isOpen(cell, playerMap)) continue;
      const { cx, cy } = cellCenter(x, y, vertical ? "verthex" : "hex");
      const fill =
        cell?.type === "door"
          ? "#c4922a"
          : cell?.type === "stairs-up" || cell?.type === "stairs-down"
            ? "#7b2d26"
            : "#f6f0e2";
      parts.push(
        `<polygon points="${hexPoints(cx, cy, CELL_PX * 0.5)}" fill="${fill}" stroke="#1c1612" stroke-width="1.1" />`,
      );
    }
  }
  return parts.join("");
}

function contentBounds(
  draft: DungeonDraft,
  playerMap: boolean,
): { x: number; y: number; width: number; height: number } {
  const hex = draft.grid === "hex" || draft.grid === "verthex";
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < draft.rows; y++) {
    for (let x = 0; x < draft.cols; x++) {
      if (!isOpen(cellAt(draft, x, y), playerMap)) continue;
      found = true;
      const { cx, cy } = cellCenter(x, y, draft.grid);
      const half = hex ? CELL_PX * 0.62 : CELL_PX / 2;
      minX = Math.min(minX, cx - half);
      minY = Math.min(minY, cy - half);
      maxX = Math.max(maxX, cx + half);
      maxY = Math.max(maxY, cy + half);
    }
  }
  if (!found) {
    return { x: 0, y: 0, width: CELL_PX * 4, height: CELL_PX * 4 };
  }
  const pad = 22;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

const MAP_LEGEND = [
  { label: "Door", mark: () => doorSymbol("closed") },
  { label: "Archway", mark: () => doorSymbol("open") },
  { label: "Stairs up", mark: () => stairSymbol(true) },
  { label: "Stairs down", mark: () => stairSymbol(false) },
] as const;

function mapLegend(originX: number, y: number, width: number): string {
  const icon = 16;
  const labelGap = 5;
  const itemGap = 18;
  const charWidth = 6.15;
  const widths = MAP_LEGEND.map(
    (item) => icon + labelGap + item.label.length * charWidth,
  );
  const total =
    widths.reduce((sum, itemWidth) => sum + itemWidth, 0) +
    itemGap * (widths.length - 1);
  let cursor = originX + Math.max(8, (width - total) / 2);
  return MAP_LEGEND.map((item, index) => {
    const x = cursor;
    cursor += widths[index]! + itemGap;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g transform="translate(0 -8)">${item.mark()}</g><text class="dungeon-gen-caption" x="${icon + labelGap}" y="4">${item.label}</text></g>`;
  }).join("");
}

export function buildDungeonSvg(
  draft: DungeonDraft,
  options: DungeonSvgOptions = {},
): string {
  const playerMap = options.playerMap === true;
  const showLegend = options.legend === true;
  const hex = draft.grid === "hex" || draft.grid === "verthex";
  const bounds = contentBounds(draft, playerMap);
  const caption = showLegend ? 54 : 22;
  const body = hex ? hexMap(draft, playerMap) : squareMap(draft, playerMap);
  const x = bounds.x.toFixed(1);
  const y = bounds.y.toFixed(1);
  const viewW = bounds.width.toFixed(1);
  const captionY = bounds.y + bounds.height;
  const scale = `<text class="dungeon-gen-caption" x="${(bounds.x + bounds.width / 2).toFixed(1)}" y="${(captionY + 14).toFixed(1)}" text-anchor="middle">1 square = 10 feet</text>`;
  const legend = showLegend
    ? mapLegend(bounds.x, captionY + 38, bounds.width)
    : "";
  const viewH = (bounds.height + caption).toFixed(1);
  const frame =
    `<rect fill="url(#dungeon-stone-hatch)" x="${x}" y="${y}" width="${viewW}" height="${bounds.height.toFixed(1)}" />` +
    `<rect fill="${MARK_PAPER}" x="${x}" y="${captionY.toFixed(1)}" width="${viewW}" height="${caption}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${viewW} ${viewH}" class="dungeon-gen-map" data-grid="${draft.grid}" role="img" aria-label="Dungeon map"><style>${MAP_STYLE}</style>${STONE_DEFS}${frame}${body}${roomLabels(draft, playerMap)}${scale}${legend}</svg>`;
}

export function formatDungeonKeyPlain(draft: DungeonDraft): string {
  const lines = [draft.name, "1 square = 10 feet", ""];
  for (const entry of draft.keys) {
    const doorText =
      entry.doors.length > 0 ? ` Doors: ${entry.doors.join("; ")}.` : "";
    lines.push(
      `Room ${entry.number} (${entry.widthFt} ft. by ${entry.heightFt} ft.). ${entry.detail}${doorText}`,
    );
    lines.push("");
  }
  return lines.join("\n").trim();
}
