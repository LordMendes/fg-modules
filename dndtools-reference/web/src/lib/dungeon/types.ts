export type DungeonMotif =
  | ""
  | "abandoned"
  | "aberrant"
  | "giant"
  | "undead"
  | "vermin"
  | "aquatic"
  | "desert"
  | "underdark"
  | "arcane"
  | "fire"
  | "cold"
  | "abyssal"
  | "infernal";

export type DungeonSize =
  | "fine"
  | "diminutive"
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan"
  | "colossal"
  | "custom";

export type DungeonLayout =
  | "square"
  | "rectangle"
  | "box"
  | "cross"
  | "dagger"
  | "saltire"
  | "keep"
  | "hexagon"
  | "round"
  | "cavernous";

export type DungeonEgress = "none" | "yes" | "many" | "tiling";
export type DungeonRoomLayout = "sparse" | "scattered" | "dense" | "symmetric";
export type DungeonRoomSize =
  | "small"
  | "medium"
  | "large"
  | "huge"
  | "gargantuan"
  | "colossal";
export type DungeonPolymorph = "none" | "yes" | "many";
export type RoomShape = "rectangle" | "round" | "pentagon";
export type DungeonDoors =
  | "none"
  | "basic"
  | "secure"
  | "standard"
  | "deathtrap";
export type DungeonCorridors = "labyrinth" | "errant" | "straight";
export type DungeonDeadends = "none" | "some" | "all";
export type DungeonStairs = "none" | "yes" | "many";
export type DungeonGrid = "none" | "square" | "hex" | "verthex";

export type DungeonInput = {
  seed: number;
  name: string;
  level: number;
  partySize: number;
  motif: DungeonMotif;
  size: DungeonSize;
  cols: number;
  rows: number;
  layout: DungeonLayout;
  egress: DungeonEgress;
  roomLayout: DungeonRoomLayout;
  roomSize: DungeonRoomSize;
  polymorph: DungeonPolymorph;
  doors: DungeonDoors;
  corridors: DungeonCorridors;
  deadends: DungeonDeadends;
  stairs: DungeonStairs;
  grid: DungeonGrid;
};

export type CellType = "wall" | "floor" | "door" | "stairs-up" | "stairs-down";

export type DoorVariant =
  | "open"
  | "closed"
  | "secret"
  | "locked"
  | "trapped"
  | "portcullis";

export type GridCell = {
  type: CellType;
  door?: DoorVariant;
  roomIndex?: number;
  corridor?: boolean;
};

export type PlacedRoom = {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  extra: { x: number; y: number }[];
  shape: RoomShape;
};

export type RoomStockKind =
  | "monster"
  | "trap"
  | "treasure"
  | "feature"
  | "empty";

export type RoomKeyEntry = {
  number: number;
  kind: RoomStockKind;
  summary: string;
  detail: string;
  doors: string[];
  widthFt: number;
  heightFt: number;
};

export type DungeonDraft = {
  name: string;
  seed: number;
  level: number;
  cols: number;
  rows: number;
  grid: DungeonGrid;
  cells: GridCell[][];
  rooms: PlacedRoom[];
  keys: RoomKeyEntry[];
};

export const SIZE_CELL_COUNTS: Record<
  Exclude<DungeonSize, "custom">,
  { cols: number; rows: number }
> = {
  fine: { cols: 20, rows: 24 },
  diminutive: { cols: 28, rows: 34 },
  tiny: { cols: 36, rows: 44 },
  small: { cols: 44, rows: 54 },
  medium: { cols: 51, rows: 65 },
  large: { cols: 64, rows: 80 },
  huge: { cols: 78, rows: 96 },
  gargantuan: { cols: 92, rows: 114 },
  colossal: { cols: 110, rows: 136 },
};

export const DEFAULT_DUNGEON_INPUT: DungeonInput = {
  seed: 1,
  name: "",
  level: 1,
  partySize: 4,
  motif: "",
  size: "medium",
  cols: 51,
  rows: 65,
  layout: "rectangle",
  egress: "none",
  roomLayout: "scattered",
  roomSize: "medium",
  polymorph: "yes",
  doors: "standard",
  corridors: "errant",
  deadends: "some",
  stairs: "yes",
  grid: "square",
};
