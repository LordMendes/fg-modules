import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import { rollDungeonName, stockRooms } from "./stocking";
import type {
  DoorVariant,
  DungeonCorridors,
  DungeonDeadends,
  DungeonDoors,
  DungeonDraft,
  DungeonEgress,
  DungeonInput,
  DungeonLayout,
  DungeonRoomLayout,
  DungeonRoomSize,
  GridCell,
  PlacedRoom,
  RoomShape,
} from "./types";
import { DEFAULT_DUNGEON_INPUT, SIZE_CELL_COUNTS as SIZE_TABLE } from "./types";

export { DEFAULT_DUNGEON_INPUT };

type Dir = "north" | "south" | "west" | "east";
type Point = { x: number; y: number };

const NOTHING = 0x00000000;
const BLOCKED = 0x00000001;
const ROOM = 0x00000002;
const CORRIDOR = 0x00000004;
const PERIMETER = 0x00000010;
const ENTRANCE = 0x00000020;
const ROOM_ID = 0x0000ffc0;
const ARCH = 0x00010000;
const DOOR = 0x00020000;
const LOCKED = 0x00040000;
const TRAPPED = 0x00080000;
const SECRET = 0x00100000;
const PORTC = 0x00200000;
const STAIR_DN = 0x00400000;
const STAIR_UP = 0x00800000;

const OPENSPACE = ROOM | CORRIDOR;
const DOORSPACE = ARCH | DOOR | LOCKED | TRAPPED | SECRET | PORTC;
const ESPACE = ENTRANCE | DOORSPACE | 0xff000000;
const STAIRS = STAIR_DN | STAIR_UP;
const BLOCK_CORR = BLOCKED | PERIMETER | CORRIDOR;
const BLOCK_DOOR = BLOCKED | DOORSPACE;

const DI: Record<Dir, number> = {
  north: -1,
  south: 1,
  west: 0,
  east: 0,
};
const DJ: Record<Dir, number> = {
  north: 0,
  south: 0,
  west: -1,
  east: 1,
};
const DIRS: Dir[] = ["east", "north", "south", "west"];
const OPPOSITE: Record<Dir, Dir> = {
  north: "south",
  south: "north",
  west: "east",
  east: "west",
};

const STAIR_END: Record<
  Dir,
  { walled: [number, number][]; corridor: [number, number][]; next: [number, number] }
> = {
  north: {
    walled: [
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    corridor: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    next: [1, 0],
  },
  south: {
    walled: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
    ],
    corridor: [
      [0, 0],
      [-1, 0],
      [-2, 0],
    ],
    next: [-1, 0],
  },
  west: {
    walled: [
      [-1, 1],
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
    ],
    corridor: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    next: [0, 1],
  },
  east: {
    walled: [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
    ],
    corridor: [
      [0, 0],
      [0, -1],
      [0, -2],
    ],
    next: [0, -1],
  },
};

const CLOSE_END: Record<
  Dir,
  { walled: [number, number][]; close: [number, number][]; recurse: [number, number] }
