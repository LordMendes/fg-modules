import type { DicePoolItem, RollKind, RollResult } from "@/lib/dice/types";
import type {
  CombatEventRecord,
  CombatEventView,
  CombatFilterCombatant,
} from "@/lib/combat/events/types";
import type {
  CampaignCombatView,
  CampaignEncounterView,
  CampaignNpcView,
  CombatEffectView,
} from "@/lib/combat/types";
import type {
  CampaignMapListItem,
  CampaignMapView,
  MapAoePointerView,
  MapDiagonalRule,
  MapDrawingView,
  MapFogRegionView,
  MapLightView,
  MapOccluderView,
  MapTokenView,
} from "@/lib/map/types";

export type CampaignMemberRole = "dm" | "player";
export type CampaignMemberStatus = "pending" | "active";

export type CampaignSummary = {
  id: string;
  name: string;
  joinCode: string;
  role: CampaignMemberRole;
  status: CampaignMemberStatus;
  memberCount: number;
  pcCount: number;
  updatedAt: string;
};

export type CampaignMemberView = {
  id: string;
  userId: string;
  username: string;
  role: CampaignMemberRole;
  status: CampaignMemberStatus;
};

export type CampaignPcView = {
  id: string;
  pcPlanId: string;
  userId: string;
  username: string;
  name: string;
  classSummary: string;
  /** Public URL for the PC token image, if set. */
  tokenImageUrl: string | null;
  updatedAt: string;
};

export type CampaignTableState = {
  id: string;
  name: string;
  joinCode: string;
  dmUserId: string;
  myRole: CampaignMemberRole;
  myStatus: CampaignMemberStatus;
  members: CampaignMemberView[];
  pcs: CampaignPcView[];
  rolls: CampaignRollView[];
  liveMap: CampaignMapView | null;
  maps: CampaignMapListItem[];
  combat: CampaignCombatView | null;
  combatEvents: CombatEventView[];
  npcLibrary: CampaignNpcView[];
  encounters: CampaignEncounterView[];
};

export type CampaignRollActor = {
  userId: string;
  username: string;
  characterName: string | null;
};

export type CampaignRollView = {
  id: string;
  actor: CampaignRollActor;
  kind: RollKind;
  label: string;
  hidden: boolean;
  dice: DicePoolItem[];
  modifier: number;
  iterativeModifiers?: number[];
  faces: number[] | null;
  faceSum: number | null;
  total: number | null;
  natural20: boolean;
  natural1: boolean;
  attackTotals?: number[] | null;
  at: number;
  /** True when this viewer may see the numeric result. */
  revealResult: boolean;
};

export type CampaignActivityKind =
  | "pc_update"
  | "pc_create"
  | "pc_attach"
  | "pc_unlink"
  | "pc_rename"
  | "member_join"
  | "member_leave"
  | "member_kick"
  | "member_invite";

export type CampaignActivityDetail = {
  path: string;
  from: string | null;
  to: string | null;
};

export type CampaignActivityView = {
  id: string;
  kind: CampaignActivityKind;
  summary: string;
  details: CampaignActivityDetail[];
  actorUserId: string;
  actorUsername: string;
  pcPlanId: string | null;
  pcName: string | null;
  subjectUserId: string | null;
  createdAt: string;
};

export type CampaignRollEvent = {
  type: "roll";
  roll: CampaignRollView;
};

/** Messages the browser sends on the campaign WebSocket. */
export type ClientLiveMessage =
  | {
      type: "tokenMove";
      tokenId: string;
      x: number;
      y: number;
      rotation: number;
      seq: number;
    }
  | {
      type: "tokenMoveCommit";
      tokenId: string;
      x: number;
      y: number;
      rotation: number;
      seq: number;
    }
  | { type: "mapPing"; x: number; y: number }
  | { type: "mapViewportGoTo"; x: number; y: number }
  | { type: "ping" }
  | {
      type: "mapDrawingUpsert";
      drawingId?: string;
      kind?: "stroke" | "circle" | "square" | "cone";
      stroke?: { x: number; y: number }[];
      geom?: { x: number; y: number; sizeFeet: number; rotation: number };
    }
  | { type: "mapDrawingRemove"; drawingId: string }
  | { type: "mapDrawingClear" }
  | {
      type: "mapFogUpsert";
      regionId?: string;
      kind: "reveal" | "hide";
      points: { x: number; y: number }[];
    }
  | { type: "mapFogRemove"; regionId: string }
  | { type: "mapFogReset" }
  | {
      type: "mapOccluderUpsert";
      occluderId?: string;
      kind: string;
      points: { x: number; y: number }[];
      state?: string;
    }
  | { type: "mapOccluderRemove"; occluderId: string }
  | { type: "mapDoorState"; occluderId: string; state: string }
  | {
      type: "mapLightUpsert";
      light: {
        id?: string;
        x: number;
        y: number;
        brightFeet: number;
        dimFeet: number;
        color: string;
        enabled: boolean;
        mode?: string;
      };
    }
  | { type: "mapLightRemove"; lightId: string }
  | {
      type: "mapFlags";
      fogEnabled?: boolean;
      losEnabled?: boolean;
      lightingEnabled?: boolean;
      daylight?: number;
      explorerEnabled?: boolean;
    }
  | {
      type: "mapGrid";
      gridSizePx: number;
      gridOffsetX: number;
      gridOffsetY: number;
      scaleFeet: number;
      diagonalRule: MapDiagonalRule;
    }
  | {
      type: "mapTokenUpsert";
      tokenId: string;
      layer?: string;
      visibility?: string;
      emitsLight?: boolean;
      lightBright?: number;
      lightDim?: number;
    }
  | { type: "mapTokenRemove"; tokenId: string }
  | { type: "combatToggleTarget"; combatantId: string; targetId: string }
  | { type: "combatNextTurn" };

