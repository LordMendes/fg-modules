import { createSeededRng, type SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { DungeonDraft, GridCell, PlacedRoom } from "@/lib/dungeon/types";

const COLS = 48;
const ROWS = 36;
const MARGIN = 2;

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const LAYOUTS: readonly (readonly Rect[])[] = [
  [
    { x: 3, y: 12, w: 7, h: 6 },
    { x: 14, y: 4, w: 6, h: 5 },
    { x: 13, y: 20, w: 7, h: 6 },
    { x: 24, y: 11, w: 6, h: 6 },
    { x: 34, y: 5, w: 6, h: 7 },
  ],
  [
    { x: 3, y: 13, w: 6, h: 6 },
    { x: 12, y: 13, w: 6, h: 5 },
    { x: 21, y: 8, w: 6, h: 6 },
    { x: 21, y: 18, w: 6, h: 5 },
    { x: 31, y: 12, w: 6, h: 6 },
  ],
  [
    { x: 4, y: 13, w: 6, h: 6 },
    { x: 14, y: 4, w: 7, h: 5 },
    { x: 27, y: 13, w: 6, h: 6 },
    { x: 14, y: 22, w: 7, h: 5 },
    { x: 16, y: 13, w: 5, h: 5 },
  ],
  [
    { x: 4, y: 3, w: 7, h: 5 },
    { x: 16, y: 3, w: 6, h: 5 },
    { x: 8, y: 12, w: 8, h: 6 },
    { x: 4, y: 22, w: 6, h: 5 },
    { x: 16, y: 22, w: 7, h: 5 },
  ],
  [
    { x: 3, y: 6, w: 6, h: 7 },
    { x: 12, y: 6, w: 6, h: 5 },
    { x: 22, y: 5, w: 6, h: 6 },
    { x: 12, y: 16, w: 7, h: 6 },
    { x: 24, y: 16, w: 6, h: 6 },
  ],
];

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

function emptyGrid(): GridCell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ type: "wall" as const })),
  );
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function separated(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function fits(rects: Rect[]): boolean {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]!;
    if (rect.w < 4 || rect.h < 4 || rect.w > 8 || rect.h > 8) return false;
    if (rect.x < MARGIN || rect.y < MARGIN) return false;
    if (rect.x + rect.w > COLS - MARGIN || rect.y + rect.h > ROWS - MARGIN) {
      return false;
    }
    for (let j = i + 1; j < rects.length; j++) {
      if (!separated(rect, rects[j]!, 2)) return false;
    }
  }
  return true;
}

function withJitter(base: readonly Rect[], rng: SeededRng): Rect[] {
  for (let attempt = 0; attempt < 24; attempt++) {
    const next = base.map((rect) => ({
      x: rect.x + rng.pickInt(-1, 1),
      y: rect.y + rng.pickInt(-1, 1),
      w: rect.w + rng.pickInt(-1, 1),
      h: rect.h + rng.pickInt(-1, 1),
    }));
    if (fits(next)) return next;
  }
  return base.map((rect) => ({ ...rect }));
}

function paintRooms(grid: GridCell[][], rooms: PlacedRoom[]): void {
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        grid[y]![x] = { type: "floor", roomIndex: room.index };
      }
    }
  }
}

function adjacentWalls(grid: GridCell[][], room: PlacedRoom): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(nx, ny)) continue;
        if (grid[ny]![nx]!.type !== "wall") continue;
        const id = `${nx},${ny}`;
        if (seen.has(id)) continue;
        seen.add(id);
        points.push({ x: nx, y: ny });
      }
    }
  }
  return points;
}

function roomCenter(room: PlacedRoom): Point {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  };
}

function touchedRooms(grid: GridCell[][], x: number, y: number): number[] {
  const found: number[] = [];
  for (const [dx, dy] of DIRS) {
    const cell = grid[y + dy]?.[x + dx];
    if (cell?.roomIndex === undefined || cell.type === "door") continue;
    if (!found.includes(cell.roomIndex)) found.push(cell.roomIndex);
  }
  return found;
}

function canStep(
  grid: GridCell[][],
  x: number,
  y: number,
  start: Point,
  goal: Point,
  strict: boolean,
): boolean {
  if (!inBounds(x, y)) return false;
  if ((x === start.x && y === start.y) || (x === goal.x && y === goal.y)) {
    return true;
  }
  const cell = grid[y]![x]!;
  if (cell.roomIndex !== undefined && cell.type !== "door") return false;
  if (cell.type === "door" || cell.corridor) return true;
  if (cell.type !== "wall") return false;
  if (!strict) return true;
  return touchedRooms(grid, x, y).length === 0;
}

