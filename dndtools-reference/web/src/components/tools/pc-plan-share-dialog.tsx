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
      const existing = await getPcPlanShare(planId);
      if (existing) {
        setShare(existing);
        return;
      }
      const result = await enablePcPlanShare(planId);
      if (!result.success || !result.share) {
        setError(result.error ?? "Could not enable sharing");
        return;
      }
      setShare(result.share);
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

  function handleStopSharing() {
    startTransition(async () => {
      const result = await disablePcPlanShare(planId);
      if (!result.success) {
        setError(result.error ?? "Could not stop sharing");
        return;
      }
      onClose();
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
          Anyone with this link can view <strong>{planName}</strong> read-only and add a copy to
          their own plans.
        </p>
        {error ? (
          <p className="profile-error" role="alert">
            {error}
          </p>
        ) : null}
        {share ? (
          <p className="pc-plan-share-url">
            <code>{shareUrl()}</code>
          </p>
        ) : (
          <p className="pc-plan-share-url">Generating link…</p>
        )}
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
            className="tool-btn tool-btn--ghost tool-btn--danger"
            onClick={handleStopSharing}
            disabled={pending || !share}
          >
            Stop sharing
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => void handleCopyLink()}
            disabled={pending || !share}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
