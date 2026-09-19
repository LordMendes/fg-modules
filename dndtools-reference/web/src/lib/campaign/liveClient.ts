"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  createLiveStore,
  mapViewWithTokens,
  type CampaignLiveStore,
} from "@/lib/campaign/liveStore";
import type {
  CampaignLiveEvent,
  CampaignTableState,
  ClientLiveMessage,
} from "@/lib/campaign/types";
import type { CampaignMapView, MapTokenView } from "@/lib/map/types";

const SEND_QUEUE_CAP = 50;

function wsUrl(campaignId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = `/ws/campaign/${campaignId}`;

  // Same origin so the auth cookie is sent. In local dev, Next rewrites
  // /ws/campaign/:id to the standalone process on WS_PORT.
  // localhost vs 127.0.0.1 are different cookie jars, so never cross them.
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) {
    try {
      const u = new URL(explicit);
      const pageHost = window.location.hostname;
      const loopback =
        (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
        (pageHost === "127.0.0.1" || pageHost === "localhost");
      if (loopback) {
        return `${proto}//${window.location.host}${path}`;
      }
      return `${u.protocol}//${u.host}${path}`;
    } catch {
      return `${explicit.replace(/\/$/, "")}${path}`;
    }
  }

  return `${proto}//${window.location.host}${path}`;
}

export type LiveSend = (msg: ClientLiveMessage) => boolean;

type LiveContextValue = {
  store: CampaignLiveStore;
  send: LiveSend;
  connected: boolean;
};

const stores = new Map<string, CampaignLiveStore>();

function getOrCreateStore(
  campaignId: string,
  table: CampaignTableState,
  viewerUserId: string,
): CampaignLiveStore {
  const key = `${campaignId}:${viewerUserId}`;
  let store = stores.get(key);
  if (!store) {
    store = createLiveStore({ table, viewerUserId });
    stores.set(key, store);
  } else {
    store.hydrateFromTable(table);
  }
  return store;
}

function noteSelfIfMove(store: CampaignLiveStore, msg: ClientLiveMessage) {
  if (msg.type === "tokenMove" || msg.type === "tokenMoveCommit") {
    store.noteSelfMove(msg.tokenId, msg.seq);
  }
}

/**
 * One WebSocket per campaign window. Shares the store across table + dice.
 */
export function useCampaignLiveConnection(
  campaignId: string,
  table: CampaignTableState,
  viewerUserId: string,
  enabled: boolean,
): LiveContextValue {
  const store = useMemo(
    () => getOrCreateStore(campaignId, table, viewerUserId),
    // Recreate only when campaign/user changes; hydrate on table refresh separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campaignId, viewerUserId],
  );

  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientLiveMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const tableRef = useRef(table);
  tableRef.current = table;

  useEffect(() => {
    store.hydrateFromTable(table);
  }, [store, table]);

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const flushQueue = (ws: WebSocket) => {
      const q = queueRef.current;
      queueRef.current = [];
      for (const msg of q) {
        try {
          noteSelfIfMove(store, msg);
          ws.send(JSON.stringify(msg));
        } catch {
          // drop
        }
      }
    };

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl(campaignId));
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        store.setConnected(true);
        flushQueue(ws);
      };

      ws.onmessage = (ev) => {
        try {
          const event = JSON.parse(String(ev.data)) as CampaignLiveEvent;
          store.applyEvent(event);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        setConnected(false);
        store.setConnected(false);
        if (closed) return;
        const delay = Math.min(10_000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    // Delay the first open so React Strict Mode's mount/unmount/remount
    // does not abort a CONNECTING socket.
    startTimer = setTimeout(connect, 50);

    return () => {
      closed = true;
      if (startTimer) clearTimeout(startTimer);
      if (retryTimer) clearTimeout(retryTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      queueRef.current = [];
      store.setConnected(false);
      setConnected(false);
    };
  }, [campaignId, enabled, store]);

  const send = useCallback((msg: ClientLiveMessage): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      noteSelfIfMove(store, msg);
      ws.send(JSON.stringify(msg));
      return true;
    }
    // Queue discrete commands (not high-frequency ticks) for reconnect flush.
    if (msg.type !== "tokenMove") {
      const q = queueRef.current;
      if (q.length >= SEND_QUEUE_CAP) q.shift();
      q.push(msg);
      if (msg.type === "tokenMoveCommit") {
        noteSelfIfMove(store, msg);
      }
    }
    return false;
  }, [store]);

  return { store, send, connected };
}

export function useLiveStoreVersion(store: CampaignLiveStore): number {
  return useSyncExternalStore(
    store.subscribe,
    store.getVersion,
    store.getVersion,
  );
}

export function useLiveTokenVersion(store: CampaignLiveStore): number {
  return useSyncExternalStore(
    store.subscribe,
    store.getTokenVersion,
    store.getTokenVersion,
  );
}

export function useLivePcVersion(store: CampaignLiveStore): number {
  return useSyncExternalStore(
    store.subscribe,
    store.getPcVersion,
    store.getPcVersion,
  );
}

export function useLiveRollVersion(store: CampaignLiveStore): number {
  return useSyncExternalStore(
    store.subscribe,
    store.getRollVersion,
    store.getRollVersion,
  );
}

export function useLiveMap(
  store: CampaignLiveStore,
): CampaignMapView | null {
  const tokenVersion = useLiveTokenVersion(store);
  return useMemo(() => {
    const s = store.getState();
    return mapViewWithTokens(s.liveMap, s.tokens);
    // tokenVersion covers token + structural map updates that bump tokenVersion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tokenVersion]);
}

export function useLiveTokens(
  store: CampaignLiveStore,
): MapTokenView[] {
  useLiveTokenVersion(store);
  return Array.from(store.getState().tokens.values());
}

export function useLivePresence(store: CampaignLiveStore): string[] {
  useLiveStoreVersion(store);
  return store.getState().onlineUserIds;
}

export function useLivePcUpdated(store: CampaignLiveStore) {
  useLivePcVersion(store);
  return store.getState().pcUpdated;
}

export function useLiveRolls(store: CampaignLiveStore) {
  useLiveRollVersion(store);
  return store.getState().rolls;
}

export function useLiveCombat(store: CampaignLiveStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().combat,
    () => store.getState().combat,
  );
}

export function useLiveCombatEvents(store: CampaignLiveStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().combatEvents,
    () => store.getState().combatEvents,
  );
}

export function useLiveNpcLibrary(store: CampaignLiveStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().npcLibrary,
    () => store.getState().npcLibrary,
  );
}

export function useLiveEncounters(store: CampaignLiveStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().encounters,
    () => store.getState().encounters,
  );
}

export function useLiveActivity(store: CampaignLiveStore) {
  useLiveStoreVersion(store);
  return store.getState().activity;
}
