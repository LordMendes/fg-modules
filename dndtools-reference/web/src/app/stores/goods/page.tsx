import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { GoodsBrowse } from "@/components/stores/goods-browse";
import {
  GOODS_INTRO,
  GOODS_KINDS,
  buildSlugByName,
  groupGoodsSections,
  loadGoodsTables,
  orderedSectionSlugs,
  type GoodsListItem,
} from "@/lib/stores/goods";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Goods & Services",
  description:
    "Browse D&D 3.5 adventuring gear, tools, clothing, mounts, vehicles, buildings, and environment-specific equipment.",
  path: "/stores/goods",
});

export default async function GoodsPage() {
  const [rows, tables] = await Promise.all([
    prisma.equipment.findMany({
      where: { kind: { in: [...GOODS_KINDS] } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { source: { select: { name: true, abbrev: true } } },
    }),
    Promise.resolve(loadGoodsTables()),
  ]);

  const items: GoodsListItem[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    category: row.category,
    cost: row.cost,
    weight: row.weight,
    sourceAbbrev: row.source.abbrev,
    sourceName: row.source.name,
    hasDescription: Boolean(row.descriptionHtml || row.descriptionText),
  }));

  const grouped = groupGoodsSections(items, tables);
  const order = orderedSectionSlugs(grouped.map((section) => section.slug));
  const sections = order
    .map((slug) => grouped.find((section) => section.slug === slug))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const slugByName = buildSlugByName(items);

  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Goods & Services", path: "/stores/goods" },
          ],
          absoluteUrl,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / Goods &amp; Services
      </nav>
      <div className="page-header">
        <h1>Goods & Services</h1>
        <p>{GOODS_INTRO}</p>
        <p className="goods-page-count">{items.length.toLocaleString()} items across {sections.length} sections</p>
      </div>

      <Suspense fallback={<p className="goods-loading">Loading goods…</p>}>
        <GoodsBrowse sections={sections} slugByName={slugByName} />
      </Suspense>
    </>
  );
}
