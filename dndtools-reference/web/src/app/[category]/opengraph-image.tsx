import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getCategoryCounts } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";
import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const alt = `${SITE_NAME} category`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string }>;
};

export default async function Image({ params }: Props) {
  const { category } = await params;
  const label = isCategoryKey(category) ? getCategoryLabel(category) : category;
  let subtitle = "D&D 3.5 Edition Reference";

  if (isCategoryKey(category)) {
    const counts = await getCategoryCounts();
    const count = counts[category as CategoryKey];
    subtitle = `${count.toLocaleString("en-US")} entries`;
  }

  return ogImageResponse(
    <OgHubLayout badge={label} title={label} footer={subtitle} />,
  );
}
