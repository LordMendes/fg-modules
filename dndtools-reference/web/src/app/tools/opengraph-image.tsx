import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const alt = `${SITE_NAME} — Tools`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImageResponse(
    <OgHubLayout
      badge="Tools"
      title="D&D 3.5 Utilities"
      footer="Calculators & builders · dnd-helper.com"
    />,
  );
}