> = {
  north: {
    walled: [
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    close: [[0, 0]],
    recurse: [-1, 0],
  },
  south: {
    walled: [
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ],
    close: [[0, 0]],
    recurse: [1, 0],
  },
  west: {
    walled: [
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
    ],
    close: [[0, 0]],
    recurse: [0, -1],
  },
  east: {
    walled: [
      [-1, 0],
      [-1, -1],
      [0, -1],
      [1, -1],
      [1, 0],
    ],
    close: [[0, 0]],
    recurse: [0, 1],
  },
};

type RoomRec = {
  id: number;
  north: number;
  south: number;
  west: number;
  east: number;
  shape: RoomShape;
  doors: Partial<Record<Dir, { r: number; c: number; outId?: number }[]>>;
};

type Dungeon = {
  nRows: number;
  nCols: number;
  nI: number;
  nJ: number;
  maxRow: number;
  maxCol: number;
  roomBase: number;
  roomRadix: number;
  nRooms: number;
  cell: number[][];
  rooms: RoomRec[];
  rng: SeededRng;
  corridorStraight: number;
  doors: DungeonDoors;
  polymorph: DungeonInput["polymorph"];
};

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function randN(rng: SeededRng, n: number): number {
  if (n <= 0) return 0;
  return Math.floor(rng.next() * n);
}

export function resolveDimensions(input: DungeonInput): {
  cols: number;
  rows: number;
} {
  const raw =
    input.size === "custom"
      ? {
          cols: clampInt(input.cols, 20, 120),
          rows: clampInt(input.rows, 20, 120),
        }
      : SIZE_TABLE[input.size];
  const nI = Math.floor(raw.rows / 2);
  const nJ = Math.floor(raw.cols / 2);
  return { cols: nJ * 2 + 1, rows: nI * 2 + 1 };
}

function roomSizeRange(size: DungeonRoomSize): { min: number; max: number } {
  switch (size) {
    case "small":
      return { min: 3, max: 5 };
    case "medium":
      return { min: 3, max: 9 };
    case "large":
      return { min: 5, max: 11 };
    case "huge":
      return { min: 7, max: 13 };
    case "gargantuan":
      return { min: 9, max: 15 };
    case "colossal":
      return { min: 11, max: 19 };
    default:
      return { min: 3, max: 9 };
  }
}

function corridorBias(style: DungeonCorridors): number {
  if (style === "labyrinth") return 0;
  if (style === "straight") return 100;
  return 50;
}

function deadendPercent(mode: DungeonDeadends): number {
  if (mode === "none") return 0;
  if (mode === "all") return 100;
  return 50;
}

function stairCount(mode: DungeonInput["stairs"]): number {
  if (mode === "none") return 0;
  if (mode === "many") return 4;
  return 2;
}

function inGrid(d: Dungeon, r: number, c: number): boolean {
  return r >= 0 && r <= d.nRows && c >= 0 && c <= d.nCols;
}

function bits(d: Dungeon, r: number, c: number): number {
  return d.cell[r]?.[c] ?? BLOCKED;
}

function setBits(d: Dungeon, r: number, c: number, value: number): void {
  if (inGrid(d, r, c)) d.cell[r]![c] = value;
}

function roomIdAt(cell: number): number {
  return (cell & ROOM_ID) >> 6;
}

function pointInPolygon(
  x: number,
  y: number,
  verts: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i]!.x;
    const yi = verts[i]!.y;
    const xj = verts[j]!.x;
    const yj = verts[j]!.y;
    const denom = yj - yi || Number.EPSILON;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / denom + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function roomEllipse(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): { cx: number; cy: number; rx: number; ry: number } {
  const width = c2 - c1 + 1;
  const height = r2 - r1 + 1;
  const radius = Math.min(width, height) / 2;
  return {
    cx: c1 + width / 2,
    cy: r1 + height / 2,
    rx: radius,
    ry: radius,
  };
}

function roomShapeVerts(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): { x: number; y: number }[] {
  const { cx, cy, rx, ry } = roomEllipse(r1, c1, r2, c2);
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

function cellInRoomShape(
  r: number,
  c: number,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  shape: RoomShape,
): boolean {
  if (shape === "rectangle") return true;
  const { cx, cy, rx, ry } = roomEllipse(r1, c1, r2, c2);
  if (rx <= 0 || ry <= 0) return true;
  const x = c + 0.5;
  const y = r + 0.5;
  if (shape === "round") {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return pointInPolygon(x, y, roomShapeVerts(r1, c1, r2, c2));
}

function adjacentToRoom(d: Dungeon, r: number, c: number): boolean {
  for (const dir of DIRS) {
    const nr = r + DI[dir];
    const nc = c + DJ[dir];
    if (bits(d, nr, nc) & ROOM) return true;
  }
  return false;
}

function isRoomCell(d: Dungeon, r: number, c: number, id: number): boolean {
  if (!inGrid(d, r, c)) return false;
  const cell = bits(d, r, c);
  return Boolean(cell & ROOM) && roomIdAt(cell) === id;
}

function emptyCells(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => NOTHING),
  );
}

function applyLayoutMask(
  d: Dungeon,
  layout: DungeonLayout,
): boolean[][] {
  const rows = d.nRows + 1;
  const cols = d.nCols + 1;
  const mask = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => true),
  );
  const cx = d.nCols / 2;
  const cy = d.nRows / 2;
  const shortSide = Math.min(d.nCols, d.nRows);
  const block = (r: number, c: number) => {
    mask[r]![c] = false;
    d.cell[r]![c] = BLOCKED;
  };

  const stampPattern = (pattern: number[][]) => {
    const rScale = pattern.length / rows;
    const cScale = pattern[0]!.length / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pr = Math.min(pattern.length - 1, Math.floor(r * rScale));
        const pc = Math.min(pattern[0]!.length - 1, Math.floor(c * cScale));
        if (!pattern[pr]![pc]) block(r, c);
      }
    }
  };

  switch (layout) {
    case "square": {
      const side = Math.min(d.nCols, d.nRows);
      const c0 = Math.floor((d.nCols - side) / 2);
      const r0 = Math.floor((d.nRows - side) / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c < c0 || c > c0 + side || r < r0 || r > r0 + side) block(r, c);
        }
      }
      break;
    }
    case "box":
      stampPattern([
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
      ]);
      break;
    case "cross":
      stampPattern([
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ]);
      break;
    case "dagger": {
      const bar = Math.max(3, Math.floor(shortSide * 0.3));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dc = c - cx;
          const dr = r - cy;
          const vertical = Math.abs(dc) <= bar / 2;
          const horizontal = Math.abs(dr) <= bar / 2;
          const diag = Math.abs(dc - dr) <= 1.5;
          if (!vertical && !horizontal && !diag) block(r, c);
        }
      }
      break;
    }
    case "saltire": {
      const width = Math.max(3, Math.floor(shortSide * 0.12));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dc = c - cx;
          const dr = r - cy;
          if (Math.abs(dc - dr) > width && Math.abs(dc + dr) > width) {
            block(r, c);
          }
        }
      }
      break;
    }
    case "keep": {
      const innerW = Math.floor(d.nCols * 0.45);
      const innerH = Math.floor(d.nRows * 0.45);
      const c0 = Math.floor((d.nCols - innerW) / 2);
      const r0 = Math.floor((d.nRows - innerH) / 2);
      for (let r = r0; r <= r0 + innerH; r++) {
        for (let c = c0; c <= c0 + innerW; c++) {
          if (inGrid(d, r, c)) block(r, c);
        }
      }
      break;
    }
    case "hexagon": {
      const radius = shortSide / 2 - 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dc = Math.abs(c - cx);
          const dr = Math.abs(r - cy);
          if ((dc + dr + Math.abs(dc - dr)) / 2 > radius) block(r, c);
        }
      }
      break;
    }
    case "round":
    case "cavernous": {
      const radius = cx;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dc = c - cx;
          const dr = r - cy;
          if (Math.sqrt(dc * dc + dr * dr) > radius) block(r, c);
        }
      }
      break;
    }
    default:
      break;
  }

  return mask;
}

export function buildMask(
  layout: DungeonLayout,
  cols: number,
  rows: number,
  _rng: SeededRng,
): boolean[][] {
  const nI = Math.floor(rows / 2);
  const nJ = Math.floor(cols / 2);
  const d: Dungeon = {
    nRows: nI * 2,
    nCols: nJ * 2,
    nI,
    nJ,
    maxRow: nI * 2 - 1,
    maxCol: nJ * 2 - 1,
    roomBase: 2,
    roomRadix: 2,
    nRooms: 0,
    cell: emptyCells(nI * 2 + 1, nJ * 2 + 1),
    rooms: [],
    rng: _rng,
    corridorStraight: 50,
    doors: "standard",
  };
  const mask = applyLayoutMask(d, layout);
  if (mask.length === rows && mask[0]!.length === cols) return mask;
  const fitted = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => mask[r]?.[c] ?? false),
  );
  return fitted;
}

