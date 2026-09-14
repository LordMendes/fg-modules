import {
  acceptCommandRate,
  acceptTokenMoveRate,
  createRateLimitState,
  type RateLimitState,
} from "@/lib/campaign/liveRateLimit";
import {
  publishCampaignLive,
  seedCampaignRoomMeta,
} from "@/lib/campaign/liveHub";
import { roomGetTokens, roomUpsertToken } from "@/lib/campaign/liveRoom";
import type {
  CampaignLiveEvent,
  ClientLiveMessage,
} from "@/lib/campaign/types";
import type { CampaignSocketAuth } from "@/lib/campaign/liveAuth";
import {
  commitTokenMove,
  mutateAddDrawing,
  mutateAddFogRegion,
  mutateAddOccluder,
  mutateClearDrawings,
  mutateDeleteDrawing,
  mutateMapPing,
  mutateRemoveFogRegion,
  mutateRemoveLight,
  mutateRemoveOccluder,
  mutateRemoveToken,
  mutateResetFog,
  mutateSetDoorState,
  mutateSetMapFlags,
  mutateTokenProps,
  mutateUpdateDrawing,
  mutateUpdateGrid,
  mutateUpsertLight,
  mutateViewportGoTo,
  type MapActor,
} from "@/lib/map/mapMutations";
import {
  loadLiveMapForCampaign,
  toCampaignMapView,
  mapInclude,
  loadPcTokenUrls,
} from "@/lib/map/mapView";
import { userColor } from "@/lib/map/permissions";
import { prisma } from "@/lib/prisma";

export const MAX_WS_MESSAGE_BYTES = 64 * 1024;

type HandlerCtx = {
  auth: CampaignSocketAuth;
  /** Per-token rate limit state. */
  moveRates: Map<string, RateLimitState>;
  /** Coarse per-connection rate for discrete commands. */
  commandRate: RateLimitState;
  send: (event: CampaignLiveEvent) => void;
};

function parseClientMessage(raw: string): ClientLiveMessage | null {
  if (raw.length > MAX_WS_MESSAGE_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const msg = data as ClientLiveMessage;
  if (!msg.type || typeof msg.type !== "string") return null;
  return msg;
}

function actorFromAuth(auth: CampaignSocketAuth): MapActor {
  return {
    userId: auth.userId,
    role: auth.role,
    campaignId: auth.campaignId,
    dmUserId: auth.dmUserId,
  };
}

function canMoveToken(
  token: { ownerUserId: string | null },
  auth: CampaignSocketAuth,
): boolean {
  if (auth.role === "dm") return true;
  return token.ownerUserId === auth.userId;
}

async function resolveLiveMapId(
  auth: CampaignSocketAuth,
): Promise<string | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: auth.campaignId },
    select: { liveMapId: true },
  });
  return campaign?.liveMapId ?? null;
}

async function handleTokenMove(
  ctx: HandlerCtx,
  msg: Extract<
    ClientLiveMessage,
    { type: "tokenMove" } | { type: "tokenMoveCommit" }
  >,
  committed: boolean,
) {
  const { auth } = ctx;
  if (
    typeof msg.tokenId !== "string" ||
    typeof msg.x !== "number" ||
    typeof msg.y !== "number" ||
    typeof msg.rotation !== "number" ||
    typeof msg.seq !== "number"
  ) {
    return;
  }

  // Uncommitted ticks use the per-token move limiter. Commits are gated by
  // commandRate in handleClientLiveMessage so a drag burst cannot starve the
  // pointer-up persist.
  if (!committed) {
    let rate = ctx.moveRates.get(msg.tokenId);
    if (!rate) {
      rate = createRateLimitState();
      ctx.moveRates.set(msg.tokenId, rate);
    }
    if (!acceptTokenMoveRate(rate)) return;
  }

  if (committed) {
    await commitTokenMove(
      actorFromAuth(auth),
      msg.tokenId,
      msg.x,
      msg.y,
      msg.rotation,
      msg.seq,
    );
    return;
  }

  const tokens = await roomGetTokens(auth.campaignId);
  let meta = tokens[msg.tokenId];

  // Cold cache: load from DB once.
  if (!meta) {
    const row = await prisma.campaignMapToken.findUnique({
      where: { id: msg.tokenId },
      include: { map: { select: { campaignId: true } } },
    });
    if (!row || row.map.campaignId !== auth.campaignId) return;
    if (!canMoveToken(row, auth)) return;
    meta = {
      id: row.id,
      layer: row.layer === "gm" ? "gm" : "token",
      ownerUserId: row.ownerUserId,
      visibility:
        row.visibility === "hidden" || row.visibility === "mask"
          ? row.visibility
          : "always",
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      seq: row.seq,
    };
    await roomUpsertToken(auth.campaignId, meta);
  } else if (!canMoveToken(meta, auth)) {
    return;
  }

  if (msg.seq < meta.seq) return;

  await roomUpsertToken(auth.campaignId, {
    ...meta,
    x: msg.x,
    y: msg.y,
    seq: msg.seq,
  });
  publishCampaignLive(auth.campaignId, {
    type: "mapTokenMove",
    tokenId: msg.tokenId,
    x: msg.x,
    y: msg.y,
    rotation: msg.rotation,
    seq: msg.seq,
    committed: false,
  });
}

async function handleDiscrete(
  ctx: HandlerCtx,
  run: () => Promise<unknown>,
): Promise<void> {
  if (!acceptCommandRate(ctx.commandRate)) return;
  await run();
}

