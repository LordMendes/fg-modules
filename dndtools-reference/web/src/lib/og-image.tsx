import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { getTool, type ToolKey } from "@/lib/tools";
import { SITE_NAME } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG_COLORS = {
  background: "#1A1625",
  backgroundGlow: "#2A2340",
  text: "#E8E0D4",
  accent: "#D4A853",
  muted: "#8A7E9A",
  panel: "#2A2340",
  border: "#9B7FD4",
} as const;

const PLUS_JAKARTA_BOLD =
  "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4Ko70yygg_vbd-E.woff";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

let fontsPromise: Promise<OgFont[]> | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (!fontsPromise) {
    fontsPromise = fetch(PLUS_JAKARTA_BOLD, { cache: "force-cache" })
      .then((res) => res.arrayBuffer())
      .then((data) => [
        {
          name: "Plus Jakarta Sans",
          data,
          weight: 700,
          style: "normal",
        },
      ]);
  }
  return fontsPromise;
}

export async function ogImageResponse(content: ReactElement) {
  const fonts = await loadOgFonts();
  return new ImageResponse(content, { ...OG_SIZE, fonts });
}

function OgBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG_COLORS.background,
        color: OG_COLORS.text,
        fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${OG_COLORS.backgroundGlow} 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${OG_COLORS.accent}, ${OG_COLORS.border}, ${OG_COLORS.accent})`,
        }}
      />
      {children}
    </div>
  );
}

function OgBrandMark() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        color: OG_COLORS.accent,
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: 14,
          background: OG_COLORS.panel,
          border: `2px solid ${OG_COLORS.accent}`,
          fontSize: 28,
        }}
      >
        ⚔
      </div>
      <span>{SITE_NAME}</span>
    </div>
  );
}

function OgBadge({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: "10px 18px",
        borderRadius: 999,
        background: OG_COLORS.panel,
        border: `1px solid ${OG_COLORS.border}`,
        color: OG_COLORS.accent,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  );
}

export function OgCenteredLayout({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <OgBackground>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 112,
            height: 112,
            borderRadius: 24,
            background: OG_COLORS.panel,
            border: `3px solid ${OG_COLORS.accent}`,
            color: OG_COLORS.accent,
            fontSize: 56,
            marginBottom: 36,
          }}
        >
          ⚔
        </div>
        <div
          style={{
            fontSize: title.length > 28 ? 56 : 72,
            fontWeight: 700,
            color: OG_COLORS.text,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: OG_COLORS.accent,
            fontWeight: 700,
          }}
        >
          {subtitle}
        </div>
      </div>
    </OgBackground>
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
    <OgBackground>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
        }}
      >
        <OgBrandMark />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <OgBadge label={badge} />
          <div
            style={{
              fontSize: title.length > 36 ? 56 : 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            color: OG_COLORS.muted,
            fontWeight: 700,
          }}
        >
          {footer}
        </div>
      </div>
    </OgBackground>
  );
}

export function OgEntityLayout({
  badge,
  title,
  statLine,
  sourceLine,
  snippet,
}: {
  badge: string;
  title: string;
  statLine?: string | null;
  sourceLine?: string | null;
  snippet?: string | null;
}) {
  const subtitle = statLine ?? snippet ?? null;

  return (
    <OgBackground>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
        }}
      >
        <OgBrandMark />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <OgBadge label={badge} />
          <div
            style={{
              fontSize: title.length > 36 ? 56 : 76,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: OG_COLORS.text,
                maxWidth: 920,
                opacity: 0.92,
              }}
            >
              {subtitle.length > 140 ? `${subtitle.slice(0, 137)}…` : subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: OG_COLORS.muted,
            fontWeight: 700,
          }}
        >
          <span>{sourceLine ?? "D&D 3.5 Edition Reference"}</span>
          <span>dnd-helper.com</span>
        </div>
      </div>
    </OgBackground>
  );
}

export async function toolOgImageResponse(toolKey: ToolKey) {
  const tool = getTool(toolKey);
  const label = tool?.label ?? "Tool";
  const footer = tool ? `${tool.source} · dnd-helper.com` : "dnd-helper.com";

  return ogImageResponse(
    <OgHubLayout badge="Tool" title={label} footer={footer} />,
  );
}
