"use client";

import { memo } from "react";

type MapGridOverlayProps = {
  imageWidth: number;
  imageHeight: number;
  gridSizePx: number;
  gridOffsetX: number;
  gridOffsetY: number;
  visible: boolean;
};

function MapGridOverlayInner({
  imageWidth,
  imageHeight,
  gridSizePx,
  gridOffsetX,
  gridOffsetY,
  visible,
}: MapGridOverlayProps) {
  if (!visible || gridSizePx <= 0) return null;

  const lines: React.ReactNode[] = [];
  let key = 0;

  for (
    let x = gridOffsetX;
    x <= imageWidth + gridSizePx;
    x += gridSizePx
  ) {
    lines.push(
      <line
        key={key++}
        x1={x}
        y1={0}
        x2={x}
        y2={imageHeight}
        className="map-grid-line"
      />,
    );
  }

  for (
    let y = gridOffsetY;
    y <= imageHeight + gridSizePx;
    y += gridSizePx
  ) {
    lines.push(
      <line
        key={key++}
        x1={0}
        y1={y}
        x2={imageWidth}
        y2={y}
        className="map-grid-line"
      />,
    );
  }

  return (
    <svg
      className="map-grid-overlay"
      width={imageWidth}
      height={imageHeight}
      aria-hidden
    >
      {lines}
    </svg>
  );
}

export const MapGridOverlay = memo(MapGridOverlayInner);
