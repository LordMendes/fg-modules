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
        {entity.statLine && (
          <p className="detail-stat-line">{entity.statLine}</p>
        )}
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

      {entity.sections && entity.sections.length > 0 && (
        <>
          {entity.sections.map((section) => (
            <section key={section.title} className="entity-section">
              <h2>{section.title}</h2>
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.html) }}
              />
            </section>
          ))}
        </>
      )}

      {fields.length > 0 && (
        <dl className={`stat-block${category === "monsters" ? " monster-stats" : ""}`}>
          {fields.map(([label, value]) => (
            <div key={label} className="stat-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {entity.specialAbilities && entity.specialAbilities.length > 0 && (
        <section className="monster-abilities">
          <h2>Special Abilities</h2>
          <div className="badge-list">
            {entity.specialAbilities.map((ability) =>
              ability.href ? (
                <Link key={ability.href} href={ability.href} className="ability-badge linked">
                  {ability.label}
                </Link>
              ) : (
                <span key={ability.label} className="ability-badge">
                  {ability.label}
                </span>
              ),
            )}
          </div>
        </section>
      )}

      {entity.featLinks && entity.featLinks.length > 0 && (
        <section className="monster-feats">
          <h2>Feats</h2>
          <ul className="feat-link-list">
            {entity.featLinks.map((feat) => (
              <li key={feat.href}>
                <Link href={feat.href}>{feat.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entity.flavorHtml && (
        <section
          className="prose-content flavor-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.flavorHtml) }}
        />
      )}

      {entity.descriptionHtml && category === "monsters" && (
        <section className="monster-section">
          <h2>Description</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.descriptionHtml) }}
          />
        </section>
      )}

      {entity.combatHtml && (
        <section className="monster-section">
          <h2>Combat</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.combatHtml) }}
          />
        </section>
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

      {entity.descriptionHtml && category === "feats" && (
        <section className="entity-section">
          <h2>Description</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.descriptionHtml) }}
          />
        </section>
      )}

      {entity.descriptionHtml && category !== "monsters" && category !== "feats" && (
        <section
          className="prose-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(entity.descriptionHtml) }}
        />
      )}
    </article>
  );
}
