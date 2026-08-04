import { getCategoryCounts } from "@/lib/entities";
import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgCenteredLayout, ogImageResponse } from "@/lib/og-image";

export const alt = `${SITE_NAME} — D&D 3.5 Reference`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const counts = await getCategoryCounts();
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return ogImageResponse(
    <OgCenteredLayout
      title={SITE_NAME}
      subtitle={`${total.toLocaleString("en-US")} D&D 3.5 entries`}
    />,
  );
}
