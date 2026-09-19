"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getCampaignTable } from "@/actions/campaigns";
import { useAuthUser } from "@/components/auth-provider";
import { DiceCanvas } from "@/components/dice/dice-canvas";
import { DiceLogTray } from "@/components/dice/dice-log-tray";
import { DiceProvider } from "@/components/dice/dice-provider";
import { DiceTray } from "@/components/dice/dice-tray";
import { CombatProvider } from "@/components/combat/combat-context";
import {
  CombatTrackerPanel,
  combatSubtitle,
} from "@/components/combat/combat-tracker-panel";
import { CampaignLiveProvider, useCampaignLive } from "@/components/tools/campaign-live-provider";
import { useLiveCombat } from "@/lib/campaign/liveClient";
import type { CampaignTableState } from "@/lib/campaign/types";
import { rollViewToResult } from "@/lib/campaign/types";

export function CampaignCombatPopout({ campaignId }: { campaignId: string }) {
  const user = useAuthUser();
  const [table, setTable] = useState<CampaignTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    startTransition(async () => {
      const next = await getCampaignTable(campaignId);
      if (!next || next.myStatus !== "active") {
        setError("Campaign not found or you are not an active member.");
        setTable(null);
        return;
      }
      setTable(next);
      setError(null);
    });
  }, [user, campaignId]);

  if (!user) {
    return (
      <div className="pc-planner-auth-gate">
        <p>Sign in to open the combat tracker.</p>
        <Link
          href={`/login?next=/tools/campaign/${campaignId}/combat`}
          className="tool-btn"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!table && !error) {
    return <p className="pc-planner-loading">Loading…</p>;
  }

  if (!table) {
    return (
      <div className="campaign-home">
        <p className="tool-error">{error}</p>
        <Link href={`/tools/campaign/${campaignId}`} className="tool-btn tool-btn--ghost">
          Back to table
        </Link>
      </div>
    );
  }

  const initialHistory = table.rolls
    .map((r) => rollViewToResult(r))
    .filter((r): r is NonNullable<typeof r> => r != null);

  return (
    <CampaignLiveProvider
      campaignId={campaignId}
      table={table}
      viewerUserId={user.id}
      enabled
    >
      <DiceProvider
        campaign={{
          campaignId,
          actor: {
            userId: user.id,
            username: user.username,
            characterName: null,
          },
          isDm: table.myRole === "dm",
          initialHistory,
          onRollError: setError,
        }}
      >
        <CampaignCombatPopoutBody
          campaignId={campaignId}
          table={table}
          error={error}
        />
      </DiceProvider>
    </CampaignLiveProvider>
  );
}

function CampaignCombatPopoutBody({
  campaignId,
  table,
  error,
}: {
  campaignId: string;
  table: CampaignTableState;
  error: string | null;
}) {
  const user = useAuthUser()!;
  const { store } = useCampaignLive();
  const liveCombat = useLiveCombat(store);
  const combat = liveCombat ?? table.combat;
  const isDm = table.myRole === "dm";
  const viewerPcPlanId =
    table.pcs.find((p) => p.userId === user.id)?.pcPlanId ?? null;

  function focusTable() {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        return;
      } catch {
        // fall through
      }
    }
    window.location.href = `/tools/campaign/${campaignId}`;
  }

  return (
    <>
      <div className="campaign-sheet-popout">
        <header className="campaign-sheet-popout-header">
          <div>
            <h1>Combat</h1>
            <p className="campaign-sheet-popout-status">{combatSubtitle(combat)}</p>
          </div>
          <button type="button" className="tool-btn tool-btn--ghost" onClick={focusTable}>
            Back to table
          </button>
        </header>

        <div className="campaign-sheet-popout-body">
          {error ? <p className="tool-error">{error}</p> : null}
          <CombatProvider
            campaignId={campaignId}
            combat={combat}
            isDm={isDm}
            viewerPcPlanId={viewerPcPlanId}
          >
            <CombatTrackerPanel
              combat={combat}
              isDm={isDm}
              viewerPcPlanId={viewerPcPlanId}
              campaignId={campaignId}
            />
          </CombatProvider>
        </div>
      </div>

      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
