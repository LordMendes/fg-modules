"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { ClassSpellRef } from "@/lib/entities";
import { SPELL_COMPONENT_KEYS } from "@/lib/spell-utils";

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

export function ClassSpellTable({
  spells,
  onSpellClick,
}: {
  spells: ClassSpellRef[];
  onSpellClick: (slug: string) => void;
}) {
  return (
    <div className="table-wrap class-spell-table-wrap">
      <table className="entity-table class-spell-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>School</th>
            <th>Description</th>
            {SPELL_COMPONENT_KEYS.map((key) => (
              <th key={key} className="component-col" title={key}>
                {key}
              </th>
            ))}
            <th>Source</th>
            <th>Edition</th>
            <th className="action-col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {spells.map((spell) => (
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
