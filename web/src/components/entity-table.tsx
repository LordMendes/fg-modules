import Link from "next/link";
import type { EntityListItem } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";

type Column = { key: string; label: string };

const CATEGORY_COLUMNS: Record<CategoryKey, Column[]> = {
  spells: [
    { key: "school", label: "School" },
    { key: "level", label: "Level" },
    { key: "components", label: "Components" },
  ],
  feats: [{ key: "type", label: "Type" }],
  monsters: [
    { key: "type", label: "Type" },
    { key: "cr", label: "CR" },
    { key: "hd", label: "HD" },
  ],
  classes: [
    { key: "hitDie", label: "Hit Die" },
    { key: "skillPoints", label: "Skill Pts" },
  ],
  skills: [
    { key: "keyAbility", label: "Ability" },
    { key: "trainedOnly", label: "Trained" },
  ],
  races: [
    { key: "type", label: "Type" },
    { key: "la", label: "LA" },
  ],
  items: [
    { key: "type", label: "Type" },
    { key: "price", label: "Price" },
  ],
  equipment: [
    { key: "kind", label: "Kind" },
    { key: "cost", label: "Cost" },
  ],
  domains: [{ key: "type", label: "Type" }],
  deities: [
    { key: "alignment", label: "Alignment" },
    { key: "pantheon", label: "Pantheon" },
  ],
  psionics: [
    { key: "discipline", label: "Discipline" },
    { key: "powerPoints", label: "PP" },
  ],
  templates: [
    { key: "type", label: "Type" },
    { key: "cr", label: "CR Δ" },
  ],
  rules: [
    { key: "category", label: "Category" },
    { key: "subcategory", label: "Subcategory" },
  ],
};

export function EntityTable({
  category,
  items,
}: {
  category: CategoryKey;
  items: EntityListItem[];
}) {
  const columns = CATEGORY_COLUMNS[category] ?? [];

  return (
    <div className="table-wrap">
      <table className="entity-table">
        <thead>
          <tr>
            <th>Name</th>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Source</th>
            <th>Edition</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.slug}>
              <td>
                <Link href={`/${category}/${item.slug}`} className="entity-link">
                  {item.name}
                </Link>
              </td>
              {columns.map((col) => (
                <td key={col.key}>{item.extra[col.key] ?? "—"}</td>
              ))}
              <td>
                {item.sourceAbbrev ? (
                  <Link href={`/sources/${item.sourceAbbrev}`} className="source-badge">
                    {item.sourceAbbrev}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="edition-cell">{item.edition ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