export type CampaignLiveEvent =
  | CampaignRollEvent
  | { type: "ping" }
  | { type: "roster"; members: CampaignMemberView[]; pcs: CampaignPcView[] }
  | { type: "presence"; onlineUserIds: string[] }
  | { type: "pcUpdated"; pcPlanId: string; actorUserId: string; updatedAt: string }
  | { type: "activity"; activity: CampaignActivityView }
  | { type: "mapSnapshot"; map: CampaignMapView | null }
  | { type: "mapList"; maps: CampaignMapListItem[] }
  | {
      type: "mapTokenMove";
      tokenId: string;
      x: number;
      y: number;
      rotation: number;
      seq: number;
      committed: boolean;
    }
  | { type: "mapTokenUpsert"; token: MapTokenView }
  | { type: "mapTokenRemove"; tokenId: string }
  | { type: "mapPing"; x: number; y: number; color: string; userId: string }
  | { type: "mapViewportGoTo"; x: number; y: number }
  | { type: "mapFogUpsert"; region: MapFogRegionView }
  | { type: "mapFogRemove"; regionId: string }
  | { type: "mapFogReset" }
  | { type: "mapDrawingUpsert"; drawing: MapDrawingView }
  | { type: "mapDrawingRemove"; drawingId: string }
  | { type: "mapDrawingClear" }
  | { type: "mapOccluderUpsert"; occluder: MapOccluderView }
  | { type: "mapOccluderRemove"; occluderId: string }
  | { type: "mapLightUpsert"; light: MapLightView }
  | { type: "mapLightRemove"; lightId: string }
  | {
      type: "mapGrid";
      gridSizePx: number;
      gridOffsetX: number;
      gridOffsetY: number;
      scaleFeet: number;
      diagonalRule: MapDiagonalRule;
    }
  | { type: "mapAoeUpsert"; pointer: MapAoePointerView }
  | { type: "mapAoeClear" }
  | {
      type: "mapFlags";
      fogEnabled: boolean;
      losEnabled: boolean;
      lightingEnabled: boolean;
      daylight: number;
      explorerEnabled: boolean;
    }
  | {
      type: "combatSnapshot";
      combat: CampaignCombatView | null;
      /** Full row payload for per-viewer filtering on the live bus. */
      raw?: unknown;
      tokenImages?: Record<string, string | null>;
    }
  | {
      type: "combatEvent";
      event: CombatEventRecord;
      combatants: CombatFilterCombatant[];
    }
  | { type: "combatEventView"; event: CombatEventView }
  | {
      type: "combatEffectUpsert";
      combatantId: string;
      effect: CombatEffectView;
    }
  | { type: "combatEffectRemove"; combatantId: string; effectId: string }
  | { type: "combatantUpsert"; combatantId: string }
  | { type: "combatantRemove"; combatantId: string }
  | { type: "npcLibrarySnapshot"; npcLibrary: CampaignNpcView[] }
  | { type: "encountersSnapshot"; encounters: CampaignEncounterView[] };

export type StartCampaignRollInput = {
  campaignId: string;
  label: string;
  kind: RollKind;
  hidden: boolean;
  characterName?: string | null;
  dice: DicePoolItem[];
  modifier: number;
  iterativeModifiers?: number[];
};

export function rollViewToResult(roll: CampaignRollView): RollResult | null {
  if (!roll.revealResult || roll.faces == null || roll.total == null || roll.faceSum == null) {
    return null;
  }
  return {
    id: roll.id,
    label: roll.label,
    kind: roll.kind,
    hidden: roll.hidden,
    actor: roll.actor,
    faces: roll.faces,
    faceSum: roll.faceSum,
    modifier: roll.modifier,
    total: roll.total,
    natural20: roll.natural20,
    natural1: roll.natural1,
    at: roll.at,
    ...(roll.attackTotals ? { attackTotals: roll.attackTotals } : {}),
  };
}