function setRoom(
  d: Dungeon,
  proto: { i?: number; j?: number; height?: number; width?: number },
): { i: number; j: number; height: number; width: number } {
  let height = proto.height;
  let width = proto.width;
  let i = proto.i;
  let j = proto.j;

  if (height === undefined) {
    if (i !== undefined) {
      let a = d.nI - d.roomBase - i;
      if (a < 0) a = 0;
      const r = a < d.roomRadix ? a : d.roomRadix;
      height = randN(d.rng, r) + d.roomBase;
    } else {
      height = randN(d.rng, d.roomRadix) + d.roomBase;
    }
  }
  if (width === undefined) {
    if (j !== undefined) {
      let a = d.nJ - d.roomBase - j;
      if (a < 0) a = 0;
      const r = a < d.roomRadix ? a : d.roomRadix;
      width = randN(d.rng, r) + d.roomBase;
    } else {
      width = randN(d.rng, d.roomRadix) + d.roomBase;
    }
  }
  if (i === undefined) {
    i = randN(d.rng, Math.max(1, d.nI - height));
  }
  if (j === undefined) {
    j = randN(d.rng, Math.max(1, d.nJ - width));
  }
  return { i, j, height, width };
}

function soundRoom(
  d: Dungeon,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): { blocked: boolean; hits: number } {
  let hits = 0;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = bits(d, r, c);
      if (cell & BLOCKED) return { blocked: true, hits: 0 };
      if (cell & ROOM) hits += 1;
    }
  }
  return { blocked: false, hits };
}

function emplaceRoom(
  d: Dungeon,
  proto: {
    i?: number;
    j?: number;
    height?: number;
    width?: number;
  } = {},
): boolean {
  if (d.nRooms >= 80) return false;
  const placed = setRoom(d, proto);
  const r1 = placed.i * 2 + 1;
  const c1 = placed.j * 2 + 1;
  const r2 = (placed.i + placed.height) * 2 - 1;
  const c2 = (placed.j + placed.width) * 2 - 1;
  if (r1 < 1 || r2 > d.maxRow || c1 < 1 || c2 > d.maxCol) return false;
  const hit = soundRoom(d, r1, c1, r2, c2);
  if (hit.blocked || hit.hits > 0) return false;

  const roomId = d.nRooms + 1;
  d.nRooms = roomId;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      let cell = bits(d, r, c);
      if (cell & ENTRANCE) cell &= ~ESPACE;
      else if (cell & PERIMETER) cell &= ~PERIMETER;
      setBits(d, r, c, cell | ROOM | (roomId << 6));
    }
  }

  for (let r = r1 - 1; r <= r2 + 1; r++) {
    if (!(bits(d, r, c1 - 1) & (ROOM | ENTRANCE))) {
      setBits(d, r, c1 - 1, bits(d, r, c1 - 1) | PERIMETER);
    }
    if (!(bits(d, r, c2 + 1) & (ROOM | ENTRANCE))) {
      setBits(d, r, c2 + 1, bits(d, r, c2 + 1) | PERIMETER);
    }
  }
  for (let c = c1 - 1; c <= c2 + 1; c++) {
    if (!(bits(d, r1 - 1, c) & (ROOM | ENTRANCE))) {
      setBits(d, r1 - 1, c, bits(d, r1 - 1, c) | PERIMETER);
    }
    if (!(bits(d, r2 + 1, c) & (ROOM | ENTRANCE))) {
      setBits(d, r2 + 1, c, bits(d, r2 + 1, c) | PERIMETER);
    }
  }

  d.rooms[roomId] = {
    id: roomId,
    north: r1,
    south: r2,
    west: c1,
    east: c2,
    shape: "rectangle",
    doors: {},
  };
  return true;
}

function stampRoomFloors(
  d: Dungeon,
  room: RoomRec,
  floors: { r: number; c: number }[],
): void {
  const r1 = room.north;
  const r2 = room.south;
  const c1 = room.west;
  const c2 = room.east;
  const id = room.id;
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (isRoomCell(d, r, c, id)) setBits(d, r, c, NOTHING);
    }
  }
  for (const { r, c } of floors) {
    const cell = bits(d, r, c) & ~PERIMETER;
    setBits(d, r, c, cell | ROOM | (id << 6));
  }
  for (let r = r1 - 1; r <= r2 + 1; r++) {
    for (let c = c1 - 1; c <= c2 + 1; c++) {
      if (!inGrid(d, r, c)) continue;
      const cell = bits(d, r, c);
      if (!(cell & PERIMETER) || cell & ROOM) continue;
      if (!adjacentToRoom(d, r, c)) setBits(d, r, c, cell & ~PERIMETER);
    }
  }
  for (const { r, c } of floors) {
    for (const dir of DIRS) {
      const nr = r + DI[dir];
      const nc = c + DJ[dir];
      if (!inGrid(d, nr, nc)) continue;
      const neighbor = bits(d, nr, nc);
      if (neighbor & (ROOM | ENTRANCE)) continue;
      setBits(d, nr, nc, neighbor | PERIMETER);
    }
  }
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = bits(d, r, c);
      if (cell & (ROOM | ENTRANCE | DOORSPACE | CORRIDOR | PERIMETER)) continue;
      setBits(d, r, c, BLOCKED);
    }
  }
}

function recarveRoom(d: Dungeon, room: RoomRec, shape: RoomShape): boolean {
  if (shape === "rectangle") return false;
  const r1 = room.north;
  const r2 = room.south;
  const c1 = room.west;
  const c2 = room.east;
  const bbox = (r2 - r1 + 1) * (c2 - c1 + 1);
  const floors: { r: number; c: number }[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (cellInRoomShape(r, c, r1, c1, r2, c2, shape)) {
        floors.push({ r, c });
      }
    }
  }
  if (floors.length < 8 || bbox - floors.length < 4) return false;
  stampRoomFloors(d, room, floors);
  room.shape = shape;
  return true;
}

function adjacentToRoomId(
  d: Dungeon,
  r: number,
  c: number,
  id: number,
): boolean {
  for (const dir of DIRS) {
    if (isRoomCell(d, r + DI[dir], c + DJ[dir], id)) return true;
  }
  return false;
}

function adjacentToCorridor(d: Dungeon, r: number, c: number): boolean {
  for (const dir of DIRS) {
    const cell = bits(d, r + DI[dir], c + DJ[dir]);
    if ((cell & CORRIDOR) && !(cell & ROOM)) return true;
  }
  return false;
}

