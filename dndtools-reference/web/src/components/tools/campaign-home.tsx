"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  acceptCampaignInvite,
  createCampaign,
  declineCampaignInvite,
  joinCampaignByCode,
  listMyCampaigns,
} from "@/actions/campaigns";
import { useAuthUser } from "@/components/auth-provider";
import type { CampaignSummary } from "@/lib/campaign/types";

export function CampaignHome() {
  const user = useAuthUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinParam = searchParams.get("join");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(joinParam ?? "");
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const list = await listMyCampaigns();
        setCampaigns(list);
        setError(null);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Could not load campaigns";
        setError(message);
      } finally {
        setLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!user || !joinParam) return;
    startTransition(async () => {
      const result = await joinCampaignByCode(joinParam);
      if (result.success && result.campaignId) {
        router.replace(`/tools/campaign/${result.campaignId}`);
      } else {
        setError(result.error ?? "Could not join campaign");
        setJoinCode(joinParam);
      }
    });
  }, [user, joinParam, router]);

  if (!user) {
    return (
      <div className="pc-planner-auth-gate">
        <p>Campaign tables require an account so players can share dice and characters.</p>
        <Link href="/login?next=/tools/campaign" className="tool-btn">
          Sign in to continue
        </Link>
      </div>
    );
  }

  const pendingInvites = campaigns.filter((c) => c.status === "pending");
  const active = campaigns.filter((c) => c.status === "active");

  function handleCreate() {
    startTransition(async () => {
      const result = await createCampaign(name || "New campaign");
      if (!result.success || !result.campaign) {
        setError(result.error ?? "Could not create campaign");
        return;
      }
      router.push(`/tools/campaign/${result.campaign.id}`);
    });
  }

  function handleJoin() {
    startTransition(async () => {
      const result = await joinCampaignByCode(joinCode);
      if (!result.success || !result.campaignId) {
        setError(result.error ?? "Could not join");
        return;
      }
      router.push(`/tools/campaign/${result.campaignId}`);
    });
  }

  return (
    <div className="campaign-home">
      {error ? (
        <p className="campaign-alert" role="alert">
          {error}
        </p>
      ) : null}

      <div className="campaign-home-actions">
        <section className="campaign-home-panel">
          <h2>Create campaign</h2>
          <p className="campaign-home-hint">You become the DM. Share the join code with players.</p>
          <form
            className="campaign-home-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              type="text"
              className="pc-sheet-input"
              placeholder="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              disabled={pending}
              aria-label="Campaign name"
            />
            <button type="submit" className="tool-btn" disabled={pending}>
              Create as DM
            </button>
          </form>
        </section>

        <section className="campaign-home-panel">
          <h2>Join with code</h2>
          <p className="campaign-home-hint">Enter an 8-character code from your DM.</p>
          <form
            className="campaign-home-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <input
              type="text"
              className="pc-sheet-input"
              placeholder="Join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={16}
              disabled={pending}
              aria-label="Join code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="tool-btn"
              disabled={pending || !joinCode.trim()}
            >
              Join
            </button>
          </form>
        </section>
      </div>

      {pendingInvites.length > 0 ? (
        <section className="campaign-home-panel campaign-list-section">
          <div className="campaign-list-header">
            <h2>Pending invites</h2>
            <span className="campaign-list-count">{pendingInvites.length}</span>
          </div>
          <ul className="campaign-list">
            {pendingInvites.map((c) => (
              <li key={c.id} className="campaign-list-item campaign-list-item--invite">
                <div className="campaign-list-item-main">
                  <span className="campaign-list-link">{c.name}</span>
                  <span className="campaign-list-meta">
                    <span className="campaign-list-chip">Invite</span>
                    Invited as player
                  </span>
                </div>
                <div className="campaign-list-actions">
                  <button
                    type="button"
                    className="tool-btn"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await acceptCampaignInvite(c.id);
                        if (r.success) router.push(`/tools/campaign/${c.id}`);
                        else setError(r.error ?? "Could not accept");
                      })
                    }
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await declineCampaignInvite(c.id);
                        refresh();
                      })
                    }
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="campaign-home-panel campaign-list-section">
        <div className="campaign-list-header">
          <h2>Your campaigns</h2>
          {loaded && !pending ? (
            <span className="campaign-list-count">
              {active.length} {active.length === 1 ? "table" : "tables"}
            </span>
          ) : null}
        </div>
        {!loaded && pending ? (
          <p className="pc-planner-loading">Loading campaigns…</p>
        ) : active.length === 0 ? (
          <p className="pc-planner-list-empty">
            No campaigns yet. Create one as DM or join with a code.
          </p>
        ) : (
          <ul className="campaign-list">
            {active.map((c) => (
              <li key={c.id} className="campaign-list-item">
                <Link
                  href={`/tools/campaign/${c.id}`}
                  className="campaign-list-item-main"
                >
                  <span className="campaign-list-link">{c.name}</span>
                  <span className="campaign-list-meta">
                    <span className="campaign-list-chip">
                      {c.role === "dm" ? "DM" : "Player"}
                    </span>
                    <span>
                      {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
                    </span>
                    <span>
                      {c.pcCount} {c.pcCount === 1 ? "PC" : "PCs"}
                    </span>
                    <span>Code {c.joinCode}</span>
                  </span>
                </Link>
                <div className="campaign-list-actions">
                  <Link href={`/tools/campaign/${c.id}`} className="tool-btn">
                    Open table
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
