"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SortableTh } from "@/components/sortable-th";
import type { ClassSkillRef } from "@/lib/entities";
import { sortItems, toggleSort, type TableSort } from "@/lib/table-sort";

function getSkillSortValue(skill: ClassSkillRef, column: string): unknown {
  switch (column) {
    case "name":
      return skill.name;
    case "ability":
      return skill.ability;
    default:
      return null;
  }
}

export function ClassSkillsTable({ skills }: { skills: ClassSkillRef[] }) {
  const [sort, setSort] = useState<TableSort>({ column: "name", direction: "asc" });
  const sortedSkills = useMemo(
    () => sortItems(skills, sort, getSkillSortValue),
    [skills, sort],
  );

  if (skills.length === 0) return null;

  function handleSort(column: string) {
    setSort((current) => toggleSort(current, column));
  }

  return (
    <section className="class-skills-section">
      <h2>Class Skills</h2>
      <div className="table-wrap">
        <table className="entity-table class-skills-table">
          <thead>
            <tr>
              <SortableTh column="name" label="Skill" sort={sort} onSort={handleSort} />
              <SortableTh column="ability" label="Key Ability" sort={sort} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sortedSkills.map((skill) => (
              <tr key={`${skill.slug ?? skill.name}`}>
                <td>
                  {skill.slug ? (
                    <Link href={`/skills/${skill.slug}`} className="entity-link">
                      {skill.name}
                    </Link>
                  ) : (
                    skill.name
                  )}
                </td>
                <td>{skill.ability ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
