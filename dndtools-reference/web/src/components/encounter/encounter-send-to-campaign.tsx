"use client";

import { sendEncounterBuilderToCampaign } from "@/actions/combat";
import { listMyCampaigns } from "@/actions/campaigns";
import type { EncounterEntry } from "@/lib/encounter/types";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

export function EncounterSendToCampaign({
  encounterName,
  entries,
}: {
  encounterName: string;
  entries: EncounterEntry[];
}) {
  const [campaigns, setCampaigns] = useState<
    Awaited<ReturnType<typeof listMyCampaigns>>
  >([]);
  const [campaignId, setCampaignId] = useState("");
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listMyCampaigns().then((rows) => {
      const dmCampaigns = rows.filter((c) => c.role === "dm");
      setCampaigns(dmCampaigns);
      setCampaignId(dmCampaigns[0]?.id ?? "");
    });
  }, []);

  const dmCampaigns = campaigns.filter((c) => c.role === "dm");
  if (entries.length === 0) return null;

  return (
    <div className="encounter-send-campaign">
      <h3>Send to campaign</h3>
      {dmCampaigns.length === 0 ? (
        <p className="campaign-roster-hint">
          Create a campaign as DM to import this encounter.
        </p>
      ) : (
        <>
          <label className="tool-field">
            <span className="tool-label">Campaign</span>
            <select
              className="tool-input"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {dmCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            disabled={pending || !campaignId}
            onClick={() => {
              setError(null);
              setResultLink(null);
              startTransition(async () => {
                const result = await sendEncounterBuilderToCampaign(
                  campaignId,
                  encounterName,
                  entries.map((e) => ({
                    monsterSlug: e.slug,
                    quantity: e.count,
                  })),
                );
                if (!result.success) {
                  setError(result.error ?? "Send failed");
                  return;
                }
                setResultLink(`/tools/campaign/${result.campaignId}`);
              });
            }}
          >
            Send to campaign
          </button>
        </>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
      {resultLink ? (
        <p>
          Saved.{" "}
          <Link href={resultLink} className="tool-link">
            Open campaign
          </Link>
        </p>
      ) : null}
    </div>
  );
}
