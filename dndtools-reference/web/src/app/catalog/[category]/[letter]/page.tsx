import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { listEntityNamesByLetter } from "@/lib/entities";
import { CatalogLetterNav } from "@/components/catalog-letter-nav";
import { JsonLd, absoluteBreadcrumbJsonLd, collectionPageJsonLd } from "@/components/json-ld";
import {
  catalogLetterLabel,
  normalizeCatalogLetter,
} from "@/lib/catalog";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import type { CategoryKey } from "@/lib/categories";

export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; letter: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { category, letter: rawLetter } = await params;
  if (!isCategoryKey(category)) return {};
  const letter = normalizeCatalogLetter(rawLetter);
  if (!letter) return {};
  const label = getCategoryLabel(category);
  const letterLabel = catalogLetterLabel(letter);
  return buildPageMetadata({
    title: `${label} starting with ${letterLabel}`,
    description: `D&D 3.5 ${label.toLowerCase()} whose names start with ${letterLabel}.`,
    path: `/catalog/${category}/${letter === "#" ? "%23" : letter}`,
  });
}

export default async function CatalogLetterPage({ params }: Props) {
  const { category, letter: rawLetter } = await params;
  if (!isCategoryKey(category)) notFound();

  const letter = normalizeCatalogLetter(rawLetter);
  if (!letter) notFound();

  const categoryKey = category as CategoryKey;
  const label = getCategoryLabel(categoryKey);
  const letterLabel = catalogLetterLabel(letter);
  const entries = await listEntityNamesByLetter(categoryKey, letter);

  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: "Catalog", path: "/catalog" },
              { name: label, path: `/catalog/${category}` },
              {
                name: letterLabel,
                path: `/catalog/${category}/${letter === "#" ? "%23" : letter}`,
              },
            ],
            absoluteUrl,
          ),
          collectionPageJsonLd({
            name: `${label} (${letterLabel})`,
            description: `D&D 3.5 ${label.toLowerCase()} starting with ${letterLabel}.`,
            url: absoluteUrl(
              `/catalog/${category}/${letter === "#" ? "%23" : letter}`,
            ),
            numberOfItems: entries.length,
          }),
        ]}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> /{" "}
        <Link href="/catalog">Catalog</Link> /{" "}
        <Link href={`/catalog/${category}`}>{label}</Link> / {letterLabel}
      </nav>
      <div className="page-header">
        <h1>
          {label} ({letterLabel})
        </h1>
        <p>
          {entries.length.toLocaleString("en-US")} {label.toLowerCase()} starting
          with {letterLabel}.{" "}
          <Link href={`/${category}`}>Open interactive hub</Link>
        </p>
      </div>
      <CatalogLetterNav category={categoryKey} activeLetter={letter} />
      {entries.length > 0 ? (
        <ul className="catalog-entity-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/${category}/${entry.slug}`} className="entity-link">
                {entry.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="catalog-empty">No entries for this letter.</p>
      )}
    </>
  );
}
