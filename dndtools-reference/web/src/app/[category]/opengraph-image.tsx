import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateImageMetadata({ params }: Props) {
  const { category } = await params;
  const label = category && isCategoryKey(category)
    ? getCategoryLabel(category)
    : category ?? SITE_NAME;
  return [{
    id: category ?? "default",
    alt: `${label} — ${SITE_NAME}`,
    size: OG_SIZE,
    contentType: OG_CONTENT_TYPE,
  }];
}

export default async function Image({ params }: Props) {
  const { category } = await params;
  const label = category && isCategoryKey(category)
    ? getCategoryLabel(category)
    : category ?? SITE_NAME;
  let footer = "D&D 3.5 Edition Reference";

  if (category && isCategoryKey(category)) {
    const counts = await getCategoryCounts();
    const count = counts[category as CategoryKey];
    footer = `${count.toLocaleString("en-US")} entries · dnd-helper.com`;
  }

  return ogImageResponse(
    <OgHubLayout badge={label} title={label} footer={footer} />,
  );
}

export const alt = `${SITE_NAME} category`;
