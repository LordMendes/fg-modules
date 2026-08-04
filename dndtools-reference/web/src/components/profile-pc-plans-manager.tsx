"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPcPlan,
  deletePcPlan,
  getUserPcPlans,
  type PcPlanSummary,
} from "@/actions/pc-plans";
import { PcPlanList } from "@/components/tools/pc-plan-list";

export function ProfilePcPlansManager({
  initialPlans,
}: {
  initialPlans: PcPlanSummary[];
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createPcPlan();
      if (!result.success || !result.plan) {
        setError(result.error ?? "Could not create plan");
        return;
      }
      const refreshed = await getUserPcPlans();
      setPlans(refreshed);
      router.push(`/tools/pc-planner?id=${result.plan.id}`);
    });
  }

  function handleDelete(planId: string) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await deletePcPlan(planId);
        if (!result.success) {
          setError(result.error ?? "Could not delete plan");
          resolve(false);
          return;
        }
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        router.refresh();
        resolve(true);
      });
    });
  }

  return (
    <div className="profile-pc-plans">
      <PcPlanList
        plans={plans}
        pending={pending}
        error={error}
        title="My PC Plans"
        createLabel="New PC plan"
        emptyMessage="No PC plans yet. Create one to get started."
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  );
}
