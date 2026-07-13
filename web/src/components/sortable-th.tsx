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
  const indicator = active ? (sort.direction === "asc" ? "▲" : "▼") : "↕";

  return (
    <th className={className}>
      <button
        type="button"
        className={`sortable-th${active ? " is-sorted" : ""}`}
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
        }
      >
        <span>{label}</span>
        <span className="sort-indicator" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
}
