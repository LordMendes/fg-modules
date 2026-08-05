import { getSourceByAbbrev } from "@/lib/entities";
import { SITE_NAME } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, OgHubLayout, ogImageResponse } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 86400;

type Props = {
  params: Promise<{ abbrev: string }>;
};

export async function generateImageMetadata({ params }: Props) {
  const { abbrev } = await params;
  const safeAbbrev = abbrev ?? "Source";
  const source = abbrev ? await getSourceByAbbrev(abbrev) : null;
  const alt = source
    ? `${source.name} (${safeAbbrev}) — ${SITE_NAME}`
    : `${safeAbbrev} — ${SITE_NAME}`;
  return [{
    id: safeAbbrev,
    alt,
    size: OG_SIZE,
    contentType: OG_CONTENT_TYPE,
  }];
}

export default async function Image({ params }: Props) {
  const { abbrev } = await params;
  const safeAbbrev = abbrev ?? "Source";
  const source = abbrev ? await getSourceByAbbrev(abbrev) : null;

  if (!source) {
    return ogImageResponse(
      <OgHubLayout badge="Source" title={safeAbbrev} footer={SITE_NAME} />,
    );
  }

  const total = Object.values(source._count).reduce((a, b) => a + b, 0);

  return ogImageResponse(
    <OgHubLayout
      badge={abbrev}
      title={source.name}
      footer={`${source.edition} · ${total.toLocaleString("en-US")} entries`}
    />,
  );
}

export const alt = `${SITE_NAME} source`;
