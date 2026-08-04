import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getEntityDetail } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgEntityLayout, ogImageResponse } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateImageMetadata({ params }: Props) {
  const { category, slug } = await params;
  const label = isCategoryKey(category) ? getCategoryLabel(category) : category;
  let alt = `${slug.replace(/-/g, " ")} — ${label}`;

  if (isCategoryKey(category)) {
    const entity = await getEntityDetail(category as CategoryKey, slug);
    if (entity) {
      alt = `${entity.name} — D&D 3.5 ${label}`;
    }
  }

  return [{ alt, size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

export default async function Image({ params }: Props) {
  const { category, slug } = await params;
  const label = isCategoryKey(category) ? getCategoryLabel(category) : category;
  let name = slug.replace(/-/g, " ");
  let statLine: string | null = null;
  let sourceLine: string | null = null;
  let snippet: string | null = null;

  if (isCategoryKey(category)) {
    const entity = await getEntityDetail(category as CategoryKey, slug);
    if (entity) {
      name = entity.name;
      statLine = entity.statLine ?? null;
      snippet = entity.descriptionText?.replace(/\s+/g, " ").trim() ?? null;
      sourceLine = entity.source.abbrev
        ? `${entity.source.name} (${entity.source.abbrev})`
        : entity.source.name;
    }
  }

  return ogImageResponse(
    <OgEntityLayout
      badge={label}
      title={name}
      statLine={statLine}
      sourceLine={sourceLine}
      snippet={snippet}
    />,
  );
}

export const alt = `${SITE_NAME} entity`;
