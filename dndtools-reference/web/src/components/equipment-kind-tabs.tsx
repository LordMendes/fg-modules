"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EQUIPMENT_VIEW_TABS,
  applyEquipmentViewToFilters,
  parseEquipmentView,
  type EquipmentView,
} from "@/lib/equipment-display";
import {
  buildListSearchParams,
  parseListSearchParams,
  type ParsedListFilters,
} from "@/lib/entity-filters";

export function EquipmentKindTabs({ initialFilters }: { initialFilters: ParsedListFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = parseEquipmentView(initialFilters.fields);

  const setView = useCallback(
    (view: EquipmentView) => {
      const current = parseListSearchParams(
        "equipment",
        Object.fromEntries(searchParams.entries()),
      );
      const next = applyEquipmentViewToFilters(current, view);
      const params = buildListSearchParams(next);
      const qs = params.toString();
      router.push(qs ? `/equipment?${qs}` : "/equipment");
    },
    [router, searchParams],
  );

  return (
    <div className="filter-chip-group equipment-kind-tabs">
      <span className="multi-select-label">Browse</span>
      <div className="filter-chips" role="toolbar" aria-label="Equipment kind">
        {EQUIPMENT_VIEW_TABS.map((tab) => {
          const isActive = activeView === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              className={`filter-chip${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              onClick={() => setView(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
