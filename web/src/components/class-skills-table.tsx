import Link from "next/link";
import type { ClassSkillRef } from "@/lib/entities";

export function ClassSkillsTable({ skills }: { skills: ClassSkillRef[] }) {
  if (skills.length === 0) return null;

  return (
    <section className="class-skills-section">
      <h2>Class Skills</h2>
      <div className="table-wrap">
        <table className="entity-table class-skills-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Key Ability</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => (
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