function sealShapedRoomLeftovers(d: Dungeon): void {
  for (let id = 1; id <= d.nRooms; id++) {
    const room = d.rooms[id];
    if (!room || (room.shape !== "round" && room.shape !== "pentagon")) continue;
    for (let r = room.north; r <= room.south; r++) {
      for (let c = room.west; c <= room.east; c++) {
        if (isRoomCell(d, r, c, id)) continue;
        const cell = bits(d, r, c);
        if (!(cell & (CORRIDOR | ENTRANCE))) continue;
        if (cell & DOORSPACE) continue;
        setBits(d, r, c, NOTHING);
      }
    }
    for (let r = room.north; r <= room.south; r++) {
      for (let c = room.west; c <= room.east; c++) {
        if (isRoomCell(d, r, c, id)) continue;
        const cell = bits(d, r, c);
        if (!(cell & DOORSPACE)) continue;
        if (adjacentToRoomId(d, r, c, id) && adjacentToCorridor(d, r, c)) {
          continue;
        }
        setBits(d, r, c, NOTHING);
      }
    }
  }
}

function findMirrorRoom(d: Dungeon, room: RoomRec): RoomRec | undefined {
  const mWest = d.nCols - room.east;
  const mEast = d.nCols - room.west;
  if (mWest === room.west && mEast === room.east) return undefined;
  for (let id = 1; id <= d.nRooms; id++) {
    const other = d.rooms[id];
    if (!other || other.id === room.id) continue;
    if (
      other.north === room.north &&
      other.south === room.south &&
      other.west === mWest &&
      other.east === mEast
    ) {
      return other;
    }
  }
  return undefined;
}

function polymorphRooms(d: Dungeon): void {
  if (d.polymorph === "none") return;
  const eligible: RoomRec[] = [];
  for (let id = 1; id <= d.nRooms; id++) {
    const room = d.rooms[id];
    if (!room) continue;
    const w = room.east - room.west + 1;
    const h = room.south - room.north + 1;
    if (w >= 5 && h >= 5) eligible.push(room);
  }
  eligible.sort((a, b) => {
    const areaA = (a.east - a.west + 1) * (a.south - a.north + 1);
    const areaB = (b.east - b.west + 1) * (b.south - b.north + 1);
    return areaB - areaA;
  });
  if (eligible.length === 0) return;
  const fraction = d.polymorph === "many" ? 0.75 : 0.5;
  const minCount = d.polymorph === "many" ? 4 : 3;
  const want = Math.min(
    eligible.length,
    Math.max(minCount, Math.round(eligible.length * fraction)),
  );
  const carved = new Set<number>();
  let firstShape: RoomShape | undefined;
  for (let i = 0; i < eligible.length && carved.size < want; i++) {
    const room = eligible[i]!;
    if (carved.has(room.id)) continue;
    let shape: RoomShape;
    if (!firstShape) {
      shape = d.rng.next() < 0.5 ? "round" : "pentagon";
      firstShape = shape;
    } else if (carved.size === 1) {
      shape = firstShape === "round" ? "pentagon" : "round";
    } else {
      shape = d.rng.next() < 0.5 ? "round" : "pentagon";
    }
    if (!recarveRoom(d, room, shape)) continue;
    carved.add(room.id);
    const mirror = findMirrorRoom(d, room);
    if (mirror && !carved.has(mirror.id)) {
      if (recarveRoom(d, mirror, shape)) carved.add(mirror.id);
    }
  }
}

function packRooms(d: Dungeon): void {
  for (let i = 0; i < d.nI; i++) {
    const r = i * 2 + 1;
    for (let j = 0; j < d.nJ; j++) {
      const c = j * 2 + 1;
      if (bits(d, r, c) & ROOM) continue;
      if ((i === 0 || j === 0) && randN(d.rng, 2)) continue;
      emplaceRoom(d, { i, j });
    }
  }
}

function allocRooms(d: Dungeon, layout: DungeonRoomLayout): number {
  const dungeonArea = d.nCols * d.nRows;
  const maxCell = (d.roomBase + d.roomRadix - 1) * 2 - 1;
  const denom = Math.max(9, maxCell * maxCell);
  let n = Math.floor(dungeonArea / denom);
  if (layout === "sparse") n = Math.floor(n * 0.5);
  return clampInt(n, 4, 80);
}

function scatterRooms(d: Dungeon, count: number, symmetric: boolean): void {
  for (let i = 0; i < count; i++) {
    const before = d.nRooms;
    emplaceRoom(d);
    if (symmetric && d.nRooms > before) {
      const room = d.rooms[d.nRooms]!;
      const height = (room.south - room.north + 2) / 2;
      const width = (room.east - room.west + 2) / 2;
      const i0 = (room.north - 1) / 2;
      const j0 = (room.west - 1) / 2;
      const jMirror = d.nJ - j0 - width;
      if (jMirror !== j0) {
        emplaceRoom(d, {
          i: i0,
          j: jMirror,
          height,
          width,
        });
      }
    }
  }
}

function emplaceRooms(d: Dungeon, layout: DungeonRoomLayout): void {
  if (layout === "dense") {
    packRooms(d);
  } else {
    const n = allocRooms(d, layout);
    scatterRooms(d, n, layout === "symmetric");
  }
  polymorphRooms(d);
}

type Sill = {
  sillR: number;
  sillC: number;
  dir: Dir;
  doorR: number;
  doorC: number;
  outId?: number;
};

function checkSill(
  d: Dungeon,
  room: RoomRec,
  sillR: number,
  sillC: number,
  dir: Dir,
): Sill | null {
  const doorR = sillR + DI[dir];
  const doorC = sillC + DJ[dir];
  const doorCell = bits(d, doorR, doorC);
  if (!(doorCell & PERIMETER)) return null;
  if (doorCell & BLOCK_DOOR) return null;
  const outR = doorR + DI[dir];
  const outC = doorC + DJ[dir];
  const outCell = bits(d, outR, outC);
  if (outCell & BLOCKED) return null;
  let outId: number | undefined;
  if (outCell & ROOM) {
    outId = roomIdAt(outCell);
    if (outId === room.id) return null;
  }
  return { sillR, sillC, dir, doorR, doorC, outId };
}

