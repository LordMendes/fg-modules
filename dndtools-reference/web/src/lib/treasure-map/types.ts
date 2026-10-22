export type TreasureMapLayout =
  | "random"
  | "left-to-right"
  | "top-to-bottom"
  | "right-to-left"
  | "bottom-to-top";

export type ResolvedLayout =
  | "left-to-right"
  | "top-to-bottom"
  | "right-to-left"
  | "bottom-to-top";

export type TreasureMapMarkerCount = "random" | 4 | 5 | 6;

export type TreasureMapInput = {
  seed: number;
  markerCount: TreasureMapMarkerCount;
  layout: TreasureMapLayout;
};

export type TreasureMapMarker = {
  index: number;
  name: string;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  isHoard: boolean;
  clue: string;
};

export type TreasureMapResult = {
  seed: number;
  markerCount: number;
  layout: ResolvedLayout;
  title: string;
  hoardIndex: number;
  hoardSymbol: "star" | "cross";
  coastPath: string;
  markers: TreasureMapMarker[];
};

export const DEFAULT_TREASURE_MAP_INPUT: TreasureMapInput = {
  seed: 1,
  markerCount: "random",
  layout: "random",
};
