"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { SortableTh } from "@/components/sortable-th";
import type { ClassSpellRef } from "@/lib/entities";
import { SPELL_COMPONENT_KEYS } from "@/lib/spell-utils";
import { sortItems, toggleSort, type TableSort } from "@/lib/table-sort";

function EllipsisCell({
  text,
  className,
  empty = "—",
}: {
  text: string | null | undefined;
  className?: string;
  empty?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const display = text?.trim() || empty;
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [display]);

  return (
    <span
      ref={ref}
      className={className}
      title={truncated && text?.trim() ? text.trim() : undefined}
    >
      {display}
    </span>
  );
}

function ComponentMark({ present }: { present: boolean }) {
  return (
    <span className={`spell-component-mark${present ? " is-yes" : " is-no"}`} aria-hidden="true">
      {present ? "✓" : "×"}
    </span>
  );
}

function getSpellSortValue(spell: ClassSpellRef, column: string): unknown {
  switch (column) {
    case "name":
      return spell.name;
    case "school":
      return spell.school;
    case "description":
      return spell.description;
    case "source":
      return spell.sourceAbbrev;
    case "edition":
      return spell.edition;
    default:
      if (SPELL_COMPONENT_KEYS.includes(column as (typeof SPELL_COMPONENT_KEYS)[number])) {
        return spell.components[column as keyof ClassSpellRef["components"]];
      }
      return null;
  }
}

export function ClassSpellTable({
  spells,
  onSpellClick,
}: {
  spells: ClassSpellRef[];
  onSpellClick: (slug: string) => void;
}) {
  const [sort, setSort] = useState<TableSort>({ column: "name", direction: "asc" });
  const sortedSpells = useMemo(
    () => sortItems(spells, sort, getSpellSortValue),
    [spells, sort],
  );

  function handleSort(column: string) {
    setSort((current) => toggleSort(current, column));
  }

  return (
    <div className="table-wrap class-spell-table-wrap">
      <table className="entity-table class-spell-table">
        <thead>
          <tr>
            <SortableTh column="name" label="Name" sort={sort} onSort={handleSort} />
            <SortableTh column="school" label="School" sort={sort} onSort={handleSort} />
            <SortableTh column="description" label="Description" sort={sort} onSort={handleSort} />
            {SPELL_COMPONENT_KEYS.map((key) => (
              <SortableTh
                key={key}
                column={key}
                label={key}
                sort={sort}
                onSort={handleSort}
                className="component-col"
              />
            ))}
            <SortableTh column="source" label="Source" sort={sort} onSort={handleSort} />
            <SortableTh column="edition" label="Edition" sort={sort} onSort={handleSort} />
            <th className="action-col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSpells.map((spell) => (
            <tr key={spell.slug}>
              <td>
                <button
                  type="button"
                  className="class-spell-name-btn"
                  onClick={() => onSpellClick(spell.slug)}
                >
                  {spell.name}
                </button>
              </td>
              <td className="school-cell">
                <EllipsisCell text={spell.school} className="class-spell-ellipsis" />
              </td>
              <td className="description-cell">
                <EllipsisCell text={spell.description} className="class-spell-ellipsis" />
              </td>
              {SPELL_COMPONENT_KEYS.map((key) => (
                <td key={key} className="component-col">
                  <ComponentMark present={spell.components[key]} />
                </td>
              ))}
              <td>
                {spell.sourceAbbrev ? (
                  <Link href={`/sources/${spell.sourceAbbrev}`} className="source-badge">
                    {spell.sourceAbbrev}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="edition-cell">{spell.edition ?? "—"}</td>
              <td className="action-col">
                <Link
                  href={`/spells/${spell.slug}`}
                  className="class-spell-bookmark"
                  aria-label={`Open ${spell.name} full entry`}
                >
                  <Bookmark size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
