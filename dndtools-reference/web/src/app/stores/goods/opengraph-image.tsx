import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const alt = "Goods & Services — DnD Helper";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogImageResponse(
    <OgHubLayout
      badge="Stores"
      title="Goods & Services"
      footer="dnd-helper.com"
    />,
  );
}