function doorSills(d: Dungeon, room: RoomRec): Sill[] {
  const list: Sill[] = [];
  if (room.north >= 3) {
    for (let c = room.west; c <= room.east; c += 2) {
      for (let r = room.north; r <= room.south; r++) {
        if (!isRoomCell(d, r, c, room.id)) continue;
        const sill = checkSill(d, room, r, c, "north");
        if (sill) list.push(sill);
        break;
      }
    }
  }
  if (room.south <= d.nRows - 3) {
    for (let c = room.west; c <= room.east; c += 2) {
      for (let r = room.south; r >= room.north; r--) {
        if (!isRoomCell(d, r, c, room.id)) continue;
        const sill = checkSill(d, room, r, c, "south");
        if (sill) list.push(sill);
        break;
      }
    }
  }
  if (room.west >= 3) {
    for (let r = room.north; r <= room.south; r += 2) {
      for (let c = room.west; c <= room.east; c++) {
        if (!isRoomCell(d, r, c, room.id)) continue;
        const sill = checkSill(d, room, r, c, "west");
        if (sill) list.push(sill);
        break;
      }
    }
  }
  if (room.east <= d.nCols - 3) {
    for (let r = room.north; r <= room.south; r += 2) {
      for (let c = room.east; c >= room.west; c--) {
        if (!isRoomCell(d, r, c, room.id)) continue;
        const sill = checkSill(d, room, r, c, "east");
        if (sill) list.push(sill);
        break;
      }
    }
  }
  return d.rng.shuffle(list);
}

function doorTypeBits(doors: DungeonDoors, rng: SeededRng): number {
  if (doors === "none" || doors === "basic") return ARCH;
  if (doors === "secure") return rng.next() < 0.5 ? LOCKED : DOOR;
  const roll = randN(rng, 110);
  if (doors === "deathtrap" && rng.next() < 0.2) return TRAPPED;
  if (roll < 15) return ARCH;
  if (roll < 60) return DOOR;
  if (roll < 75) return LOCKED;
  if (roll < 90) return TRAPPED;
  if (roll < 100) return SECRET;
  return PORTC;
}

function openRoom(d: Dungeon, room: RoomRec, connected: Set<string>): void {
  const list = doorSills(d, room);
  if (list.length === 0) return;
  const roomH = (room.south - room.north) / 2 + 1;
  const roomW = (room.east - room.west) / 2 + 1;
  const flumph = Math.max(1, Math.floor(Math.sqrt(roomW * roomH)));
  const nOpens = flumph + randN(d.rng, flumph);

  for (let i = 0; i < nOpens && list.length > 0; i++) {
    const idx = randN(d.rng, list.length);
    const sill = list.splice(idx, 1)[0]!;
    if (bits(d, sill.doorR, sill.doorC) & DOORSPACE) {
      i -= 1;
      continue;
    }
    if (sill.outId) {
      const key = [room.id, sill.outId].sort((a, b) => a - b).join(",");
      if (connected.has(key)) {
        i -= 1;
        continue;
      }
      connected.add(key);
    }
    for (let x = 0; x < 3; x++) {
      const r = sill.sillR + DI[sill.dir] * x;
      const c = sill.sillC + DJ[sill.dir] * x;
      setBits(d, r, c, (bits(d, r, c) & ~PERIMETER) | ENTRANCE);
    }
    const kind = doorTypeBits(d.doors, d.rng);
    setBits(d, sill.doorR, sill.doorC, bits(d, sill.doorR, sill.doorC) | kind);
    const bag = room.doors[sill.dir] ?? [];
    bag.push({ r: sill.doorR, c: sill.doorC, outId: sill.outId });
    room.doors[sill.dir] = bag;
  }
}

function openRooms(d: Dungeon): void {
  const connected = new Set<string>();
  for (let id = 1; id <= d.nRooms; id++) {
    const room = d.rooms[id];
    if (room) openRoom(d, room, connected);
  }
}

function soundTunnel(
  d: Dungeon,
  midR: number,
  midC: number,
  nextR: number,
  nextC: number,
): boolean {
  if (nextR < 0 || nextR > d.nRows || nextC < 0 || nextC > d.nCols) return false;
  const r1 = Math.min(midR, nextR);
  const r2 = Math.max(midR, nextR);
  const c1 = Math.min(midC, nextC);
  const c2 = Math.max(midC, nextC);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (bits(d, r, c) & BLOCK_CORR) return false;
    }
  }
  return true;
}

function delveTunnel(
  d: Dungeon,
  thisR: number,
  thisC: number,
  nextR: number,
  nextC: number,
): boolean {
  const r1 = Math.min(thisR, nextR);
  const r2 = Math.max(thisR, nextR);
  const c1 = Math.min(thisC, nextC);
  const c2 = Math.max(thisC, nextC);
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      setBits(d, r, c, (bits(d, r, c) & ~ENTRANCE) | CORRIDOR);
    }
  }
  return true;
}

function openTunnel(d: Dungeon, i: number, j: number, dir: Dir): boolean {
  const thisR = i * 2 + 1;
  const thisC = j * 2 + 1;
  const nextR = (i + DI[dir]) * 2 + 1;
  const nextC = (j + DJ[dir]) * 2 + 1;
  const midR = (thisR + nextR) / 2;
  const midC = (thisC + nextC) / 2;
  if (!soundTunnel(d, midR, midC, nextR, nextC)) return false;
  return delveTunnel(d, thisR, thisC, nextR, nextC);
}

function tunnelDirs(d: Dungeon, lastDir?: Dir): Dir[] {
  const dirs = d.rng.shuffle([...DIRS]);
  if (lastDir && d.corridorStraight > 0) {
    if (randN(d.rng, 100) < d.corridorStraight) dirs.unshift(lastDir);
  }
  return dirs;
}

