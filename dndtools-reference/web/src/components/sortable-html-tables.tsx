"use client";

import { useEffect, useRef } from "react";
import { compareSortValues } from "@/lib/table-sort";

function cellText(cell: HTMLTableCellElement): string {
  const img = cell.querySelector("img[alt]");
  if (img) return img.getAttribute("alt") ?? img.getAttribute("title") ?? "";
  return cell.textContent?.trim() ?? "";
}

function enhanceTable(table: HTMLTableElement) {
  if (table.dataset.sortable === "true") return;
  table.dataset.sortable = "true";

  const headerRow = table.querySelector("thead tr") ?? table.querySelector("tr");
  if (!headerRow) return;

  const headers = Array.from(headerRow.querySelectorAll("th"));
  if (!headers.length) return;

  const body = table.tBodies[0] ?? table;
  const rows = () =>
    Array.from(body.querySelectorAll("tr")).filter((row) => row.querySelector("td"));

  headers.forEach((th, columnIndex) => {
    const label = th.textContent?.trim();
    if (!label) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "sortable-th";
    button.innerHTML = `<span>${label}</span><span class="sort-indicator" aria-hidden="true">↕</span>`;
    button.setAttribute("aria-label", `Sort by ${label}`);
    th.setAttribute("aria-sort", "none");
    th.textContent = "";
    th.appendChild(button);

    let direction: "asc" | "desc" = "asc";

    button.addEventListener("click", () => {
      const sameColumn = button.classList.contains("is-sorted");
      direction = sameColumn && direction === "asc" ? "desc" : "asc";

      for (const other of headers) {
        const otherBtn = other.querySelector("button.sortable-th");
        if (!otherBtn || otherBtn === button) continue;
        otherBtn.classList.remove("is-sorted");
        other.setAttribute("aria-sort", "none");
        otherBtn.setAttribute("aria-label", `Sort by ${otherBtn.querySelector("span")?.textContent ?? "column"}`);
        const indicator = otherBtn.querySelector(".sort-indicator");
        if (indicator) indicator.textContent = "↕";
      }

      button.classList.add("is-sorted");
      th.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
      button.setAttribute(
        "aria-label",
        `Sort by ${label}, ${direction === "asc" ? "ascending" : "descending"}`,
      );
      const indicator = button.querySelector(".sort-indicator");
      if (indicator) indicator.textContent = direction === "asc" ? "▲" : "▼";

      const sorted = [...rows()].sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex];
        const cellB = rowB.cells[columnIndex];
        const cmp = compareSortValues(
          cellA ? cellText(cellA) : null,
          cellB ? cellText(cellB) : null,
        );
        return direction === "asc" ? cmp : -cmp;
      });

      for (const row of sorted) body.appendChild(row);
    });
  });
}

export function SortableHtmlTables({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    for (const table of root.querySelectorAll("table")) {
      enhanceTable(table);
    }
  });

  return <div ref={ref}>{children}</div>;
}
