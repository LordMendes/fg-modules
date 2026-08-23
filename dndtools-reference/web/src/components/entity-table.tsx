"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AddToEncounterButton } from "@/components/encounter/add-to-encounter-button";
import { SaveToListButton } from "@/components/save-to-list-button";
import { SortableTh } from "@/components/sortable-th";
import { DEFAULT_ENTITY_SORT } from "@/lib/entity-sort";
import type { EntityListItem } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import { buildListSearchParams, parseListSearchParams } from "@/lib/entity-filters";
import {
  equipmentTableColumns,
  type EquipmentTableColumn,
  type EquipmentView,
} from "@/lib/equipment-display";
import { toggleSort, type TableSort } from "@/lib/table-sort";

type Column = { key: string; label: string; sortable?: boolean; title?: string };

const CATEGORY_COLUMNS: Record<Exclude<CategoryKey, "equipment">, Column[]> = {
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

function resolveColumns(category: CategoryKey, equipmentView: EquipmentView): Column[] {
  if (category === "equipment") {
    return equipmentTableColumns(equipmentView).map((col: EquipmentTableColumn) => ({
      key: col.key,
      label: col.label,
      sortable: col.sortable !== false,
      title: col.title,
    }));
  }
  return (CATEGORY_COLUMNS[category as Exclude<CategoryKey, "equipment">] ?? []).map((col) => ({
    ...col,
    sortable: true,
  }));
}

function cellTitle(col: Column, item: EntityListItem): string | undefined {
  if (col.key === "damage") {
    const title = item.extra.damageTitle;
    return title ?? undefined;
  }
  if (col.key === "speed") {
    const title = item.extra.speedTitle;
    return title ?? undefined;
  }
  return col.title;
}

function renderDataCell(col: Column, item: EntityListItem) {
  const value = item.extra[col.key];
  const title = cellTitle(col, item);

  if (col.key === "description" || col.key === "summary") {
    return (
      <td key={col.key} className="equipment-description-cell">
        <span className="equipment-description-ellipsis" title={value ?? undefined}>
          {value ?? "—"}
        </span>
      </td>
    );
  }

  return (
    <td key={col.key} title={title}>
      {value ?? "—"}
    </td>
  );
}

export function EntityTable({
  category,
  items,
  sort,
  equipmentView = "all",
}: {
  category: CategoryKey;
  items: EntityListItem[];
  sort: TableSort | null;
  equipmentView?: EquipmentView;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const columns = resolveColumns(category, equipmentView);
  const activeSort = sort ?? DEFAULT_ENTITY_SORT;

  function handleSort(column: string) {
    const filters = parseListSearchParams(
      category,
      Object.fromEntries(searchParams.entries()),
    );
    const nextSort = toggleSort(filters.sort ?? DEFAULT_ENTITY_SORT, column);
    const params = buildListSearchParams({ ...filters, sort: nextSort });
    const qs = params.toString();
    router.push(qs ? `/${category}?${qs}` : `/${category}`);
  }

  return (
    <div className="table-wrap">
      <table className="entity-table">
        <thead>
          <tr>
            <SortableTh column="name" label="Name" sort={activeSort} onSort={handleSort} />
            {columns.map((col) =>
              col.sortable === false ? (
                <th key={col.key} scope="col" title={col.title}>
                  {col.label}
                </th>
              ) : (
                <SortableTh
                  key={col.key}
                  column={col.key}
                  label={col.label}
                  sort={activeSort}
                  onSort={handleSort}
                />
              ),
            )}
            <SortableTh column="source" label="Source" sort={activeSort} onSort={handleSort} />
            <SortableTh column="edition" label="Edition" sort={activeSort} onSort={handleSort} />
            <th scope="col">Save</th>
            {category === "monsters" && <th scope="col">Encounter</th>}
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
              {columns.map((col) => renderDataCell(col, item))}
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
              <td className="save-cell">
                <SaveToListButton
                  compact
                  category={category}
                  slug={item.slug}
                  name={item.name}
                />
              </td>
              {category === "monsters" && (
                <td className="encounter-cell">
                  <AddToEncounterButton
                    compact
                    monster={{
                      slug: item.slug,
                      name: item.name,
                      cr: item.extra.cr ?? "—",
                    }}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
