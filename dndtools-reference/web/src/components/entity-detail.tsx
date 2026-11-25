import Link from "next/link";
import { AddToEncounterButton } from "@/components/encounter/add-to-encounter-button";
import { SaveToListButton } from "@/components/save-to-list-button";
import type { CategoryKey } from "@/lib/categories";
import type { EntityDetail } from "@/lib/entities";
import { buildEntityFaqs, buildEntityLead, type EntityFaq } from "@/lib/entity-lead";
import { splitPortfolio } from "@/lib/pc-planner/deityDomains";
import { formatProseHtml, sanitizeHtml } from "@/lib/sanitize";
import { ClassSpellList } from "@/components/class-spell-list";
import { ClassSkillsTable } from "@/components/class-skills-table";
import { SortableHtmlTables } from "@/components/sortable-html-tables";

function EntityQuickAnswers({ faqs }: { faqs: EntityFaq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section
      className="entity-quick-answers entity-quick-answers-footer"
      aria-labelledby="entity-quick-answers-heading"
    >
      <h2 id="entity-quick-answers-heading">Quick answers</h2>
      {faqs.map((faq) => (
        <article key={faq.question}>
          <h3>{faq.question}</h3>
          <p>{faq.answer}</p>
        </article>
      ))}
    </section>
  );
}

