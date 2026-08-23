import Link from "next/link";
import type { GoodsTableRecord } from "@/lib/stores/goods";

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function GoodsReferenceTable({
  table,
  slugByName,
}: {
  table: GoodsTableRecord;
  slugByName: Record<string, string>;
}) {
  const nameColumn = table.headers.findIndex((header) =>
    /^(item|object|name|goods|service|vehicle)$/i.test(header.trim()),
  );

  return (
    <div className="goods-table-block">
      <h4>{table.title}</h4>
      <div className="table-wrap">
        <table className="entity-table">
          <thead>
            <tr>
              {table.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => {
                  const isNameCell = cellIndex === (nameColumn >= 0 ? nameColumn : 0);
                  const slug = isNameCell ? slugByName[normalizeName(cell)] : undefined;
                  return (
                    <td key={`${rowIndex}-${cellIndex}`}>
                      {slug ? <Link href={`/equipment/${slug}`}>{cell}</Link> : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.footnotes.length > 0 && (
        <ul className="goods-table-footnotes">
          {table.footnotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <p className="goods-table-source">
        Source: {table.source.name} ({table.source.abbrev})
      </p>
    </div>
  );
}
