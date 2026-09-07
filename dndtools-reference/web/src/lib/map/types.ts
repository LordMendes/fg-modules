export type MapDiagonalRule = "5105" | "555" | "euclid";
export type MapGridType = "square" | "hexH" | "hexV";
export type MapTokenKind = "pc" | "npc" | "object";
export type MapTokenLayer = "token" | "gm";
export type MapTokenVisibility = "always" | "hidden" | "mask";
export type MapFogKind = "hide" | "reveal";
export type MapDrawingKind = "stroke" | "circle" | "square" | "cone";
export type MapDrawingGeom = {
  x: number;
  y: number;
  sizeFeet: number;
  rotation: number;
};
export type MapOccluderKind =
  | "wall"
  | "door"
  | "window"
  | "terrain"
  | "secret"
  | "illusion"
  | "pit";
export type MapOccluderState = "open" | "closed" | "locked";
export type MapLightMode = "light" | "darkness";
export type MapSnapMode = "center" | "corner" | "off";
export type MapTool =
  | "select"
  | "pan"
  | "ping"
  | "measure"
  | "calibrate"
  | "fogReveal"
  | "fogHide"
  | "draw"
  | "aoeCircle"
  | "aoeSquare"
  | "aoeCone"
  | "wall"
  | "door"
  | "light";

export type MapPoint = { x: number; y: number };

export type MapTokenView = {
  id: string;
  kind: MapTokenKind;
  pcPlanId: string | null;
  name: string;
  imageUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: MapTokenLayer;
  visibility: MapTokenVisibility;
  ownerUserId: string | null;
  visionRange: number | null;
  emitsLight: boolean;
  lightBright: number;
  lightDim: number;
  seq: number;
};

export type MapFogRegionView = {
  id: string;
  kind: MapFogKind;
  points: MapPoint[];
};

export type MapDrawingView = {
  id: string;
  authorUserId: string;
  color: string;
  kind: MapDrawingKind;
  stroke: MapPoint[];
  geom: MapDrawingGeom | null;
};

export type MapOccluderView = {
  id: string;
  kind: MapOccluderKind;
  points: MapPoint[];
  state: MapOccluderState;
};

export type MapLightView = {
  id: string;
  x: number;
  y: number;
  brightFeet: number;
  dimFeet: number;
  color: string;
  enabled: boolean;
  mode: MapLightMode;
};

export type MapAoePointerView = {
  id: string;
  kind: "circle" | "square" | "cone";
  x: number;
  y: number;
  sizeFeet: number;
  rotation: number;
  color: string;
  authorUserId: string;
  expiresAt: number;
};

export type CampaignMapView = {
  id: string;
  name: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridType: MapGridType;
  scaleFeet: number;
  diagonalRule: MapDiagonalRule;
  fogEnabled: boolean;
  losEnabled: boolean;
  lightingEnabled: boolean;
  daylight: number;
  explorerEnabled: boolean;
  tokens: MapTokenView[];
  fogRegions: MapFogRegionView[];
  drawings: MapDrawingView[];
  occluders: MapOccluderView[];
  lights: MapLightView[];
};

export type CampaignMapListItem = {
  id: string;
  name: string;
};
