"use client";

import { useEffect, useState } from "react";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";

export type MapPing = {
  id: string;
  x: number;
  y: number;
  color: string;
};

type MapPingLayerProps = {
  pings: MapPing[];
  grid: GridConfig;
  onExpire: (id: string) => void;
};

const PING_MS = 800;

function PingDot({
  ping,
  grid,
  onExpire,
}: {
  ping: MapPing;
  grid: GridConfig;
  onExpire: (id: string) => void;
}) {
  const [visible, setVisible] = useState(true);
  const px = gridToPixels(ping.x, ping.y, grid);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      onExpire(ping.id);
    }, PING_MS);
    return () => window.clearTimeout(t);
  }, [ping.id, onExpire]);

  if (!visible) return null;

  return (
    <div
      className="map-ping"
      style={{
        left: px.x,
        top: px.y,
        ["--map-ping-color" as string]: ping.color,
      }}
    />
  );
}

export function MapPingLayer({ pings, grid, onExpire }: MapPingLayerProps) {
  return (
    <div className="map-ping-layer" aria-hidden>
      {pings.map((ping) => (
        <PingDot key={ping.id} ping={ping} grid={grid} onExpire={onExpire} />
      ))}
    </div>
  );
}
