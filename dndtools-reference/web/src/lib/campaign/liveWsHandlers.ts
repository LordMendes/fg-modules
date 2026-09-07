import {
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
import { canWalkTo, tokenCenter } from "@/lib/map/los";
import {
  loadLiveMapForCampaign,
  toCampaignMapView,
  mapInclude,
  loadPcTokenUrls,
} from "@/lib/map/mapView";
import { userColor } from "@/lib/map/permissions";
import { prisma } from "@/lib/prisma";

export const MAX_WS_MESSAGE_BYTES = 8 * 1024;

type HandlerCtx = {
  auth: CampaignSocketAuth;
  /** Per-token rate limit state. */
  moveRates: Map<string, RateLimitState>;
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

function canMoveToken(
  token: { ownerUserId: string | null },
  auth: CampaignSocketAuth,
): boolean {
  if (auth.role === "dm") return true;
  return token.ownerUserId === auth.userId;
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

  if (!committed) {
    let rate = ctx.moveRates.get(msg.tokenId);
    if (!rate) {
      rate = createRateLimitState();
      ctx.moveRates.set(msg.tokenId, rate);
    }
    if (!acceptTokenMoveRate(rate)) return;
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

  if (!committed) {
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
    return;
  }

  // Persist commit.
  const token = await prisma.campaignMapToken.findUnique({
    where: { id: msg.tokenId },
    include: {
      map: {
        select: {
          campaignId: true,
          losEnabled: true,
          id: true,
        },
      },
    },
  });
  if (!token || token.map.campaignId !== auth.campaignId) return;
  if (!canMoveToken(token, auth)) return;

  if (token.map.losEnabled) {
    const occluderRows = await prisma.campaignMapOccluder.findMany({
      where: { mapId: token.mapId },
    });
    const occluders = occluderRows.map((o) => ({
      id: o.id,
      kind: o.kind as
        | "wall"
        | "door"
        | "window"
        | "terrain"
        | "secret"
        | "illusion"
        | "pit",
      points: (Array.isArray(o.points) ? o.points : []) as {
        x: number;
        y: number;
      }[],
      state: (o.state as "open" | "closed" | "locked") ?? "closed",
    }));
    const from = tokenCenter(token);
    const to = tokenCenter({
      x: msg.x,
      y: msg.y,
      width: token.width,
      height: token.height,
    });
    if (!canWalkTo(from, to, occluders)) {
      const snapSeq = Math.max(msg.seq, token.seq + 1);
      publishCampaignLive(auth.campaignId, {
        type: "mapTokenMove",
        tokenId: msg.tokenId,
        x: token.x,
        y: token.y,
        rotation: token.rotation,
        seq: snapSeq,
        committed: true,
      });
      return;
    }
  }

  const nextSeq = Math.max(msg.seq, token.seq + 1);
  await prisma.campaignMapToken.update({
    where: { id: msg.tokenId },
    data: {
      x: msg.x,
      y: msg.y,
      rotation: msg.rotation,
      seq: nextSeq,
    },
  });

  await roomUpsertToken(auth.campaignId, {
    ...meta,
    x: msg.x,
    y: msg.y,
    seq: nextSeq,
  });

  publishCampaignLive(auth.campaignId, {
    type: "mapTokenMove",
    tokenId: msg.tokenId,
    x: msg.x,
    y: msg.y,
    rotation: msg.rotation,
    seq: nextSeq,
    committed: true,
  });
}

export async function handleClientLiveMessage(
  ctx: HandlerCtx,
  raw: string,
): Promise<void> {
  const msg = parseClientMessage(raw);
  if (!msg) return;

  switch (msg.type) {
    case "ping":
      ctx.send({ type: "ping" });
      return;
    case "tokenMove":
      await handleTokenMove(ctx, msg, false);
      return;
    case "tokenMoveCommit":
      await handleTokenMove(ctx, msg, true);
      return;
    case "mapPing": {
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      publishCampaignLive(ctx.auth.campaignId, {
        type: "mapPing",
        x: msg.x,
        y: msg.y,
        color: userColor(ctx.auth.userId),
        userId: ctx.auth.userId,
      });
      return;
    }
    case "mapViewportGoTo": {
      if (ctx.auth.role !== "dm") return;
      if (typeof msg.x !== "number" || typeof msg.y !== "number") return;
      publishCampaignLive(ctx.auth.campaignId, {
        type: "mapViewportGoTo",
        x: msg.x,
        y: msg.y,
      });
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
  return { auth, moveRates: new Map(), send };
}