function tunnel(d: Dungeon, startI: number, startJ: number, lastDir?: Dir): void {
  const stack: { i: number; j: number; last?: Dir; dirs: Dir[]; idx: number }[] =
    [{ i: startI, j: startJ, last: lastDir, dirs: tunnelDirs(d, lastDir), idx: 0 }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    if (frame.idx >= frame.dirs.length) {
      stack.pop();
      continue;
    }
    const dir = frame.dirs[frame.idx]!;
    frame.idx += 1;
    if (openTunnel(d, frame.i, frame.j, dir)) {
      const nextI = frame.i + DI[dir];
      const nextJ = frame.j + DJ[dir];
      stack.push({
        i: nextI,
        j: nextJ,
        last: dir,
        dirs: tunnelDirs(d, dir),
        idx: 0,
      });
    }
  }
}

function corridors(d: Dungeon): void {
  for (let i = 1; i < d.nI; i++) {
    const r = i * 2 + 1;
    for (let j = 1; j < d.nJ; j++) {
      const c = j * 2 + 1;
      if (bits(d, r, c) & CORRIDOR) continue;
      tunnel(d, i, j);
    }
  }
}

function checkTunnel(
  d: Dungeon,
  r: number,
  c: number,
  check: { corridor?: [number, number][]; walled?: [number, number][] },
): boolean {
  if (check.corridor) {
    for (const [dr, dc] of check.corridor) {
      if (bits(d, r + dr, c + dc) !== CORRIDOR) return false;
    }
  }
  if (check.walled) {
    for (const [dr, dc] of check.walled) {
      if (bits(d, r + dr, c + dc) & OPENSPACE) return false;
    }
  }
  return true;
}

function collapse(d: Dungeon, startR: number, startC: number): void {
  const stack: Point[] = [{ x: startC, y: startR }];
  while (stack.length > 0) {
    const p = stack.pop()!;
    if (!(bits(d, p.y, p.x) & OPENSPACE)) continue;
    for (const dir of DIRS) {
      const spec = CLOSE_END[dir];
      if (!checkTunnel(d, p.y, p.x, spec)) continue;
      for (const [dr, dc] of spec.close) {
        setBits(d, p.y + dr, p.x + dc, NOTHING);
      }
      const [rr, rc] = spec.recurse;
      stack.push({ x: p.x + rc, y: p.y + rr });
    }
  }
}

function removeDeadends(d: Dungeon, percent: number): void {
  if (percent <= 0) return;
  const all = percent >= 100;
  for (let i = 0; i < d.nI; i++) {
    const r = i * 2 + 1;
    for (let j = 0; j < d.nJ; j++) {
      const c = j * 2 + 1;
      const cell = bits(d, r, c);
      if (!(cell & OPENSPACE)) continue;
      if (cell & (STAIRS | DOORSPACE)) continue;
      if (!all && randN(d.rng, 100) >= percent) continue;
      collapse(d, r, c);
    }
  }
}

function emplaceStairs(d: Dungeon, count: number): void {
  if (count <= 0) return;
  const list: { r: number; c: number }[] = [];
  for (let i = 0; i < d.nI; i++) {
    const r = i * 2 + 1;
    col: for (let j = 0; j < d.nJ; j++) {
      const c = j * 2 + 1;
      if (bits(d, r, c) !== CORRIDOR) continue;
      if (bits(d, r, c) & STAIRS) continue;
      for (const dir of DIRS) {
        if (checkTunnel(d, r, c, STAIR_END[dir])) {
          list.push({ r, c });
          continue col;
        }
      }
    }
  }
  for (let i = 0; i < count && list.length > 0; i++) {
    const idx = randN(d.rng, list.length);
    const stair = list.splice(idx, 1)[0]!;
    const down = i % 2 === 0;
    setBits(
      d,
      stair.r,
      stair.c,
      bits(d, stair.r, stair.c) | (down ? STAIR_DN : STAIR_UP),
    );
  }
}

function emptyBlocks(d: Dungeon): void {
  for (let r = 0; r <= d.nRows; r++) {
    for (let c = 0; c <= d.nCols; c++) {
      if (bits(d, r, c) & BLOCKED) setBits(d, r, c, NOTHING);
    }
  }
}

function addEgress(d: Dungeon, egress: DungeonEgress): void {
  if (egress === "none") return;
  const sides: Dir[] =
    egress === "tiling"
      ? ["north", "south", "west", "east"]
      : egress === "many"
        ? ["north", "east", "south"]
        : ["north"];

  for (const dir of sides) {
    let r = 1;
    let c = 1;
    if (dir === "north") {
      r = 1;
      c = Math.floor(d.nJ / 2) * 2 + 1;
    } else if (dir === "south") {
      r = d.maxRow;
      c = Math.floor(d.nJ / 2) * 2 + 1;
    } else if (dir === "west") {
      r = Math.floor(d.nI / 2) * 2 + 1;
      c = 1;
    } else {
      r = Math.floor(d.nI / 2) * 2 + 1;
      c = d.maxCol;
    }

    const stepR = -DI[dir];
    const stepC = -DJ[dir];
    let guard = 0;
    while (inGrid(d, r, c) && guard++ < 200) {
      const cell = bits(d, r, c);
      if (cell & BLOCKED) {
        r += stepR;
        c += stepC;
        continue;
      }
      if (cell & OPENSPACE) {
        setBits(d, r, c, (cell & ~PERIMETER) | ENTRANCE | ARCH);
        break;
      }
      setBits(d, r, c, (cell & ~PERIMETER) | CORRIDOR);
      r += stepR;
      c += stepC;
    }
  }
}

function neighbor8Walls(src: number[][], r: number, c: number): number {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const cell = src[r + dr]?.[c + dc];
      if (cell === undefined || !(cell & OPENSPACE)) n += 1;
    }
  }
  return n;
}

