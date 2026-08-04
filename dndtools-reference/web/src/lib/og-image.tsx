import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  background: "#1A1625",
  text: "#E8E0D4",
  accent: "#D4A853",
  muted: "#8A7E9A",
  panel: "#2A2340",
  border: "#9B7FD4",
} as const;

export function ogImageResponse(content: ReactNode) {
  return new ImageResponse(content, OG_SIZE);
}

export function OgCenteredLayout({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: OG_COLORS.background,
        color: OG_COLORS.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 96,
          height: 96,
          borderRadius: 20,
          background: OG_COLORS.panel,
          border: `2px solid ${OG_COLORS.accent}`,
          color: OG_COLORS.accent,
          fontSize: 48,
          marginBottom: 32,
        }}
      >
        ⚔
      </div>
      <div
        style={{
          fontSize: title.length > 30 ? 52 : 64,
          fontWeight: 700,
          color: OG_COLORS.text,
          letterSpacing: "-0.02em",
          textAlign: "center",
          maxWidth: 1000,
          padding: "0 48px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 28,
          color: OG_COLORS.accent,
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function OgHubLayout({
  badge,
  title,
  footer = "D&D 3.5 Edition Reference",
}: {
  badge: string;
  title: string;
  footer?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: OG_COLORS.background,
        color: OG_COLORS.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: OG_COLORS.accent,
          fontSize: 28,
          fontWeight: 600,
        }}
      >
        <span>⚔</span>
        <span>{SITE_NAME}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "8px 16px",
            borderRadius: 999,
            background: OG_COLORS.panel,
            border: `1px solid ${OG_COLORS.border}`,
            color: OG_COLORS.accent,
            fontSize: 22,
          }}
        >
          {badge}
        </div>
        <div
          style={{
            fontSize: title.length > 40 ? 52 : 68,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ fontSize: 22, color: OG_COLORS.muted }}>{footer}</div>
    </div>
  );
}
