"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  useCampaignLiveConnection,
} from "@/lib/campaign/liveClient";
import type { CampaignLiveStore } from "@/lib/campaign/liveStore";
import type { CampaignTableState, ClientLiveMessage } from "@/lib/campaign/types";

type CampaignLiveContextValue = {
  store: CampaignLiveStore;
  send: (msg: ClientLiveMessage) => void;
  connected: boolean;
};

const CampaignLiveContext = createContext<CampaignLiveContextValue | null>(
  null,
);

export function CampaignLiveProvider({
  campaignId,
  table,
  viewerUserId,
  enabled,
  children,
}: {
  campaignId: string;
  table: CampaignTableState;
  viewerUserId: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const value = useCampaignLiveConnection(
    campaignId,
    table,
    viewerUserId,
    enabled,
  );
  return (
    <CampaignLiveContext.Provider value={value}>
      {children}
    </CampaignLiveContext.Provider>
  );
}

export function useCampaignLive(): CampaignLiveContextValue {
  const ctx = useContext(CampaignLiveContext);
  if (!ctx) {
    throw new Error("useCampaignLive must be used within CampaignLiveProvider");
  }
  return ctx;
}

export function useCampaignLiveOptional(): CampaignLiveContextValue | null {
  return useContext(CampaignLiveContext);
}
