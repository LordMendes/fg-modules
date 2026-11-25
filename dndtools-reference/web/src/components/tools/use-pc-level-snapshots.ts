"use client";

import { useEffect, useRef } from "react";
import { commitPcPlanLevel } from "@/actions/pc-plans";
import { levelSnapshotCandidate } from "@/lib/pc-planner/levelHistory";
import type { PcPlanState } from "@/lib/pc-planner/types";

/**
 * When character level increases, store the sheet from the previous render.
 * The first state after a plan loads is the baseline and is not stored.
 */
export function usePcLevelSnapshots({
  planId,
  state,
  enabled,
  baselineToken = "",
  onCommitted,
}: {
  planId: string | null;
  state: PcPlanState | null;
  enabled: boolean;
  /** Changes when the sheet is reloaded from the server, so that reload is not a level-up. */
  baselineToken?: string;
  onCommitted?: () => void;
}) {
  const seenKey = useRef<string | null>(null);
  const previous = useRef<PcPlanState | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;

  useEffect(() => {
    if (!enabled || !planId || !state) {
      seenKey.current = null;
      previous.current = null;
      return;
    }
    const key = `${planId}:${baselineToken}`;
    if (seenKey.current !== key) {
      seenKey.current = key;
      previous.current = state;
      return;
    }
    const prev = previous.current;
    previous.current = state;
    if (!prev) return;
    const snapshot = levelSnapshotCandidate(prev, state);
    if (!snapshot) return;
    const frozen = structuredClone(snapshot);
    const targetPlanId = planId;
    chain.current = chain.current
      .catch(() => undefined)
      .then(async () => {
        const result = await commitPcPlanLevel(targetPlanId, frozen);
        if (result.success) onCommittedRef.current?.();
      });
  }, [enabled, planId, state, baselineToken]);
}
