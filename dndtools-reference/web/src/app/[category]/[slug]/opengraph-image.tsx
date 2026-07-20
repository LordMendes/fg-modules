import { ImageResponse } from "next/og";
import { isCategoryKey, getCategoryLabel } from "@/lib/categories";
import { getEntityDetail } from "@/lib/entities";
import type { CategoryKey } from "@/lib/categories";

export const alt = "Arcane Archives entity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

type Props = {
  params: Promise<{ category: string; slug: string }>;
};

export default async function Image({ params }: Props) {
  const { category, slug } = await params;
  const label = isCategoryKey(category) ? getCategoryLabel(category) : category;
  let name = slug.replace(/-/g, " ");

  if (isCategoryKey(category)) {
    const entity = await getEntityDetail(category as CategoryKey, slug);
    if (entity) name = entity.name;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#1A1625",
          color: "#E8E0D4",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#D4A853",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          <span>⚔</span>
          <span>Arcane Archives</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 999,
              background: "#2A2340",
              border: "1px solid #9B7FD4",
              color: "#D4A853",
              fontSize: 22,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: name.length > 40 ? 52 : 68,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
            }}
          >
            {name}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#8A7E9A" }}>
          D&D 3.5 Edition Reference
        </div>
      </div>
    ),
    { ...size },
  );
}