export async function handleClientLiveMessage(
  ctx: HandlerCtx,
  raw: string,
): Promise<void> {
  const msg = parseClientMessage(raw);
  if (!msg) return;

  const actor = actorFromAuth(ctx.auth);

  switch (msg.type) {
    case "ping":
      ctx.send({ type: "ping" });
      return;
    case "tokenMove":
      await handleTokenMove(ctx, msg, false);
      return;
    case "tokenMoveCommit":
      await handleDiscrete(ctx, () => handleTokenMove(ctx, msg, true));
      return;
    case "mapPing": {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      await handleDiscrete(ctx, () => mutateMapPing(actor, msg.x, msg.y));
      return;
    }
    case "mapViewportGoTo": {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      await handleDiscrete(ctx, () =>
        mutateViewportGoTo(actor, msg.x, msg.y),
      );
      return;
    }
    case "mapDrawingUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, async () => {
        if (msg.drawingId) {
          // Prefer update when client already has an id; fall through to add (upsert).
          await mutateAddDrawing(actor, mapId, {
            drawingId: msg.drawingId,
            kind: msg.kind,
            stroke: msg.stroke,
            geom: msg.geom,
          });
        } else {
          await mutateAddDrawing(actor, mapId, {
            kind: msg.kind,
            stroke: msg.stroke,
            geom: msg.geom,
          });
        }
      });
      return;
    }
    case "mapDrawingRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.drawingId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateDeleteDrawing(actor, mapId, msg.drawingId),
      );
      return;
    }
    case "mapDrawingClear": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () => mutateClearDrawings(actor, mapId));
      return;
    }
    case "mapFogUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () =>
        mutateAddFogRegion(
          actor,
          mapId,
          msg.kind,
          msg.points,
          msg.regionId,
        ),
      );
      return;
    }
    case "mapFogRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.regionId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateRemoveFogRegion(actor, mapId, msg.regionId),
      );
      return;
    }
    case "mapFogReset": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () => mutateResetFog(actor, mapId));
      return;
    }
    case "mapOccluderUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () =>
        mutateAddOccluder(actor, mapId, msg.kind, msg.points, msg.state),
      );
      return;
    }
    case "mapOccluderRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.occluderId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateRemoveOccluder(actor, mapId, msg.occluderId),
      );
      return;
    }
    case "mapDoorState": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () =>
        mutateSetDoorState(actor, mapId, msg.occluderId, msg.state),
      );
      return;
    }
    case "mapLightUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || !msg.light) return;
      await handleDiscrete(ctx, () =>
        mutateUpsertLight(actor, mapId, {
          id: msg.light.id,
          x: msg.light.x,
          y: msg.light.y,
          brightFeet: msg.light.brightFeet,
          dimFeet: msg.light.dimFeet,
          color: msg.light.color,
          enabled: msg.light.enabled,
          mode: msg.light.mode ?? "light",
        }),
      );
      return;
    }
    case "mapLightRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.lightId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateRemoveLight(actor, mapId, msg.lightId),
      );
      return;
    }
    case "mapFlags": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () =>
        mutateSetMapFlags(actor, mapId, {
          fogEnabled: msg.fogEnabled,
          losEnabled: msg.losEnabled,
          lightingEnabled: msg.lightingEnabled,
          daylight: msg.daylight,
          explorerEnabled: msg.explorerEnabled,
        }),
      );
      return;
    }
    case "mapGrid": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(ctx, () =>
        mutateUpdateGrid(
          actor,
          mapId,
          msg.gridSizePx,
          msg.gridOffsetX,
          msg.gridOffsetY,
          msg.scaleFeet,
          msg.diagonalRule,
        ),
      );
      return;
    }
    case "mapTokenUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.tokenId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateTokenProps(actor, mapId, msg.tokenId, {
          layer: msg.layer,
          visibility: msg.visibility,
          emitsLight: msg.emitsLight,
          lightBright: msg.lightBright,
          lightDim: msg.lightDim,
        }),
      );
      return;
    }
    case "mapTokenRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.tokenId !== "string") return;
      await handleDiscrete(ctx, () =>
        mutateRemoveToken(actor, mapId, msg.tokenId),
      );
      return;
    }
    default:
      return;
  }
}

export async function sendInitialSnapshot(
  auth: CampaignSocketAuth,
  send: (event: CampaignLiveEvent) => void,
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: auth.campaignId },
    select: { liveMapId: true, dmUserId: true },
  });
  if (!campaign) return;

  // Seed Redis with the unfiltered map so GM tokens stay in room meta.
  if (campaign.liveMapId) {
    const raw = await prisma.campaignMap.findUnique({
      where: { id: campaign.liveMapId },
      include: mapInclude,
    });
    if (raw) {
      const pcIds = raw.tokens
        .map((t) => t.pcPlanId)
        .filter((id): id is string => Boolean(id));
      const urls = await loadPcTokenUrls(pcIds);
      const full = toCampaignMapView(raw, urls);
      await seedCampaignRoomMeta(auth.campaignId, campaign.dmUserId, full);
    } else {
      await seedCampaignRoomMeta(auth.campaignId, campaign.dmUserId, null);
    }
  } else {
    await seedCampaignRoomMeta(auth.campaignId, campaign.dmUserId, null);
  }

  const { liveMap, maps } = await loadLiveMapForCampaign(
    auth.campaignId,
    campaign.liveMapId,
    { userId: auth.userId, isDm: auth.role === "dm" },
  );
  send({ type: "mapSnapshot", map: liveMap });
  if (auth.role === "dm") {
    send({ type: "mapList", maps });
  }
}

export function createHandlerCtx(
  auth: CampaignSocketAuth,
  send: (event: CampaignLiveEvent) => void,
): HandlerCtx {
  return {
    auth,
    moveRates: new Map(),
    commandRate: createRateLimitState(),
    send,
  };
}

/** @deprecated Kept for tests that assert color assignment. */
export function _testUserColor(userId: string) {
  return userColor(userId);
}
