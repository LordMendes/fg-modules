"use client";

import { useMemo, useState } from "react";
import type { CampaignActivityView } from "@/lib/campaign/types";

function formatActivityTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ActivityRow({ activity }: { activity: CampaignActivityView }) {
  const [open, setOpen] = useState(false);
  const hasDetails = activity.details.length > 0;

  return (
    <li className="campaign-log-item">
      <div className="campaign-log-item-main">
        <time className="campaign-log-time" dateTime={activity.createdAt}>
          {formatActivityTime(activity.createdAt)}
        </time>
        <div className="campaign-log-body">
          {activity.pcName ? (
            <span className="campaign-log-pc">{activity.pcName}</span>
          ) : null}
          <p className="campaign-log-summary">{activity.summary}</p>
          {hasDetails ? (
            <button
              type="button"
              className="campaign-log-toggle"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide details" : `Details (${activity.details.length})`}
            </button>
          ) : null}
        </div>
      </div>
      {open && hasDetails ? (
        <ul className="campaign-log-details">
          {activity.details.map((d, i) => (
            <li key={`${activity.id}-${i}`}>
              <strong>{d.path}</strong>
              {d.from != null || d.to != null ? (
                <span>
                  {d.from ?? "-"} to {d.to ?? "-"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CampaignLogsDrawer({
  activities,
  loading,
  onClose,
}: {
  activities: CampaignActivityView[];
  loading: boolean;
  onClose: () => void;
}) {
  const sorted = useMemo(
    () =>
      [...activities].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activities],
  );

  return (
    <>
      <button
        type="button"
        className="campaign-drawer-backdrop"
        aria-label="Close logs"
        onClick={onClose}
      />
      <aside className="campaign-drawer" aria-label="Campaign logs">
        <header className="campaign-drawer-header">
          <div>
            <h2 className="campaign-drawer-title">Logs</h2>
            <p className="campaign-drawer-sub">
              Sheet and roster changes. Dice rolls stay in the dice log.
            </p>
          </div>
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        {loading && sorted.length === 0 ? (
          <p className="campaign-party-empty">Loading logs…</p>
        ) : sorted.length === 0 ? (
          <p className="campaign-party-empty">No changes logged yet.</p>
        ) : (
          <ul className="campaign-log-list">
            {sorted.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
