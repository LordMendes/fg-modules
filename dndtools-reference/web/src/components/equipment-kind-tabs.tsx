"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  EQUIPMENT_VIEW_TABS,
  applyEquipmentViewToFilters,
  parseEquipmentView,
  type EquipmentView,
} from "@/lib/equipment-display";
import {
  buildListSearchParams,
  type ParsedListFilters,
} from "@/lib/entity-filters";

export function EquipmentKindTabs({ initialFilters }: { initialFilters: ParsedListFilters }) {
  const router = useRouter();
  const activeView = parseEquipmentView(initialFilters.fields);

  const setView = useCallback(
    (view: EquipmentView) => {
      const next = applyEquipmentViewToFilters(initialFilters, view);
      const params = buildListSearchParams(next);
      const qs = params.toString();
      router.push(qs ? `/equipment?${qs}` : "/equipment");
    },
    [router, initialFilters],
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
