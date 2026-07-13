export type SortDirection = "asc" | "desc";

export type TableSort = {
  column: string;
  direction: SortDirection;
};

export function toggleSort(
  current: TableSort | null,
  column: string,
  defaultDirection: SortDirection = "asc",
): TableSort {
  if (current?.column === column) {
    return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { column, direction: defaultDirection };
}

function parseSortValue(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;

  const str = String(value).trim();
  if (!str || str === "—") return null;

  const numMatch = str.match(/^\+?(-?\d+(?:\.\d+)?(?:\/\d+)?)/);
  if (numMatch) {
    const fraction = numMatch[1].split("/");
    if (fraction.length === 2) {
      const num = Number.parseFloat(fraction[0]);
      const den = Number.parseFloat(fraction[1]);
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return num / den;
      }
    }
    const parsed = Number.parseFloat(numMatch[1]);
    if (Number.isFinite(parsed)) return parsed;
  }

  const lower = str.toLowerCase();
  if (lower === "yes" || lower === "true" || str === "✓") return true;
  if (lower === "no" || lower === "false" || str === "×") return false;

  return str.toLowerCase();
}

export function compareSortValues(a: unknown, b: unknown): number {
  const pa = parseSortValue(a);
  const pb = parseSortValue(b);

  if (pa === null && pb === null) return 0;
  if (pa === null) return 1;
  if (pb === null) return -1;

  if (typeof pa === "number" && typeof pb === "number") return pa - pb;
  if (typeof pa === "boolean" && typeof pb === "boolean") return Number(pa) - Number(pb);

  return String(pa).localeCompare(String(pb), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortItems<T>(
  items: T[],
  sort: TableSort,
  getValue: (item: T, column: string) => unknown,
): T[] {
  const dir = sort.direction === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const cmp = compareSortValues(getValue(a, sort.column), getValue(b, sort.column));
    return cmp * dir;
  });
}
