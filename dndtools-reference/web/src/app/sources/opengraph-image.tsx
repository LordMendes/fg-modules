import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const alt = `${SITE_NAME} — Sources & Rulebooks`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImageResponse(
    <OgHubLayout badge="Sources" title="Sources & Rulebooks" />,
  );
}
