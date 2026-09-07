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

function wsUrl(campaignId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/campaign/${campaignId}`;
}

type LiveContextValue = {
  store: CampaignLiveStore;
  send: (msg: ClientLiveMessage) => void;
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
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(wsUrl(campaignId));
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        store.setConnected(true);
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
        setConnected(false);
        store.setConnected(false);
        wsRef.current = null;
        if (closed) return;
        const delay = Math.min(10_000, 500 * 2 ** attempt);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      store.setConnected(false);
    };
  }, [campaignId, enabled, store]);

  const send = useCallback((msg: ClientLiveMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (msg.type === "tokenMove" || msg.type === "tokenMoveCommit") {
      store.noteSelfMove(msg.tokenId, msg.seq);
    }
    ws.send(JSON.stringify(msg));
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

export function useLiveActivity(store: CampaignLiveStore) {
  useLiveStoreVersion(store);
  return store.getState().activity;
}