function connectFloorComponents(d: Dungeon): void {
  const rows = d.nRows + 1;
  const cols = d.nCols + 1;
  const seen = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );
  const components: Point[][] = [];
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (seen[r]![c] || !(bits(d, r, c) & OPENSPACE)) continue;
      id += 1;
      const cells: Point[] = [];
      const queue: Point[] = [{ x: c, y: r }];
      seen[r]![c] = id;
      while (queue.length > 0) {
        const p = queue.shift()!;
        cells.push(p);
        for (const dir of DIRS) {
          const nr = p.y + DI[dir];
          const nc = p.x + DJ[dir];
          if (!inGrid(d, nr, nc) || seen[nr]![nc]) continue;
          if (!(bits(d, nr, nc) & OPENSPACE)) continue;
          seen[nr]![nc] = id;
          queue.push({ x: nc, y: nr });
        }
      }
      components.push(cells);
    }
  }
  if (components.length <= 1) return;
  components.sort((a, b) => b.length - a.length);
  for (let i = 1; i < components.length; i++) {
    let best: { a: Point; b: Point; dist: number } | null = null;
    for (const a of components[0]!) {
      for (const b of components[i]!) {
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (!best || dist < best.dist) best = { a, b, dist };
      }
    }
    if (!best) continue;
    let x = best.b.x;
    let y = best.b.y;
    while (x !== best.a.x || y !== best.a.y) {
      if (!(bits(d, y, x) & BLOCKED)) {
        setBits(d, y, x, bits(d, y, x) | CORRIDOR);
      }
      if (Math.abs(best.a.x - x) >= Math.abs(best.a.y - y)) {
        x += x < best.a.x ? 1 : -1;
      } else {
        y += y < best.a.y ? 1 : -1;
      }
    }
    components[0] = components[0]!.concat(components[i]!);
  }
}

function carveCavern(d: Dungeon): void {
  const rows = d.nRows + 1;
  const cols = d.nCols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (bits(d, r, c) & BLOCKED) continue;
      if (d.rng.next() < 0.45) setBits(d, r, c, CORRIDOR);
    }
  }
  for (let iter = 0; iter < 5; iter++) {
    const next = d.cell.map((row) => row.slice());
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (bits(d, r, c) & BLOCKED) continue;
        const walls = neighbor8Walls(d.cell, r, c);
        next[r]![c] = walls >= 5 ? NOTHING : CORRIDOR;
      }
    }
    d.cell = next;
  }
  connectFloorComponents(d);

  const seen = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (seen[r]![c] || !(bits(d, r, c) & OPENSPACE)) continue;
      let minC = c;
      let minR = r;
      let maxC = c;
      let maxR = r;
      const queue: Point[] = [{ x: c, y: r }];
      const cells: Point[] = [];
      seen[r]![c] = true;
      while (queue.length > 0) {
        const p = queue.shift()!;
        cells.push(p);
        minC = Math.min(minC, p.x);
        minR = Math.min(minR, p.y);
        maxC = Math.max(maxC, p.x);
        maxR = Math.max(maxR, p.y);
        for (const dir of DIRS) {
          const nr = p.y + DI[dir];
          const nc = p.x + DJ[dir];
          if (!inGrid(d, nr, nc) || seen[nr]![nc]) continue;
          if (!(bits(d, nr, nc) & OPENSPACE)) continue;
          seen[nr]![nc] = true;
          queue.push({ x: nc, y: nr });
        }
      }
      if (cells.length < 12 || d.nRooms >= 80) continue;
      const roomId = d.nRooms + 1;
      d.nRooms = roomId;
      for (const p of cells) {
        setBits(d, p.y, p.x, (bits(d, p.y, p.x) & ~CORRIDOR) | ROOM | (roomId << 6));
      }
      d.rooms[roomId] = {
        id: roomId,
        north: minR,
        south: maxR,
        west: minC,
        east: maxC,
        shape: "rectangle",
        doors: {},
      };
    }
  }
}

function doorVariantFromBits(cell: number): DoorVariant | undefined {
  if (!(cell & DOORSPACE)) return undefined;
  if (cell & SECRET) return "secret";
  if (cell & PORTC) return "portcullis";
  if (cell & LOCKED) return "locked";
  if (cell & TRAPPED) return "trapped";
  if (cell & ARCH) return "open";
  return "closed";
}

function toGrid(d: Dungeon): GridCell[][] {
  const rows = d.nRows + 1;
  const cols = d.nCols + 1;
  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < cols; c++) {
      const cell = bits(d, r, c);
      if (cell & STAIR_UP) {
        row.push({
          type: "stairs-up",
          roomIndex: cell & ROOM ? roomIdAt(cell) - 1 : undefined,
          corridor: Boolean(cell & CORRIDOR),
        });
      } else if (cell & STAIR_DN) {
        row.push({
          type: "stairs-down",
          roomIndex: cell & ROOM ? roomIdAt(cell) - 1 : undefined,
          corridor: Boolean(cell & CORRIDOR),
        });
      } else if (cell & DOORSPACE) {
        row.push({
          type: "door",
          door: doorVariantFromBits(cell),
          corridor: true,
        });
      } else if (cell & OPENSPACE) {
        row.push({
          type: "floor",
          roomIndex: cell & ROOM ? roomIdAt(cell) - 1 : undefined,
          corridor: Boolean(cell & CORRIDOR),
        });
      } else {
        row.push({ type: "wall" });
      }
    }
    grid.push(row);
  }
  return grid;
}

function placedRooms(d: Dungeon): PlacedRoom[] {
  const rooms: PlacedRoom[] = [];
  for (let id = 1; id <= d.nRooms; id++) {
    const room = d.rooms[id];
    if (!room) continue;
    rooms.push({
      index: id - 1,
      x: room.west,
      y: room.north,
      w: room.east - room.west + 1,
      h: room.south - room.north + 1,
      extra: [],
      shape: room.shape,
    });
  }
  return rooms;
}

function walkable(cell: GridCell): boolean {
  return (
    cell.type === "floor" ||
    cell.type === "door" ||
    cell.type === "stairs-up" ||
    cell.type === "stairs-down"
  );
}

function corridorLike(cell: GridCell): boolean {
  return (
    cell.corridor === true ||
    cell.type === "door" ||
    (cell.type === "floor" && cell.roomIndex === undefined)
  );
}

function neighborCount(grid: GridCell[][], x: number, y: number): number {
  const cols = grid[0]!.length;
  const rows = grid.length;
  let n = 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const c = grid[ny]![nx]!;
    if (corridorLike(c) || c.type === "door") n++;
  }
  return n;
}

