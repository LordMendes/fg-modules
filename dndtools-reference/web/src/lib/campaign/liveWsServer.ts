import { randomUUID } from "crypto";
import type { Server as HttpServer, IncomingMessage } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { authorizeCampaignSocket } from "@/lib/campaign/liveAuth";
import {
  publishCampaignLive,
  subscribeCampaignLiveLocal,
} from "@/lib/campaign/liveHub";
import {
  roomAddOnline,
  roomGetOnlineUserIds,
  roomRemoveOnline,
} from "@/lib/campaign/liveRoom";
import type { CampaignLiveEvent } from "@/lib/campaign/types";
import {
  createHandlerCtx,
  handleClientLiveMessage,
  sendInitialSnapshot,
} from "@/lib/campaign/liveWsHandlers";

const WS_PATH_RE = /^\/ws\/campaign\/([^/?#]+)\/?$/;

export function isCampaignWsPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  return WS_PATH_RE.test(path);
}

function campaignIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0] ?? url;
  const m = path.match(WS_PATH_RE);
  return m?.[1] ?? null;
}

async function broadcastPresence(campaignId: string) {
  const onlineUserIds = await roomGetOnlineUserIds(campaignId);
  publishCampaignLive(campaignId, { type: "presence", onlineUserIds });
}

export type CampaignWsAttachment = {
  /** Handle an upgrade already identified as /ws/campaign/:id. */
  handleUpgrade: (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => void;
  close: () => void;
};

/**
 * Create the campaign WebSocket server (noServer).
 * Wire `handleUpgrade` from a single HTTP `upgrade` listener in server.ts
 * so Next HMR and campaign WS do not race.
 */
export function createCampaignWebSocket(): CampaignWsAttachment {
  const wss = new WebSocketServer({ noServer: true });

  wss.on(
    "connection",
    (
      ws: WebSocket,
      _req: IncomingMessage,
      auth: NonNullable<Awaited<ReturnType<typeof authorizeCampaignSocket>>>,
    ) => {
      const connectionId = randomUUID();
      const send = (event: CampaignLiveEvent) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        try {
          ws.send(JSON.stringify(event));
        } catch {
          // ignore
        }
      };

      const unsubscribe = subscribeCampaignLiveLocal(
        auth.campaignId,
        auth.userId,
        connectionId,
        send,
        auth.dmUserId,
      );

      const handlerCtx = createHandlerCtx(auth, send);

      void (async () => {
        await roomAddOnline(auth.campaignId, auth.userId, connectionId);
        await broadcastPresence(auth.campaignId);
        send({ type: "ping" });
        await sendInitialSnapshot(auth, send);
      })().catch((err) => {
        console.error("[ws] connect setup failed", err);
      });

      ws.on("message", (data, isBinary) => {
        if (isBinary) return;
        const raw =
          typeof data === "string"
            ? data
            : Buffer.isBuffer(data)
              ? data.toString("utf8")
              : Array.isArray(data)
                ? Buffer.concat(data).toString("utf8")
                : String(data);
        void handleClientLiveMessage(handlerCtx, raw).catch(() => {});
      });

      ws.on("close", () => {
        unsubscribe();
        void (async () => {
          const left = await roomRemoveOnline(
            auth.campaignId,
            auth.userId,
            connectionId,
          );
          if (left) await broadcastPresence(auth.campaignId);
        })().catch(() => {});
      });
    },
  );

  const handleUpgrade = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    const campaignId = campaignIdFromUrl(req.url);
    if (!campaignId) {
      socket.destroy();
      return;
    }

    void (async () => {
      const auth = await authorizeCampaignSocket(
        req.headers.cookie,
        campaignId,
      );
      if (!auth) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, auth);
      });
    })().catch(() => {
      try {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      } catch {
        // ignore
      }
      socket.destroy();
    });
  };

  return {
    handleUpgrade,
    close: () => {
      wss.close();
    },
  };
}

/** @deprecated Prefer createCampaignWebSocket + single upgrade router. */
export function attachCampaignWebSocket(server: HttpServer): () => void {
  const ws = createCampaignWebSocket();
  const onUpgrade = (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => {
    if (!isCampaignWsPath(req.url)) return;
    ws.handleUpgrade(req, socket, head);
  };
  server.on("upgrade", onUpgrade);
  return () => {
    server.off("upgrade", onUpgrade);
    ws.close();
  };
}