function shortestPath(
  grid: GridCell[][],
  start: Point,
  goal: Point,
  strict: boolean,
): Point[] | null {
  const heuristic = (point: Point) =>
    (Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y)) * 10;
  const startKey = keyOf(start);
  const gScore = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, Point>();
  const closed = new Set<string>();
  const open: { point: Point; score: number }[] = [
    { point: start, score: heuristic(start) },
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.score - b.score);
    const current = open.shift()!.point;
    const currentKey = keyOf(current);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    if (current.x === goal.x && current.y === goal.y) {
      const path = [current];
      let cursor = current;
      while (previous.has(keyOf(cursor))) {
        cursor = previous.get(keyOf(cursor))!;
        path.push(cursor);
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!canStep(grid, nx, ny, start, goal, strict)) continue;
      if (closed.has(`${nx},${ny}`)) continue;
      const nextScore = (gScore.get(currentKey) ?? 0) + 10;
      const nextKey = `${nx},${ny}`;
      if (nextScore >= (gScore.get(nextKey) ?? Infinity)) continue;
      gScore.set(nextKey, nextScore);
      previous.set(nextKey, current);
      open.push({
        point: { x: nx, y: ny },
        score: nextScore + heuristic({ x: nx, y: ny }),
      });
    }
  }
  return null;
}

function carvePath(
  grid: GridCell[][],
  path: Point[],
  entranceRoom: number | null,
): void {
  for (let i = 0; i < path.length; i++) {
    const point = path[i]!;
    const existing = grid[point.y]![point.x]!;
    if (existing.roomIndex !== undefined && existing.type !== "door") continue;
    if (existing.type === "door" || existing.corridor) continue;
    const beside = touchedRooms(grid, point.x, point.y);
    if (beside.length > 0) {
      const arch =
        entranceRoom !== null && i === 0 && beside.includes(entranceRoom);
      grid[point.y]![point.x] = {
        type: "door",
        door: arch ? "open" : "closed",
        corridor: true,
      };
    } else {
      grid[point.y]![point.x] = { type: "floor", corridor: true };
    }
  }
}

function pickPortal(
  grid: GridCell[][],
  from: PlacedRoom,
  to: PlacedRoom,
  rng: SeededRng,
): Point | null {
  const cells = adjacentWalls(grid, from);
  if (cells.length === 0) return null;
  const origin = roomCenter(from);
  const aim = roomCenter(to);
  const dx = aim.x - origin.x;
  const dy = aim.y - origin.y;
  const ranked = cells
    .map((point) => ({
      point,
      score:
        (point.x - origin.x) * dx +
        (point.y - origin.y) * dy +
        rng.next() * 6,
    }))
    .sort((a, b) => b.score - a.score);
  const pool = ranked.slice(0, Math.min(4, ranked.length));
  return pool[rng.pickInt(0, pool.length - 1)]!.point;
}

function connectRooms(
  grid: GridCell[][],
  from: PlacedRoom,
  to: PlacedRoom,
  rng: SeededRng,
): boolean {
  for (let attempt = 0; attempt < 8; attempt++) {
    const start = pickPortal(grid, from, to, rng);
    const goal = pickPortal(grid, to, from, rng);
    if (!start || !goal) return false;
    if (start.x === goal.x && start.y === goal.y) continue;
    const path =
      shortestPath(grid, start, goal, true) ??
      shortestPath(grid, start, goal, false);
    if (!path) continue;
    carvePath(grid, path, null);
    return true;
  }
  return false;
}

function addEntrance(
  grid: GridCell[][],
  room: PlacedRoom,
  rng: SeededRng,
): void {
  const origin = roomCenter(room);
  const goals = [
    { x: 0, y: origin.y },
    { x: COLS - 1, y: origin.y },
    { x: origin.x, y: 0 },
    { x: origin.x, y: ROWS - 1 },
  ]
    .map((point) => ({
      ...point,
      dist: Math.abs(point.x - origin.x) + Math.abs(point.y - origin.y),
    }))
    .sort((a, b) => a.dist - b.dist);
  const starts = adjacentWalls(grid, room);
  if (starts.length === 0) return;
  const goal =
    goals[1]!.dist - goals[0]!.dist <= 3 && rng.next() < 0.45
      ? goals[1]!
      : goals[0]!;
  starts.sort((a, b) => {
    const left = Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
    const right = Math.abs(b.x - goal.x) + Math.abs(b.y - goal.y);
    return left - right;
  });
  const start = starts[rng.pickInt(0, Math.min(2, starts.length - 1))]!;
  const path =
    shortestPath(grid, start, goal, true) ??
    shortestPath(grid, start, goal, false);
  if (!path) return;
  carvePath(grid, path, room.index);
}

function canBump(grid: GridCell[][], x: number, y: number, roomIndex: number): boolean {
  if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) return false;
  if (grid[y]![x]!.type !== "wall") return false;
  for (const [dx, dy] of DIRS) {
    const neighbor = grid[y + dy]?.[x + dx];
    if (!neighbor || neighbor.roomIndex === undefined || neighbor.type === "door") {
      continue;
    }
    if (neighbor.roomIndex !== roomIndex) return false;
  }
  return true;
}

