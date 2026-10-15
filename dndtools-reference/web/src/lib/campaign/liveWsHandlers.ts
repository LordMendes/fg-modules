import {
  acceptCommandRate,
  acceptRateLimited,
  acceptTokenMoveRate,
  createRateLimitState,
  TOKEN_MOVE_WINDOW_MS,
  trimToCap,
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

/** Live messages per connection still waiting on DB or Redis. Anything above is dropped. */
export const MAX_IN_FLIGHT = 16;
/** Uncommitted token ticks are dropped above this, so drags never queue behind commands. */
export const MAX_IN_FLIGHT_TOKEN_TICKS = 4;
/** Uncommitted token moves per connection, across all tokens. */
export const TOKEN_MOVE_CONN_MAX_PER_SEC = 60;
/** Per-connection token maps stop growing past this many entries (oldest evicted). */
export const MAX_TRACKED_TOKENS = 256;
/** Token ids that failed the DB lookup or were forbidden are not re-queried for this long. */
export const TOKEN_MISS_TTL_MS = 5_000;

/** Message types that mutate the map and therefore reach the DB. */
const DISCRETE_TYPES: ReadonlySet<ClientLiveMessage["type"]> = new Set<
  ClientLiveMessage["type"]
>([
  "tokenMoveCommit",
  "mapPing",
  "mapViewportGoTo",
  "mapDrawingUpsert",
  "mapDrawingRemove",
  "mapDrawingClear",
  "mapFogUpsert",
  "mapFogRemove",
  "mapFogReset",
  "mapOccluderUpsert",
  "mapOccluderRemove",
  "mapDoorState",
  "mapLightUpsert",
  "mapLightRemove",
  "mapFlags",
  "mapGrid",
  "mapTokenUpsert",
  "mapTokenRemove",
]);

type HandlerCtx = {
  auth: CampaignSocketAuth;
  /** Per-token rate limit state, capped at MAX_TRACKED_TOKENS. */
  moveRates: Map<string, RateLimitState>;
  /** Connection-wide cap on uncommitted token moves. */
  moveConnRate: RateLimitState;
  /** Token ids that failed the DB lookup or were forbidden, mapped to expiry (ms). */
  tokenMisses: Map<string, number>;
  /** Coarse per-connection rate for discrete commands. */
  commandRate: RateLimitState;
  /** Messages currently awaiting DB or Redis work. */
  inFlight: number;
  send: (event: CampaignLiveEvent) => void;
};

function isTokenMissCached(ctx: HandlerCtx, tokenId: string): boolean {
  const expiresAt = ctx.tokenMisses.get(tokenId);
  if (expiresAt === undefined) return false;
  if (expiresAt > Date.now()) return true;
  ctx.tokenMisses.delete(tokenId);
  return false;
}

function rememberTokenMiss(ctx: HandlerCtx, tokenId: string): void {
  ctx.tokenMisses.delete(tokenId);
  ctx.tokenMisses.set(tokenId, Date.now() + TOKEN_MISS_TTL_MS);
  trimToCap(ctx.tokenMisses, MAX_TRACKED_TOKENS);
}

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

  // Uncommitted ticks use a connection-wide cap plus a per-token limiter.
  // Commits are gated by commandRate in handleClientLiveMessage so a drag
  // burst cannot starve the pointer-up persist.
  if (!committed) {
    if (
      !acceptRateLimited(
        ctx.moveConnRate,
        Date.now(),
        TOKEN_MOVE_CONN_MAX_PER_SEC,
        TOKEN_MOVE_WINDOW_MS,
      )
    ) {
      return;
    }
    let rate = ctx.moveRates.get(msg.tokenId);
    if (!rate) {
      rate = createRateLimitState();
      ctx.moveRates.set(msg.tokenId, rate);
      trimToCap(ctx.moveRates, MAX_TRACKED_TOKENS);
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

  // Cold cache: load from DB once. Misses are remembered briefly so a flood
  // of unknown or forbidden ids cannot turn into a flood of queries.
  if (!meta) {
    if (isTokenMissCached(ctx, msg.tokenId)) return;
    const row = await prisma.campaignMapToken.findUnique({
      where: { id: msg.tokenId },
      include: { map: { select: { campaignId: true } } },
    });
    if (
      !row ||
      row.map.campaignId !== auth.campaignId ||
      !canMoveToken(row, auth)
    ) {
      rememberTokenMiss(ctx, msg.tokenId);
      return;
    }
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

async function handleDiscrete(run: () => Promise<unknown>): Promise<void> {
  await run();
}

/**
 * Entry point for every client message. Cheap gates run before any DB or
 * Redis work, so a flood costs the server almost nothing: in-flight cap first,
 * then the command rate limit, then the handler.
 */
export async function handleClientLiveMessage(
  ctx: HandlerCtx,
  raw: string,
): Promise<void> {
  const msg = parseClientMessage(raw);
  if (!msg) return;

  if (ctx.inFlight >= MAX_IN_FLIGHT) return;
  if (msg.type === "tokenMove" && ctx.inFlight >= MAX_IN_FLIGHT_TOKEN_TICKS) {
    return;
  }
  if (DISCRETE_TYPES.has(msg.type) && !acceptCommandRate(ctx.commandRate)) {
    return;
  }

  ctx.inFlight += 1;
  try {
    await dispatchLiveMessage(ctx, msg);
  } finally {
    ctx.inFlight -= 1;
  }
}

async function dispatchLiveMessage(
  ctx: HandlerCtx,
  msg: ClientLiveMessage,
): Promise<void> {
  const actor = actorFromAuth(ctx.auth);

  switch (msg.type) {
    case "ping":
      ctx.send({ type: "ping" });
      return;
    case "tokenMove":
      await handleTokenMove(ctx, msg, false);
      return;
    case "tokenMoveCommit":
      await handleDiscrete(() => handleTokenMove(ctx, msg, true));
      return;
    case "mapPing": {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      await handleDiscrete(() => mutateMapPing(actor, msg.x, msg.y));
      return;
    }
    case "mapViewportGoTo": {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      await handleDiscrete(() =>
        mutateViewportGoTo(actor, msg.x, msg.y),
      );
      return;
    }
    case "mapDrawingUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(async () => {
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
      await handleDiscrete(() =>
        mutateDeleteDrawing(actor, mapId, msg.drawingId),
      );
      return;
    }
    case "mapDrawingClear": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() => mutateClearDrawings(actor, mapId));
      return;
    }
    case "mapFogUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() =>
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
      await handleDiscrete(() =>
        mutateRemoveFogRegion(actor, mapId, msg.regionId),
      );
      return;
    }
    case "mapFogReset": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() => mutateResetFog(actor, mapId));
      return;
    }
    case "mapOccluderUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() =>
        mutateAddOccluder(actor, mapId, msg.kind, msg.points, msg.state),
      );
      return;
    }
    case "mapOccluderRemove": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || typeof msg.occluderId !== "string") return;
      await handleDiscrete(() =>
        mutateRemoveOccluder(actor, mapId, msg.occluderId),
      );
      return;
    }
    case "mapDoorState": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() =>
        mutateSetDoorState(actor, mapId, msg.occluderId, msg.state),
      );
      return;
    }
    case "mapLightUpsert": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId || !msg.light) return;
      await handleDiscrete(() =>
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
      await handleDiscrete(() =>
        mutateRemoveLight(actor, mapId, msg.lightId),
      );
      return;
    }
    case "mapFlags": {
      const mapId = await resolveLiveMapId(ctx.auth);
      if (!mapId) return;
      await handleDiscrete(() =>
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
      await handleDiscrete(() =>
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
      await handleDiscrete(() =>
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
      await handleDiscrete(() =>
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
    moveConnRate: createRateLimitState(),
    tokenMisses: new Map(),
    commandRate: createRateLimitState(),
    inFlight: 0,
    send,
  };
}

/** @deprecated Kept for tests that assert color assignment. */
export function _testUserColor(userId: string) {
  return userColor(userId);
}
