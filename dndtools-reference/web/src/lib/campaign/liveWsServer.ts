import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { Server as HttpServer, IncomingMessage } from "http";
import type { Duplex } from "stream";
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
import {
  guardUpgradeSocket,
  rejectUpgrade,
} from "@/lib/campaign/liveWsUpgrade";
import type { CampaignLiveEvent } from "@/lib/campaign/types";
import {
  createHandlerCtx,
  handleClientLiveMessage,
  MAX_WS_MESSAGE_BYTES,
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
  handleUpgrade: (
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ) => void;
  close: () => void;
};

export function createCampaignWebSocket(): CampaignWsAttachment {
  // maxPayload makes ws reject oversized frames before buffering them.
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_WS_MESSAGE_BYTES,
  });

  wss.on(
    "connection",
    (
      ws: WebSocket,
      _req: IncomingMessage,
      auth: NonNullable<Awaited<ReturnType<typeof authorizeCampaignSocket>>>,
    ) => {
      // ws emits "error" for bad frames and oversized payloads. Without a
      // listener that becomes an uncaught exception and kills the process.
      ws.on("error", (err) => {
        console.warn("[ws] socket error", auth.campaignId, auth.userId, err.message);
      });

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

    // Errors on the raw socket are logged and the socket is closed while we await auth.
    const releaseGuard = guardUpgradeSocket(socket, (err) => {
      console.warn("[ws] upgrade socket error", campaignId, err.message);
    });
    let handedOff = false;

    void (async () => {
      const auth = await authorizeCampaignSocket(
        req.headers.cookie,
        campaignId,
      );
      releaseGuard();
      if (!auth) {
        rejectUpgrade(socket, "HTTP/1.1 401 Unauthorized\r\n\r\n");
        return;
      }

      handedOff = true;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, auth);
      });
    })().catch((err) => {
      console.error("[ws] upgrade failed", campaignId, err);
      releaseGuard();
      if (handedOff) {
        socket.destroy();
      } else {
        rejectUpgrade(socket, "HTTP/1.1 500 Internal Server Error\r\n\r\n");
      }
    });
  };

  return {
    handleUpgrade,
    close: () => {
      // 1012 "service restart" tells clients to reconnect, and the existing
      // client backoff does the rest.
      for (const client of wss.clients) {
        client.close(1012, "server restarting");
      }
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
