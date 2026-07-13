import Link from "next/link";
import { listSources } from "@/lib/entities";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const sources = await listSources();

  const byEdition = sources.reduce<Record<string, typeof sources>>((acc, s) => {
    const edition = s.edition;
    if (!acc[edition]) acc[edition] = [];
    acc[edition].push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1>Sources &amp; Rulebooks</h1>
        <p>Browse content by publication source and edition.</p>
      </div>

      {Object.entries(byEdition).map(([edition, editionSources]) => (
        <section key={edition} className="edition-group">
          <h2>{edition}</h2>
          <div className="sources-grid">
            {editionSources.map((source) => (
              <Link
                key={source.id}
                href={source.abbrev ? `/sources/${source.abbrev}` : "#"}
                className="source-card"
              >
                <h3>
                  {source.name}
                  {source.abbrev && (
                    <span className="abbrev"> ({source.abbrev})</span>
                  )}
                </h3>
                <p className="meta">{source.counts.toLocaleString()} entries</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
