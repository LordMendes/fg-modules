"use client";

import { useEffect, useState, useTransition } from "react";
import {
  disablePcPlanShare,
  enablePcPlanShare,
  getPcPlanShare,
  type PcPlanShareInfo,
} from "@/actions/pc-plans";

export function PcPlanShareDialog({
  planId,
  planName,
  onClose,
}: {
  planId: string;
  planName: string;
  onClose: () => void;
}) {
  const [share, setShare] = useState<PcPlanShareInfo | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      const existing = await getPcPlanShare(planId);
      if (existing) {
        setShare(existing);
        setIsPublic(true);
      }
      setLoading(false);
    });
  }, [planId]);

  function shareUrl(): string {
    if (!share) return "";
    if (typeof window === "undefined") return share.sharePath;
    return `${window.location.origin}${share.sharePath}`;
  }

  async function handleCopyLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy link to clipboard");
    }
  }

  function handleTogglePublic(enabled: boolean) {
    setError(null);
    startTransition(async () => {
      if (enabled) {
        const result = await enablePcPlanShare(planId);
        if (!result.success || !result.share) {
          setError(result.error ?? "Could not enable sharing");
          return;
        }
        setShare(result.share);
        setIsPublic(true);
        return;
      }

      const result = await disablePcPlanShare(planId);
      if (!result.success) {
        setError(result.error ?? "Could not stop sharing");
        return;
      }
      setShare(null);
      setIsPublic(false);
    });
  }

  return (
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
        disabled={pending}
      />
      <div
        className="confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-plan-share-title"
      >
        <h3 id="pc-plan-share-title">Share character</h3>
        <p>
          Share <strong>{planName}</strong> with a link. Viewers see a read-only copy of the
          character sheet.
        </p>

        <label className="pc-checkbox-label pc-plan-share-public-toggle">
          <input
            type="checkbox"
            checked={isPublic}
            disabled={pending || loading}
            onChange={(event) => handleTogglePublic(event.target.checked)}
          />
          Public (no sign-in required)
        </label>
        <p className="damage-statistic-note">
          When public, anyone with the link can view the character without an account. Sign in is
          still required to add a copy to your own plans.
        </p>

        {error ? (
          <p className="profile-error" role="alert">
            {error}
          </p>
        ) : null}

        {isPublic && share ? (
          <p className="pc-plan-share-url">
            <code>{shareUrl()}</code>
          </p>
        ) : loading ? (
          <p className="pc-plan-share-url">Loading…</p>
        ) : null}

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="tool-btn tool-btn--ghost"
            onClick={onClose}
            disabled={pending}
          >
            Close
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => void handleCopyLink()}
            disabled={pending || !share || !isPublic}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