function roomCenter(room: PlacedRoom): Point {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function roomReachable(grid: GridCell[][], rooms: PlacedRoom[]): boolean {
  if (rooms.length === 0) return true;
  const cols = grid[0]!.length;
  const rows = grid.length;
  const start = roomCenter(rooms[0]!);
  const seen = new Set<string>([`${start.x},${start.y}`]);
  const queue: Point[] = [start];

  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const cell = grid[ny]![nx]!;
      if (!walkable(cell)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  for (const room of rooms) {
    let found = false;
    for (let dy = 0; dy < room.h && !found; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        if (seen.has(`${room.x + dx},${room.y + dy}`)) {
          found = true;
          break;
        }
      }
    }
    if (!found) return false;
  }
  return true;
}

function doorNotesForRooms(
  grid: GridCell[][],
  rooms: PlacedRoom[],
): Map<number, string[]> {
  const cols = grid[0]!.length;
  const rows = grid.length;
  const notes = new Map<number, string[]>();
  const addNote = (roomIndex: number, note: string) => {
    const list = notes.get(roomIndex) ?? [];
    if (!list.includes(note)) list.push(note);
    notes.set(roomIndex, list);
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y]![x]!;
      if (cell.type !== "door" || !cell.door) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const neighbor = grid[ny]![nx]!;
        if (neighbor.roomIndex === undefined) continue;
        const side =
          dy < 0 ? "South" : dy > 0 ? "North" : dx < 0 ? "East" : "West";
        const kind =
          cell.door === "secret"
            ? "secret"
            : cell.door === "locked"
              ? "locked"
              : cell.door === "trapped"
                ? "trapped"
                : cell.door === "open"
                  ? "open"
                  : cell.door === "portcullis"
                    ? "portcullis"
                    : "closed";
        addNote(neighbor.roomIndex, `${side}, ${kind}`);
      }
    }
  }
  return notes;
}

function renumberRooms(
  rooms: PlacedRoom[],
  grid: GridCell[][],
): PlacedRoom[] {
  const sorted = [...rooms].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
  const map = new Map<number, number>();
  const next = sorted.map((room, i) => {
    map.set(room.index, i);
    return { ...room, index: i };
  });
  for (const row of grid) {
    for (const cell of row) {
      if (cell.roomIndex === undefined) continue;
      const mapped = map.get(cell.roomIndex);
      if (mapped !== undefined) cell.roomIndex = mapped;
    }
  }
  return next;
}

export function allRoomsReachable(draft: DungeonDraft): boolean {
  return roomReachable(draft.cells, draft.rooms);
}

export function roomInsideMask(
  room: PlacedRoom,
  mask: boolean[][],
): boolean {
  for (let dy = 0; dy < room.h; dy++) {
    for (let dx = 0; dx < room.w; dx++) {
      const x = room.x + dx;
      const y = room.y + dy;
      if (!mask[y]?.[x]) return false;
    }
  }
  for (const cell of room.extra) {
    if (!mask[cell.y]?.[cell.x]) return false;
  }
  return true;
}

export function countCorridorDeadends(grid: GridCell[][]): number {
  const cols = grid[0]!.length;
  const rows = grid.length;
  let count = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y]![x]!;
      if (!cell.corridor || cell.type === "door") continue;
      if (cell.type.startsWith("stairs")) continue;
      if (cell.roomIndex !== undefined) continue;
      if (neighborCount(grid, x, y) === 1) count++;
    }
  }
  return count;
}

function createDungeon(input: DungeonInput, rng: SeededRng): Dungeon {
  const raw =
    input.size === "custom"
      ? {
          cols: clampInt(input.cols, 20, 120),
          rows: clampInt(input.rows, 20, 120),
        }
      : SIZE_TABLE[input.size];
  const nI = Math.floor(raw.rows / 2);
  const nJ = Math.floor(raw.cols / 2);
  const nRows = nI * 2;
  const nCols = nJ * 2;
  const range = roomSizeRange(input.roomSize);
  const roomBase = Math.floor((range.min + 1) / 2);
  const roomRadix = Math.floor((range.max - range.min) / 2) + 1;
  return {
    nRows,
    nCols,
    nI,
    nJ,
    maxRow: nRows - 1,
    maxCol: nCols - 1,
    roomBase,
    roomRadix,
    nRooms: 0,
    cell: emptyCells(nRows + 1, nCols + 1),
    rooms: [],
    rng,
    corridorStraight: corridorBias(input.corridors),
    doors: input.doors,
    polymorph: input.polymorph,
  };
}

export function generateDungeon(
  input: DungeonInput,
  rng: SeededRng,
): DungeonDraft {
  const d = createDungeon(input, rng);
  applyLayoutMask(d, input.layout);

  if (input.layout === "cavernous") {
    carveCavern(d);
    if (input.stairs !== "none") {
      const rooms = placedRooms(d);
      if (rooms.length > 0) {
        const first = rooms[0]!;
        const last = rooms[rooms.length - 1]!;
        setBits(
          d,
          Math.floor((first.north + first.south) / 2),
          Math.floor((first.west + first.east) / 2),
          bits(
            d,
            Math.floor((first.north + first.south) / 2),
            Math.floor((first.west + first.east) / 2),
          ) | STAIR_UP,
        );
        setBits(
          d,
          Math.floor((last.north + last.south) / 2),
          Math.floor((last.west + last.east) / 2),
          bits(
            d,
            Math.floor((last.north + last.south) / 2),
            Math.floor((last.west + last.east) / 2),
          ) | STAIR_DN,
        );
      }
    }
  } else {
    emplaceRooms(d, input.roomLayout);
    openRooms(d);
    corridors(d);
    addEgress(d, input.egress);
    emplaceStairs(d, stairCount(input.stairs));
    removeDeadends(d, deadendPercent(input.deadends));
    sealShapedRoomLeftovers(d);
  }
  emptyBlocks(d);

  const grid = toGrid(d);
  let rooms = placedRooms(d);
  rooms = renumberRooms(rooms, grid);
  const doorNotes = doorNotesForRooms(grid, rooms);
  const name = rollDungeonName(input.seed, input.name);
  const keys = stockRooms(input, rooms, doorNotes);

  return {
    name,
    seed: input.seed,
    level: input.level,
    cols: d.nCols + 1,
    rows: d.nRows + 1,
    grid: input.grid,
    cells: grid,
    rooms,
    keys,
  };
}