function spellLevelLabel(level: number): string {
  const mod100 = level % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${level}th`;
  switch (level % 10) {
    case 1:
      return `${level}st`;
    case 2:
      return `${level}nd`;
    case 3:
      return `${level}rd`;
    default:
      return `${level}th`;
  }
}

function DomainOverview({ entity }: { entity: EntityDetail }) {
  const spells = entity.domainSpells ?? [];
  const byLevel = new Map<number, { label: string; href: string }[]>();
  for (const spell of spells) {
    const list = byLevel.get(spell.level) ?? [];
    list.push(spell);
    byLevel.set(spell.level, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const paired = levels.some((level) => (byLevel.get(level)?.length ?? 0) > 1);

  return (
    <div className="domain-overview">
      {entity.descriptionHtml ? (
        <section className="entity-section domain-granted">
          <h2>Granted power</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.descriptionHtml) }}
          />
        </section>
      ) : null}
      {levels.length > 0 ? (
        <section className="entity-section domain-spells" aria-labelledby="domain-spells-heading">
          <h2 id="domain-spells-heading">Domain spells</h2>
          {paired ? (
            <p className="domain-spells-note">
              Each level offers two spells. Prepare one of them in the domain slot.
            </p>
          ) : null}
          <div className="table-wrap">
            <table className="domain-spell-table">
              <thead>
                <tr>
                  <th scope="col">Level</th>
                  <th scope="col">Spell</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level}>
                    <th scope="row">{spellLevelLabel(level)}</th>
                    <td>
                      <span className="domain-spell-links">
                        {(byLevel.get(level) ?? []).map((spell) => (
                          <Link key={spell.href} href={spell.href}>
                            {spell.label}
                          </Link>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DeityOverview({ entity }: { entity: EntityDetail }) {
  const portfolio = splitPortfolio(entity.fields.Portfolio);
  const domains = entity.deityDomains ?? [];
  if (portfolio.length === 0 && domains.length === 0) return null;

  return (
    <div className="deity-overview">
      {portfolio.length > 0 ? (
        <section className="entity-section" aria-labelledby="deity-portfolio-heading">
          <h2 id="deity-portfolio-heading">Portfolio</h2>
          <ul className="deity-chip-list">
            {portfolio.map((item) => (
              <li key={item}>
                <span className="deity-chip">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {domains.length > 0 ? (
        <section className="entity-section" aria-labelledby="deity-domains-heading">
          <h2 id="deity-domains-heading">Domains</h2>
          <ul className="deity-chip-list">
            {domains.map((domain) => (
              <li key={domain.label}>
                {domain.href ? (
                  <Link className="deity-chip" href={domain.href}>{domain.label}</Link>
                ) : (
                  <span className="deity-chip">{domain.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function formatAdvancementHtml(html: string): string {
  const withClass = html.replace(/<table(\s[^>]*)?>/gi, (_match, _attrs, offset: number) => {
    const head = html.slice(offset, offset + 500).toLowerCase();
    const className = head.includes("spells known")
      ? "entity-table advancement-table spells-known-table"
      : "entity-table advancement-table";
    return `<table class="${className}">`;
  });
  return sanitizeHtml(withClass);
}

export function EntityDetailView({
  category,
  entity,
}: {
  category: CategoryKey;
  entity: EntityDetail;
}) {
  const fields = Object.entries(entity.fields).filter(([, v]) => v);
  const statFields = fields.filter(([label]) => category !== "deities" || label !== "Portfolio");
  const lead = buildEntityLead(category, entity);
  const faqs = buildEntityFaqs(category, entity);

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
          {entity.updatedAt ? (
            <span className="updated-at">
              Updated{" "}
              <time dateTime={entity.updatedAt}>
                {new Date(entity.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </span>
          ) : null}
          <span className="edition-chip">{entity.source.edition}</span>
          {entity.secondarySources && entity.secondarySources.length > 0 && (
            <span className="secondary-sources">
              Also cited in:{" "}
              {entity.secondarySources.map((source, index) => (
                <span key={source.abbrev}>
                  {index > 0 ? ", " : ""}
                  <Link href={`/sources/${source.abbrev}`}>{source.abbrev}</Link>
                </span>
              ))}
            </span>
          )}
          <SaveToListButton category={category} slug={entity.slug} name={entity.name} />
          {category === "monsters" && (
            <AddToEncounterButton
              monster={{
                slug: entity.slug,
                name: entity.name,
                cr: entity.fields["Challenge Rating"] ?? "—",
              }}
            />
          )}
        </div>
      </header>

      {lead ? <p className="entity-lead">{lead}</p> : null}

      {category === "domains" ? <DomainOverview entity={entity} /> : null}
      {category === "deities" ? <DeityOverview entity={entity} /> : null}

      {entity.sections && entity.sections.length > 0 && (
        <>
          {entity.sections.map((section) => (
            <section key={section.title} className="entity-section">
              <h2>{section.title}</h2>
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: formatProseHtml(section.html) }}
              />
            </section>
          ))}
        </>
      )}

      {statFields.length > 0 && category !== "domains" && (
        <dl className={`stat-block${category === "monsters" ? " monster-stats" : ""}`}>
          {statFields.map(([label, value]) => (
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
          dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.flavorHtml) }}
        />
      )}

      {entity.descriptionHtml && category === "monsters" && (
        <section className="monster-section">
          <h2>Description</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.descriptionHtml) }}
          />
        </section>
      )}

      {entity.combatHtml && (
        <section className="monster-section">
          <h2>Combat</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.combatHtml) }}
          />
        </section>
      )}

      {entity.classSkills && entity.classSkills.length > 0 && (
        <ClassSkillsTable skills={entity.classSkills} />
      )}

      {entity.spellLevels && entity.spellLevels.length > 0 && (
        <>
          <p className="class-spell-list-cta">
            <Link href={`/classes/${entity.slug}/spells`}>
              View full spell list (all levels)
            </Link>
          </p>
          <ClassSpellList classSlug={entity.slug} levels={entity.spellLevels} />
        </>
      )}

      {entity.related.length > 0 && category !== "domains" && (
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
            <SortableHtmlTables>
              <div
                className="advancement-table-host"
                dangerouslySetInnerHTML={{ __html: formatAdvancementHtml(entity.advancementHtml) }}
              />
            </SortableHtmlTables>
          </div>
        </section>
      )}

      {entity.descriptionHtml && category === "feats" && (
        <section className="entity-section">
          <h2>Description</h2>
          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.descriptionHtml) }}
          />
        </section>
      )}

      {entity.descriptionHtml &&
        category !== "monsters" &&
        category !== "feats" &&
        category !== "domains" && (
        <section
          className="prose-content"
          dangerouslySetInnerHTML={{ __html: formatProseHtml(entity.descriptionHtml) }}
        />
      )}

      <EntityQuickAnswers faqs={faqs} />
    </article>
  );
}
