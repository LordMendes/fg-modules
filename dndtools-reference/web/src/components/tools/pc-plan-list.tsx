"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PcPlanSummary } from "@/actions/pc-plans";

export type PcPlanListProps = {
  plans: PcPlanSummary[];
  pending?: boolean;
  error?: string | null;
  title?: string;
  createLabel?: string;
  emptyMessage?: string;
  onCreate: () => void;
  onDelete?: (planId: string) => void | boolean | Promise<void | boolean>;
};

function DeleteConfirmModal({
  plan,
  pending,
  onConfirm,
  onCancel,
}: {
  plan: PcPlanSummary;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, pending]);

  return (
    <div className="confirm-dialog-overlay" role="presentation">
      <button
        type="button"
        className="confirm-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onCancel}
        disabled={pending}
      />
      <div
        className="confirm-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pc-plan-delete-title"
      >
        <h3 id="pc-plan-delete-title">Delete character?</h3>
        <p>
          <strong>{plan.name}</strong> ({plan.classSummary}) will be permanently deleted.
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--danger"
            onClick={onConfirm}
            disabled={pending}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function PcPlanList({
  plans,
  pending = false,
  error = null,
  title = "Your characters",
  createLabel = "New character",
  emptyMessage = "No characters yet. Create one to get started.",
  onCreate,
  onDelete,
}: PcPlanListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<PcPlanSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openPlan(planId: string) {
    router.push(`/tools/pc-planner?id=${planId}`);
  }

  async function confirmDelete() {
    if (!deleteTarget || !onDelete || deleting) return;
    setDeleting(true);
    try {
      const ok = await Promise.resolve(onDelete(deleteTarget.id));
      if (ok !== false) setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="pc-planner-list profile-lists">
      <div className="profile-section-header">
        <h2>{title}</h2>
        <button type="button" className="tool-btn" onClick={onCreate} disabled={pending}>
          {createLabel}
        </button>
      </div>
      {error ? (
        <p className="profile-error" role="alert">
          {error}
        </p>
      ) : null}
      {plans.length === 0 ? (
        <p className="pc-planner-list-empty">{emptyMessage}</p>
      ) : (
        <ul className="profile-list-cards pc-plan-list">
          {plans.map((plan) => (
            <li key={plan.id} className="profile-list-card pc-plan-list-row">
              <button
                type="button"
                className="pc-plan-list-row-main"
                onClick={() => openPlan(plan.id)}
              >
                <span className="pc-plan-list-name">{plan.name}</span>
                <span className="pc-plan-list-class">{plan.classSummary}</span>
              </button>
              {onDelete ? (
                <div className="pc-plan-list-row-actions">
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost tool-btn--danger"
                    onClick={() => setDeleteTarget(plan)}
                    disabled={pending}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {deleteTarget ? (
        <DeleteConfirmModal
          plan={deleteTarget}
          pending={pending || deleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!pending && !deleting) setDeleteTarget(null);
          }}
        />
      ) : null}
    </section>
  );
}
