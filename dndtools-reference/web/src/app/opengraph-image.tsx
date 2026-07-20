import { ImageResponse } from "next/og";

export const alt = "Arcane Archives — D&D 3.5 Reference";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1625",
          color: "#E8E0D4",
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
            background: "#2A2340",
            border: "2px solid #D4A853",
            color: "#D4A853",
            fontSize: 48,
            marginBottom: 32,
          }}
        >
          ⚔
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#E8E0D4",
            letterSpacing: "-0.02em",
          }}
        >
          Arcane Archives
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: "#D4A853",
          }}
        >
          D&D 3.5 Edition Reference
        </div>
      </div>
    ),
    { ...size },
  );
}
