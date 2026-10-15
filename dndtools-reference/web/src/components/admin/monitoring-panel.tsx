"use client";

import { useState, useTransition } from "react";
import {
  reportServerTestError,
  throwServerTestError,
} from "@/actions/monitoring";

export function MonitoringPanel() {
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [shouldThrowOnRender, setShouldThrowOnRender] = useState(false);
  const [pending, startTransition] = useTransition();

  if (shouldThrowOnRender) {
    throw new Error("Admin test: render error");
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_ERROR_DASHBOARD_URL;

  return (
    <div className="table-wrap">
      <p>
        Smoke-test buttons for GlitchTip / Sentry wiring. Use only on staging or
        when you expect Discord alerts.
      </p>
      <div className="tool-button-row">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setPanelMessage(null);
              try {
                await throwServerTestError();
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : String(err);
                setPanelMessage(`Caught from server action: ${msg}`);
              }
            })
          }
        >
          Throw in server action
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setPanelMessage(null);
              try {
                const result = await reportServerTestError();
                setPanelMessage(result);
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : String(err);
                setPanelMessage(`Report failed: ${msg}`);
              }
            })
          }
        >
          Report from server
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => {
            setPanelMessage(
              "Scheduled async throw (check console / global handler).",
            );
            setTimeout(() => {
              throw new Error("Admin test: browser async error");
            }, 0);
          }}
        >
          Throw in browser (async)
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => {
            setPanelMessage("Throwing on next render (error boundary).");
            setShouldThrowOnRender(true);
          }}
        >
          Throw during render
        </button>
      </div>
      {dashboardUrl ? (
        <p>
          <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
            Open error dashboard
          </a>
        </p>
      ) : null}
      {panelMessage ? (
        <p role="status" aria-live="polite">
          {panelMessage}
        </p>
      ) : null}
    </div>
  );
}