function addBump(grid: GridCell[][], room: PlacedRoom, rng: SeededRng): void {
  const side = rng.pickInt(0, 3);
  const horizontal = side === 1 || side === 3;
  const along = horizontal ? room.h : room.w;
  const span = Math.min(rng.pickInt(2, 4), along);
  const offset = rng.pickInt(0, along - span);
  const depth = rng.pickInt(1, 2);
  const cells: Point[] = [];
  for (let i = 0; i < span; i++) {
    for (let step = 1; step <= depth; step++) {
      let x = room.x;
      let y = room.y;
      if (side === 0) {
        x = room.x + offset + i;
        y = room.y - step;
      } else if (side === 1) {
        x = room.x + room.w - 1 + step;
        y = room.y + offset + i;
      } else if (side === 2) {
        x = room.x + offset + i;
        y = room.y + room.h - 1 + step;
      } else {
        x = room.x - step;
        y = room.y + offset + i;
      }
      cells.push({ x, y });
    }
  }
  if (!cells.every((cell) => canBump(grid, cell.x, cell.y, room.index))) return;
  for (const cell of cells) {
    grid[cell.y]![cell.x] = { type: "floor", roomIndex: room.index };
  }
  room.extra.push(...cells);
}

function placeEntranceStairs(grid: GridCell[][], room: PlacedRoom): void {
  const label = {
    x: room.x + Math.floor((room.w - 1) / 2),
    y: room.y + Math.floor((room.h - 1) / 2),
  };
  const options = [
    { x: label.x, y: label.y - 1, kind: "stairs-up" as const },
    { x: label.x, y: label.y + 1, kind: "stairs-down" as const },
    { x: label.x - 1, y: label.y, kind: "stairs-up" as const },
    { x: label.x + 1, y: label.y, kind: "stairs-down" as const },
  ];
  const used = new Set<string>();
  for (const option of options) {
    if (used.size >= 2) break;
    if (option.x < room.x || option.y < room.y) continue;
    if (option.x >= room.x + room.w || option.y >= room.y + room.h) continue;
    const id = `${option.x},${option.y}`;
    if (used.has(id) || id === `${label.x},${label.y}`) continue;
    const cell = grid[option.y]![option.x]!;
    if (cell.type !== "floor" || cell.roomIndex !== room.index) continue;
    if ([...used].some((entry) => gridCellKind(grid, entry) === option.kind)) continue;
    grid[option.y]![option.x] = { type: option.kind, roomIndex: room.index };
    used.add(id);
  }
}

function gridCellKind(grid: GridCell[][], id: string): GridCell["type"] | undefined {
  const [x, y] = id.split(",").map(Number);
  return grid[y!]![x!]!.type;
}

function roomsConnected(grid: GridCell[][], rooms: PlacedRoom[]): boolean {
  const start = roomCenter(rooms[0]!);
  const seen = new Set<string>([keyOf(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const id = `${nx},${ny}`;
      if (seen.has(id) || !inBounds(nx, ny)) continue;
      if (grid[ny]![nx]!.type === "wall") continue;
      seen.add(id);
      queue.push({ x: nx, y: ny });
    }
  }
  return rooms.every((room) => {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (seen.has(`${x},${y}`)) return true;
      }
    }
    return false;
  });
}

function tryLayout(
  base: readonly Rect[],
  rng: SeededRng,
  allowJitter: boolean,
): Omit<DungeonDraft, "name" | "seed"> | null {
  const rects = allowJitter
    ? withJitter(base, rng)
    : base.map((rect) => ({ ...rect }));
  if (!fits(rects)) return null;
  const grid = emptyGrid();
  const rooms: PlacedRoom[] = rects.map((rect, index) => ({
    index,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    extra: [],
    shape: "rectangle",
  }));
  paintRooms(grid, rooms);
  for (let i = 0; i < rooms.length - 1; i++) {
    if (!connectRooms(grid, rooms[i]!, rooms[i + 1]!, rng)) return null;
  }
  if (rng.next() < 0.65) {
    const links: [number, number][] = [
      [0, 2],
      [1, 3],
      [2, 4],
      [0, 3],
      [1, 4],
    ];
    const [from, to] = links[rng.pickInt(0, links.length - 1)]!;
    connectRooms(grid, rooms[from]!, rooms[to]!, rng);
  }
  addEntrance(grid, rooms[0]!, rng);
  for (const room of rooms) {
    if (rng.next() < 0.5) addBump(grid, room, rng);
  }
  placeEntranceStairs(grid, rooms[0]!);
  if (!roomsConnected(grid, rooms)) return null;
  return {
    level: 1,
    cols: COLS,
    rows: ROWS,
    grid: "square",
    cells: grid,
    rooms,
    keys: [],
  };
}

export function buildFiveRoomMap(
  seed: number,
  name: string,
  level = 1,
): DungeonDraft {
  const rng = createSeededRng(seed + 7919);
  const order = rng.shuffle(LAYOUTS.map((_, index) => index));
  for (const layoutIndex of order) {
    const drafted = tryLayout(LAYOUTS[layoutIndex]!, rng, true);
    if (!drafted) continue;
    return { ...drafted, name, seed, level };
  }
  const fallback = tryLayout(LAYOUTS[0]!, rng, false);
  if (!fallback) {
    throw new Error(`Five room map could not be placed for seed ${seed}`);
  }
  return { ...fallback, name, seed, level };
}
