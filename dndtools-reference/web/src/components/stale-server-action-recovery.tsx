"use client";

import { useEffect, useState } from "react";

const RELOAD_FLAG = "stale-server-action-reload-attempted";

function isStaleServerActionError(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false;
  const err = reason as { name?: string; message?: string };
  if (err.name === "UnrecognizedActionError") return true;
  if (
    typeof err.message === "string" &&
    err.message.includes("was not found on the server")
  ) {
    return true;
  }
  return false;
}

export function StaleServerActionRecovery() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const clearTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignore private browsing / blocked storage
      }
    }, 5000);

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isStaleServerActionError(event.reason)) return;

      event.preventDefault();

      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
          return;
        }
      } catch {
        // fall through to banner
      }

      setShowBanner(true);
    }

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="stale-action-banner" role="alert">
      <p>This page is out of date. Reload to continue.</p>
      <button
        type="button"
        className="btn-primary stale-action-banner-btn"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}
