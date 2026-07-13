"use client";

import type { TableSort } from "@/lib/table-sort";

export function SortableTh({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: string;
  label: string;
  sort: TableSort | null;
  onSort: (column: string) => void;
  className?: string;
}) {
  const active = sort?.column === column;
  const direction = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  const indicator = active ? (sort.direction === "asc" ? "▲" : "▼") : "↕";
  const ariaLabel = active
    ? `Sort by ${label}, ${sort.direction === "asc" ? "ascending" : "descending"}`
    : `Sort by ${label}`;

  return (
    <th className={className} aria-sort={direction}>
      <button
        type="button"
        className={`sortable-th${active ? " is-sorted" : ""}`}
        onClick={() => onSort(column)}
        aria-label={ariaLabel}
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
}
