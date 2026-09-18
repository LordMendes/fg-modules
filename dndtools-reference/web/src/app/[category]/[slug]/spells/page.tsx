import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getClassSpellsAtLevel, getEntityDetail } from "@/lib/entities";
import { JsonLd, absoluteBreadcrumbJsonLd, collectionPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  if (category !== "classes") return {};
  const entity = await getEntityDetail("classes", slug);
  if (!entity?.spellLevels?.length) return {};
  return buildPageMetadata({
    title: `${entity.name} spell list`,
    description: `Full D&D 3.5 spell list for ${entity.name} by spell level.`,
    path: `/classes/${slug}/spells`,
  });
}

export default async function ClassSpellListPage({ params }: Props) {
  const { category, slug } = await params;
  if (category !== "classes") notFound();

  const entity = await getEntityDetail("classes" as CategoryKey, slug);
  if (!entity?.spellLevels?.length) notFound();

  const spellsByLevel = await Promise.all(
    entity.spellLevels.map(async (level) => ({
      ...level,
      spells: await getClassSpellsAtLevel(slug, level.level, entity.name),
    })),
  );

  const totalSpells = spellsByLevel.reduce((sum, level) => sum + level.spells.length, 0);
  const label = getCategoryLabel("classes");

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: label, path: "/classes" },
              { name: entity.name, path: `/classes/${slug}` },
              { name: "Spell list", path: `/classes/${slug}/spells` },
            ],
            absoluteUrl,
          ),
          collectionPageJsonLd({
            name: `${entity.name} spell list`,
            description: `D&D 3.5 spells for ${entity.name} by level.`,
            url: absoluteUrl(`/classes/${slug}/spells`),
            numberOfItems: totalSpells,
          }),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href="/classes">{label}</Link> /{" "}
        <Link href={`/classes/${slug}`}>{entity.name}</Link> / Spell list
      </nav>
      <div className="page-header">
        <h1>{entity.name} spell list</h1>
        <p>
          {totalSpells.toLocaleString("en-US")} D&amp;D 3.5 spells for{" "}
          {entity.name}, grouped by spell level.{" "}
          <Link href={`/classes/${slug}`}>Back to class page</Link>
        </p>
      </div>
      {spellsByLevel.map((level) => (
        <section key={level.level} className="class-spell-crawl-section">
          <h2>{level.label}</h2>
          <ul className="catalog-entity-list">
            {level.spells.map((spell) => (
              <li key={spell.slug}>
                <Link href={`/spells/${spell.slug}`} className="entity-link">
                  {spell.name}
                </Link>
                {spell.school ? (
                  <span className="related-meta"> ({spell.school})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
