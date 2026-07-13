import Link from "next/link";
import type { EntityDetail } from "@/lib/entities";
import { sanitizeHtml } from "@/lib/sanitize";
import { ClassSpellList } from "@/components/class-spell-list";
import { ClassSkillsTable } from "@/components/class-skills-table";

function formatAdvancementHtml(html: string): string {
  const withClass = html.replace(
    /<table(\s[^>]*)?>/gi,
    '<table class="entity-table advancement-table">',
  );
  return sanitizeHtml(withClass);
}

export function EntityDetailView({
  category,
  entity,
}: {
  category: string;
  entity: EntityDetail;
}) {
  const fields = Object.entries(entity.fields).filter(([, v]) => v);

  return (
    <article className="entity-detail">
      <header className="detail-header">
        <h1>{entity.name}</h1>
        <div className="detail-meta">
          <span className="source-line">
            {entity.source.name}
            {entity.source.abbrev && (
              <>
                {" "}
                (<Link href={`/sources/${entity.source.abbrev}`}>{entity.source.abbrev}</Link>)
              </>
            )}
            {entity.source.page && <>, p. {entity.source.page}</>}
          </span>
          <span className="edition-chip">{entity.source.edition}</span>
        </div>
      </header>

      {fields.length > 0 && (
        <dl className="stat-block">
          {fields.map(([label, value]) => (
            <div key={label} className="stat-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {entity.classSkills && entity.classSkills.length > 0 && (
        <ClassSkillsTable skills={entity.classSkills} />
      )}

      {entity.spellLevels && entity.spellLevels.length > 0 && (
        <ClassSpellList classSlug={entity.slug} levels={entity.spellLevels} />
      )}

      {entity.related.length > 0 && (
        <section className="related-section">
          <h2>Related</h2>
          <ul className="related-list">
            {entity.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>{r.label}</Link>
                {r.meta && <span className="related-meta">{r.meta}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {entity.advancementHtml && (
        <section className="advancement-section">
          <h2>Advancement</h2>
          <div className="table-wrap advancement-table-wrap">
            <div
              className="advancement-table-host"
              dangerouslySetInnerHTML={{ __html: formatAdvancementHtml(entity.advancementHtml) }}
            />
          </div>
        </section>
      )}

      {entity.descriptionHtml && (
        <section
          className="prose-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.descriptionHtml) }}
        />
      )}
    </article>
  );
}
