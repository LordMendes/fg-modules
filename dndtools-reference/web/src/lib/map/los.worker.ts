/// <reference lib="webworker" />

import {
  segmentsFromOccluders,
  visibilityPolygon,
  type Segment,
} from "@/lib/map/los";
import type { MapOccluderView, MapPoint } from "@/lib/map/types";

export type LosWorkerRequest = {
  id: number;
  origin: MapPoint;
  rangeSquares: number;
  sampleCount: number;
  occluders: MapOccluderView[];
};

export type LosWorkerResponse = {
  id: number;
  polygon: MapPoint[];
};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (ev: MessageEvent<LosWorkerRequest>) => {
  const msg = ev.data;
  const segments: Segment[] = segmentsFromOccluders(msg.occluders);
  const polygon = visibilityPolygon(
    msg.origin,
    segments,
    msg.rangeSquares,
    msg.sampleCount,
  );
  const res: LosWorkerResponse = { id: msg.id, polygon };
  ctx.postMessage(res);
};
